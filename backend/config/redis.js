// config/redis.js
// Redis client with graceful degradation — if REDIS_URL is not set the module
// exports null-safe stubs so the rest of the app works without Redis.

import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "";

// TTL constants (seconds)
export const SEAT_LOCK_TTL_SECONDS = 5 * 60; // 5 minutes — selection lock
export const CHECKOUT_LOCK_TTL_SECONDS = 31 * 60; // 31 minutes — extended during checkout

let redisClient = null;
let redisAvailable = false;

if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });

  redisClient.on("error", (err) => {
    // Demote to a warning; never crash the server for Redis issues
    console.warn("[Redis] connection error:", err.message);
    redisAvailable = false;
  });

  redisClient.on("ready", () => {
    console.log("[Redis] connected and ready");
    redisAvailable = true;
  });

  redisClient.on("reconnecting", () => {
    console.log("[Redis] reconnecting...");
  });

  // Connect asynchronously — the rest of the app doesn't wait for this
  redisClient.connect().catch((err) => {
    console.warn("[Redis] initial connect failed:", err.message);
  });
} else {
  console.warn("[Redis] REDIS_URL not set — seat pre-locking will be disabled. Falling back to MongoDB-only locking.");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a deterministic Redis key for a seat lock.
 * Format: seatlock:<movieKey>|<showtimeISO>|<auditorium>|<SEAT_ID>
 */
export function buildRedisLockKey({ movieId, movieName, showtime, auditorium, seatId }) {
  const movieKey = movieId ? `id:${String(movieId).trim()}` : `name:${String(movieName || "").trim().toLowerCase()}`;
  const showtimeKey = new Date(showtime).toISOString().slice(0, 16); // minute-level precision
  const audiKey = String(auditorium || "audi 1").trim().toLowerCase();
  const seatKey = String(seatId || "").trim().toUpperCase();
  return `seatlock:${movieKey}|${showtimeKey}|${audiKey}|${seatKey}`;
}

/**
 * Build a pattern for scanning all seat locks for a given show.
 * Returns a glob pattern suitable for Redis SCAN.
 */
export function buildRedisShowPattern({ movieId, movieName, showtime, auditorium }) {
  const movieKey = movieId ? `id:${String(movieId).trim()}` : `name:${String(movieName || "").trim().toLowerCase()}`;
  const showtimeKey = new Date(showtime).toISOString().slice(0, 16);
  const audiKey = String(auditorium || "audi 1").trim().toLowerCase();
  return `seatlock:${movieKey}|${showtimeKey}|${audiKey}|*`;
}

/**
 * Acquire a Redis seat lock.
 *
 * Uses SET NX EX (atomic compare-and-set) — the gold standard for Redis locks.
 * Returns { acquired: true } if the lock was taken by this owner,
 * { acquired: false, owner } if already held by someone else.
 *
 * @param {string} key        Redis key for the seat
 * @param {string} ownerId    Unique identifier for the requester (userId or sessionId)
 * @param {number} ttlSeconds TTL for the lock
 */
export async function acquireRedisLock(key, ownerId, ttlSeconds = SEAT_LOCK_TTL_SECONDS) {
  if (!redisClient || !redisAvailable) return { acquired: true, degraded: true };

  try {
    // SET key ownerId NX EX ttl — only sets if key does NOT exist (atomic)
    const result = await redisClient.set(key, ownerId, {
      NX: true,
      EX: ttlSeconds,
    });

    if (result === "OK") {
      return { acquired: true };
    }

    // Key already exists — check who holds it
    const existing = await redisClient.get(key);
    if (existing === ownerId) {
      // Same owner refreshing the lock — extend TTL
      await redisClient.expire(key, ttlSeconds);
      return { acquired: true };
    }

    return { acquired: false, owner: existing };
  } catch (err) {
    console.warn("[Redis] acquireRedisLock error:", err.message);
    // Degrade gracefully — allow the request through; MongoDB will be the last line of defence
    return { acquired: true, degraded: true };
  }
}

/**
 * Release a Redis seat lock — only if held by the given owner.
 * Uses a Lua script to make check-and-delete atomic.
 */
export async function releaseRedisLock(key, ownerId) {
  if (!redisClient || !redisAvailable) return true;

  const script = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
    else
      return 0
    end
  `;

  try {
    await redisClient.eval(script, { keys: [key], arguments: [ownerId] });
    return true;
  } catch (err) {
    console.warn("[Redis] releaseRedisLock error:", err.message);
    return false;
  }
}

/**
 * Release all Redis seat locks owned by a specific owner for a specific show.
 * Used on checkout completion or page-abandon cleanup.
 */
export async function releaseAllLocksForOwner({ movieId, movieName, showtime, auditorium, ownerId, seatIds }) {
  if (!redisClient || !redisAvailable) return;

  try {
    const keys = seatIds.map((seatId) =>
      buildRedisLockKey({ movieId, movieName, showtime, auditorium, seatId })
    );

    const script = `
      local released = 0
      for i, key in ipairs(KEYS) do
        if redis.call('get', key) == ARGV[1] then
          redis.call('del', key)
          released = released + 1
        end
      end
      return released
    `;

    if (keys.length > 0) {
      await redisClient.eval(script, { keys, arguments: [ownerId] });
    }
  } catch (err) {
    console.warn("[Redis] releaseAllLocksForOwner error:", err.message);
  }
}

/**
 * Get all currently locked seat IDs for a given show.
 * Uses SCAN to avoid blocking Redis.
 */
export async function getLockedSeatsForShow({ movieId, movieName, showtime, auditorium }) {
  if (!redisClient || !redisAvailable) return [];

  try {
    const pattern = buildRedisShowPattern({ movieId, movieName, showtime, auditorium });
    const lockedSeatIds = [];
    let cursor = 0;

    do {
      const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = reply.cursor;
      for (const key of reply.keys) {
        // Key format: seatlock:<movieKey>|<showtime>|<audi>|<SEAT_ID>
        const parts = key.split("|");
        const seatId = parts[parts.length - 1];
        if (seatId) lockedSeatIds.push(seatId.toUpperCase());
      }
    } while (cursor !== 0);

    return lockedSeatIds;
  } catch (err) {
    console.warn("[Redis] getLockedSeatsForShow error:", err.message);
    return [];
  }
}

/**
 * Extend the TTL of all seats locked by a given owner (called when entering checkout).
 */
export async function extendLocksForOwner({ movieId, movieName, showtime, auditorium, ownerId, seatIds, ttlSeconds }) {
  if (!redisClient || !redisAvailable) return;

  try {
    for (const seatId of seatIds) {
      const key = buildRedisLockKey({ movieId, movieName, showtime, auditorium, seatId });
      const owner = await redisClient.get(key);
      if (owner === ownerId) {
        await redisClient.expire(key, ttlSeconds);
      }
    }
  } catch (err) {
    console.warn("[Redis] extendLocksForOwner error:", err.message);
  }
}

export { redisClient, redisAvailable };
