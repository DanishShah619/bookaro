import mongoose from "mongoose";
import Booking from "../models/bookingModel.js";
import Movie from "../models/movieModel.js";
import SeatLock from "../models/seatLockModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const STRIPE_API_VERSION = "2025-01-27.acacia";
const CHECKOUT_SESSION_EXPIRES_AFTER_SECONDS = 31 * 60;
const RECLINER_ROWS = new Set(["D", "E"]);
const BLOCKING_STATUSES = ["pending", "paid", "confirmed", "active", "upcoming"];
const FINAL_LOCK_STATUSES = ["paid"];

function getStripeOrThrow() {
  if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY in env");
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
}

function getClientUrlOrThrow() {
  const clientUrl = String(CLIENT_URL || "").replace(/\/+$/, "");
  if (!clientUrl) throw new Error("Missing CLIENT_URL in env");
  if (/^sk_live_/i.test(STRIPE_SECRET_KEY) && /localhost|127\.0\.0\.1/i.test(clientUrl)) {
    throw new Error("CLIENT_URL must be a public URL when using live Stripe keys");
  }
  return clientUrl;
}

function normalizeShowtimeToMinute(input) {
  let d = new Date(input);
  if (isNaN(d.getTime())) {
    try { d = new Date(decodeURIComponent(String(input))); } catch { d = new Date(String(input)); }
  }
  if (isNaN(d.getTime())) throw new Error("Invalid showtime");
  d.setSeconds(0, 0);
  return d;
}

function buildMovieMatchClause(movieId, movieName) {
  const push = (arr, obj) => { if (obj && Object.keys(obj).length) arr.push(obj); };
  const clauses = [];

  if (movieId) {
    const mid = String(movieId).trim();
    if (mid) {
      if (mongoose.Types.ObjectId.isValid(mid)) {
        push(clauses, { "movie.id": new mongoose.Types.ObjectId(mid) });
        push(clauses, { movieId: new mongoose.Types.ObjectId(mid) });
      }
      push(clauses, { "movie.id": mid });
      push(clauses, { movieId: mid });
    }
  }

  if (movieName) {
    const mname = String(movieName).trim();
    if (mname) {
      push(clauses, { "movie.title": mname });
      push(clauses, { movieName: mname });
      push(clauses, { "movie.movieName": mname });
    }
  }

  const seen = new Set();
  const unique = [];
  for (const c of clauses) {
    const k = JSON.stringify(c);
    if (!seen.has(k)) { seen.add(k); unique.push(c); }
  }
  return unique;
}

function getMovieLockKey(movieId, movieName) {
  const id = movieId ? String(movieId).trim() : "";
  if (id) return `id:${id}`;
  return `name:${String(movieName || "").trim().toLowerCase()}`;
}

function buildSeatLockKey({ movieId, movieName, showtime, auditorium, seatId }) {
  return [
    getMovieLockKey(movieId, movieName),
    new Date(showtime).toISOString(),
    String(auditorium || "Audi 1").trim().toLowerCase(),
    String(seatId || "").trim().toUpperCase(),
  ].join("|");
}

function activeBookingStatusQuery(now = new Date()) {
  const legacyHoldCutoff = new Date(now.getTime() - CHECKOUT_SESSION_EXPIRES_AFTER_SECONDS * 1000);
  return {
    $or: [
      { status: { $in: BLOCKING_STATUSES.filter((s) => s !== "pending") } },
      {
        status: "pending",
        $or: [
          { holdExpiresAt: { $gt: now } },
          { holdExpiresAt: null, createdAt: { $gt: legacyHoldCutoff } },
        ],
      },
    ],
  };
}

async function cleanupExpiredSeatLocks(now = new Date()) {
  await SeatLock.deleteMany({
    status: "pending",
    expiresAt: { $lte: now },
  }).exec();

  await Booking.updateMany(
    {
      status: "pending",
      paymentStatus: "pending",
      $or: [
        { holdExpiresAt: { $lte: now } },
        {
          holdExpiresAt: null,
          createdAt: {
            $lte: new Date(now.getTime() - CHECKOUT_SESSION_EXPIRES_AFTER_SECONDS * 1000),
          },
        },
      ],
    },
    {
      status: "cancelled",
      paymentStatus: "failed",
      "stripeSession.releaseReason": "hold_expired",
    }
  ).exec();
}

async function acquireSeatLocks({ bookingId, userId, movieId, movieName, showtime, auditorium, seats, expiresAt }) {
  const seatIds = Array.from(new Set((seats || []).map((s) => String(s.seatId || s.id || s).trim().toUpperCase()).filter(Boolean)));
  if (!seatIds.length) return;

  await cleanupExpiredSeatLocks();

  const docs = seatIds.map((seatId) => ({
    lockKey: buildSeatLockKey({ movieId, movieName, showtime, auditorium, seatId }),
    bookingId,
    userId,
    movieId: movieId && mongoose.Types.ObjectId.isValid(String(movieId)) ? new mongoose.Types.ObjectId(String(movieId)) : undefined,
    movieName: String(movieName || ""),
    showtime,
    auditorium,
    seatId,
    status: expiresAt ? "pending" : "paid",
    expiresAt: expiresAt || null,
  }));

  try {
    await SeatLock.insertMany(docs, { ordered: true });
  } catch (err) {
    if (err?.code === 11000 || err?.writeErrors?.some((w) => w?.code === 11000)) {
      const existing = await SeatLock.find(
        { lockKey: { $in: docs.map((d) => d.lockKey) } },
        { seatId: 1 }
      ).lean().exec();
      const seatsTaken = existing.map((d) => d.seatId).filter(Boolean);
      const conflict = new Error("Some seats are no longer available");
      conflict.statusCode = 409;
      conflict.seats = seatsTaken.length ? seatsTaken : seatIds;
      throw conflict;
    }
    throw err;
  }
}

async function releaseSeatLocksForBooking(bookingId) {
  if (!bookingId) return;
  await SeatLock.deleteMany({
    bookingId,
    status: { $ne: "paid" },
  }).exec();
}

async function deleteSeatLocksForBooking(bookingId) {
  if (!bookingId) return;
  await SeatLock.deleteMany({ bookingId }).exec();
}

async function markSeatLocksPaid(bookingId) {
  if (!bookingId) return;
  await SeatLock.updateMany(
    { bookingId },
    { status: "paid", expiresAt: null }
  ).exec();
}

function assertBookingOwner(booking, user) {
  if (!booking || !user) return;
  const bookingUserId = booking.userId ? String(booking.userId) : "";
  const requestUserId = String(user._id || user.id || "");
  if (bookingUserId && requestUserId && bookingUserId !== requestUserId) {
    const err = new Error("Booking does not belong to authenticated user");
    err.statusCode = 403;
    throw err;
  }
}

function computeTotalPaiseFromSeats(movie = {}, seats = [], options = {}) {
  const allowClientPrice = options.allowClientPrice === true;
  const standardRupee = Number(movie?.seatPrices?.standard ?? movie?.price ?? 0) || 0;
  const standardPaise = Math.round(standardRupee * 100);
  const reclinerDefined = typeof movie?.seatPrices?.recliner !== "undefined" && movie?.seatPrices?.recliner !== null;
  const reclinerPaise = reclinerDefined
    ? Math.round(Number(movie.seatPrices.recliner) * 100)
    : Math.round(standardPaise * 1.5);

  let total = 0;
  for (const s of seats) {
    if (!s) continue;
    if (allowClientPrice && typeof s === "object" && s.price !== undefined && s.price !== null) {
      const p = Number(s.price);
      if (!Number.isNaN(p) && p >= 0) { total += Math.round(p * 100); continue; }
    }
    let seatId = typeof s === "string" ? s : String(s.seatId || s.id || s.name || "");
    seatId = String(seatId).trim();
    if (!seatId) continue;
    const row = seatId.charAt(0).toUpperCase();
    total += RECLINER_ROWS.has(row) ? reclinerPaise : standardPaise;
  }
  return Math.max(0, Math.round(total));
}

function getServerSeatPrice(movie = {}, row = "") {
  const standard = Number(movie?.seatPrices?.standard ?? movie?.price ?? 0) || 0;
  const reclinerDefined =
    typeof movie?.seatPrices?.recliner !== "undefined" &&
    movie?.seatPrices?.recliner !== null;
  const recliner = reclinerDefined ? Number(movie.seatPrices.recliner) || 0 : Math.round(standard * 1.5);
  return RECLINER_ROWS.has(String(row).toUpperCase()) ? recliner : standard;
}

function normalizeSeatsFromInput(rawSeats = [], seatIdsFromBody = [], movie = {}) {
  const normalized = [];
  const deriveServerPrice = (row) => {
    return getServerSeatPrice(movie, row);
  };

  if (Array.isArray(rawSeats) && rawSeats.length > 0) {
    if (typeof rawSeats[0] === "object") {
      for (const s of rawSeats) {
        const seatIdVal = String(s.seatId || s.id || s).trim().toUpperCase();
        if (!seatIdVal) continue;
        const row = seatIdVal.charAt(0).toUpperCase();
        const type = s.type || (RECLINER_ROWS.has(row) ? "recliner" : "standard");
        normalized.push({ seatId: seatIdVal, type, price: deriveServerPrice(row) });
      }
    } else {
      for (const sid of rawSeats) {
        const seatIdVal = String(sid).trim().toUpperCase();
        if (!seatIdVal) continue;
        const row = seatIdVal.charAt(0).toUpperCase();
        const type = RECLINER_ROWS.has(row) ? "recliner" : "standard";
        normalized.push({ seatId: seatIdVal, type, price: deriveServerPrice(row) });
      }
    }
  } else if (Array.isArray(seatIdsFromBody) && seatIdsFromBody.length > 0) {
    for (const sid of seatIdsFromBody) {
      const seatIdVal = String(sid).trim().toUpperCase();
      if (!seatIdVal) continue;
      const row = seatIdVal.charAt(0).toUpperCase();
      const type = RECLINER_ROWS.has(row) ? "recliner" : "standard";
      normalized.push({ seatId: seatIdVal, type, price: deriveServerPrice(row) });
    }
  }
  return normalized;
}

async function markCheckoutSessionPaid(sessionObj, options = {}) {
  const bookingId = sessionObj?.metadata?.bookingId;
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new Error("Invalid bookingId in session metadata");
  }

  if (sessionObj.payment_status !== "paid") {
    throw new Error(`Payment not completed (status=${sessionObj.payment_status})`);
  }

  const query = {
    _id: bookingId,
    $or: [{ paymentSessionId: sessionObj.id }, { paymentSessionId: "" }],
  };
  if (options.user?._id || options.user?.id) {
    query.userId = new mongoose.Types.ObjectId(String(options.user._id || options.user.id));
  }

  const booking = await Booking.findOneAndUpdate(
    query,
    {
      paymentStatus: "paid",
      status: "confirmed",
      paymentSessionId: sessionObj.id,
      paymentIntentId: sessionObj.payment_intent || "",
      stripeSession: {
        id: sessionObj.id,
        url: sessionObj.url || null,
        paymentStatus: sessionObj.payment_status,
      },
    },
    { new: true }
  ).exec();

  if (!booking) {
    const err = new Error(options.user ? "Booking not found for this authenticated user" : "Booking not found for this Stripe session");
    err.statusCode = options.user ? 404 : 500;
    throw err;
  }
  assertBookingOwner(booking, options.user);
  await markSeatLocksPaid(booking._id);
  return booking;
}

async function releasePendingCheckoutSession(sessionObj, reason = "failed", options = {}) {
  const bookingId = sessionObj?.metadata?.bookingId;
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return null;

  const query = {
    _id: bookingId,
    paymentStatus: "pending",
    status: "pending",
    $or: [{ paymentSessionId: sessionObj.id }, { paymentSessionId: "" }],
  };
  if (options.user?._id || options.user?.id) {
    query.userId = new mongoose.Types.ObjectId(String(options.user._id || options.user.id));
  }

  const booking = await Booking.findOneAndUpdate(
    query,
    {
      paymentStatus: "failed",
      status: "cancelled",
      paymentSessionId: sessionObj.id,
      stripeSession: {
        id: sessionObj.id,
        url: sessionObj.url || null,
        paymentStatus: sessionObj.payment_status || reason,
        releaseReason: reason,
      },
    },
    { new: true }
  ).exec();
  if (!booking && options.user) {
    const err = new Error("Booking not found for this authenticated user");
    err.statusCode = 404;
    throw err;
  }
  if (booking) await releaseSeatLocksForBooking(booking._id);
  return booking;
}

/* ---------- Controllers ---------- */

export async function createBooking(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required to create booking" });
    await cleanupExpiredSeatLocks();

    const body = req.body || {};
    const movieId = body.movieId || null;
    const movieName = body.movieName || body.movie?.title || "";
    const auditorium = body.audi || body.auditorium || "Audi 1";
    const rawSeats = Array.isArray(body.seats) ? body.seats.filter(Boolean) : [];
    const seatIdsFromBody = Array.isArray(body.seatIds) ? body.seatIds.filter(Boolean) : [];
    const customer = String(body.customer || (req.user && (req.user.name || req.user.fullName)) || "Guest");
    const email = String(body.email || (req.user && req.user.email) || "");
    const paymentMethod = String(body.paymentMethod || "card").toLowerCase();
    const currency = String(body.currency || "inr").toLowerCase();

    if (!body.showtime || (rawSeats.length === 0 && seatIdsFromBody.length === 0) || !email) {
      return res.status(400).json({ success: false, message: "Missing required fields (showtime/seats/email)" });
    }

    let showtime;
    try { showtime = normalizeShowtimeToMinute(body.showtime); } catch { return res.status(400).json({ success: false, message: "Invalid showtime" }); }

    // best-effort movie load
    let movie = null;
    if (movieId && mongoose.Types.ObjectId.isValid(String(movieId))) {
      movie = await Movie.findById(movieId).lean().exec().catch(() => null);
    } else if (movieName) {
      movie = await Movie.findOne({ $or: [{ title: movieName }, { movieName }] }).lean().exec().catch(() => null);
    }

    const normalizedSeats = normalizeSeatsFromInput(rawSeats, seatIdsFromBody, movie);
    if (normalizedSeats.length === 0) return res.status(400).json({ success: false, message: "No valid seats provided" });

    const totalPaise = computeTotalPaiseFromSeats(movie, normalizedSeats, { allowClientPrice: false });
    if (!totalPaise || totalPaise <= 0) return res.status(400).json({ success: false, message: "Computed amount is zero" });
    const totalMain = Number((totalPaise / 100).toFixed(2));

    // conflict detection (minute window)
    const startWindow = new Date(showtime);
    const endWindow = new Date(startWindow.getTime() + 60 * 1000);
    const activeStatusQuery = activeBookingStatusQuery();
    const conflictQuery = {
      showtime: { $gte: startWindow, $lt: endWindow },
      auditorium,
      ...activeStatusQuery
    };
    const movieClauses = buildMovieMatchClause(movieId, movieName);
    if (movieClauses.length > 0) {
      delete conflictQuery.$or;
      conflictQuery.$and = [activeStatusQuery, { $or: movieClauses }];
    }

    const existingBookings = await Booking.find(conflictQuery, { seats: 1 }).lean().exec();
    const occupiedSeats = new Set();
    for (const b of existingBookings || []) {
      const seats = Array.isArray(b.seats) ? b.seats : [];
      for (const seat of seats) {
        const seatId = typeof seat === "string"
          ? seat.trim().toUpperCase()
          : (seat?.seatId || seat?.id || "").toString().trim().toUpperCase();
        if (seatId) occupiedSeats.add(seatId);
      }
    }

    const seatIdList = Array.from(new Set(normalizedSeats.map(s => s.seatId)));
    const conflictingSeats = seatIdList.filter(s => occupiedSeats.has(s));
    if (conflictingSeats.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Some seats are no longer available",
        seats: conflictingSeats
      });
    }

    // movie snapshot + top-level searchable fields
    const movieSnapshot = movie
      ? {
        id: movie._id,
        title: movie.movieName || movie.title || "",
        poster: movie.poster || movie.thumbnail || "",
        category: Array.isArray(movie.categories) ? movie.categories[0] || "" : movie.category || "",
        durationMins: movie.duration || movie.runtime || 0,
        rating: movie.rating || null
      }
      : {
        id: movieId && mongoose.Types.ObjectId.isValid(String(movieId)) ? new mongoose.Types.ObjectId(movieId) : undefined,
        title: movieName || "",
        poster: "",
        category: "",
        durationMins: 0
      };

    const bookingId = new mongoose.Types.ObjectId();
    const holdExpiresAt = paymentMethod === "card"
      ? new Date(Date.now() + CHECKOUT_SESSION_EXPIRES_AFTER_SECONDS * 1000)
      : null;

    const doc = {
      _id: bookingId,
      userId: req.user && req.user._id ? new mongoose.Types.ObjectId(req.user._id) : undefined,
      customer,
      movie: movieSnapshot,
      movieId: movieSnapshot.id,
      movieName: movieSnapshot.title,
      showtime,
      auditorium,
      seats: normalizedSeats,
      basePrice: movie?.seatPrices?.standard ?? movie?.price ?? 0,
      amount: totalMain,
      amountPaise: totalPaise,
      currency: (currency || "INR").toUpperCase(),
      status: paymentMethod === "card" ? "pending" : "confirmed",
      paymentStatus: paymentMethod === "card" ? "pending" : "paid",
      paymentMethod,
      holdExpiresAt,
      meta: { rawRequest: { seatIds: seatIdList, clientSeats: rawSeats } }
    };

    try {
      await acquireSeatLocks({
        bookingId,
        userId: doc.userId,
        movieId: doc.movieId,
        movieName: doc.movieName || movieName,
        showtime,
        auditorium,
        seats: normalizedSeats,
        expiresAt: holdExpiresAt,
      });
    } catch (lockErr) {
      if (lockErr.statusCode === 409) {
        return res.status(409).json({
          success: false,
          message: lockErr.message,
          seats: lockErr.seats || [],
        });
      }
      throw lockErr;
    }

    let booking;
    try {
      booking = await Booking.create(doc);
    } catch (createErr) {
      await releaseSeatLocksForBooking(bookingId);
      throw createErr;
    }

    if (paymentMethod === "card") {
      let stripe;
      try { stripe = getStripeOrThrow(); } catch (err) {
        await releaseSeatLocksForBooking(booking._id);
        await Booking.findByIdAndDelete(booking._id).catch(() => { });
        return res.status(500).json({ success: false, message: "Payment not configured", error: err.message });
      }

      try {
        const clientUrl = getClientUrlOrThrow();
        const amountPaiseForStripe = Number(doc.amountPaise);
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_EXPIRES_AFTER_SECONDS,
          line_items: [{
            price_data: {
              currency,
              product_data: { name: booking.movie.title || "Movie Booking", description: `Seats: ${seatIdList.join(", ")} — ${auditorium}` },
              unit_amount: amountPaiseForStripe
            },
            quantity: 1
          }],
          success_url: `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${clientUrl}/cancel?session_id={CHECKOUT_SESSION_ID}`,
          metadata: { bookingId: String(booking._id), seats: JSON.stringify(seatIdList), auditorium, showtime: showtime.toISOString() }
        });

        booking.paymentSessionId = session.id;
        booking.stripeSession = { id: session.id, url: session.url || null };
        await Booking.findByIdAndUpdate(booking._id, { paymentSessionId: session.id, stripeSession: booking.stripeSession }).exec();

        return res.status(201).json({
          success: true,
          message: "Booking created (pending payment)",
          booking: { id: booking._id, status: booking.status, amount: doc.amount, amountPaise: doc.amountPaise, currency: doc.currency },
          checkout: { id: session.id, url: session.url }
        });
      } catch (stripeErr) {
        await releaseSeatLocksForBooking(booking._id);
        await Booking.findByIdAndDelete(booking._id).catch(() => { });
        return res.status(500).json({ success: false, message: "Failed to create Stripe session", error: String(stripeErr.message || stripeErr) });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Booking created",
      booking: { id: booking._id, status: booking.status, amount: booking.amount, amountPaise: booking.amountPaise, currency: booking.currency }
    });
  } catch (err) {
    console.error("createBooking error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Server error", error: String(err.message || err) });
  }
}

export async function getBooking(req, res) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    const userId = String(req.user._id || req.user.id);
    const { paymentStatus, status } = req.query;

    const q = { userId };

    // if the caller explicitly requests "all" skip default filter
    if (paymentStatus && String(paymentStatus).toLowerCase() !== "all") {
      q.paymentStatus = String(paymentStatus).toLowerCase();
    } else if (status && String(status).toLowerCase() !== "all") {
      q.status = String(status).toLowerCase();
    } else {
      // default: show only paid bookings for users
      q.paymentStatus = "paid";
    }

    const items = await Booking.find(q).sort({ createdAt: -1 }).lean().exec();
    return res.json({ success: true, items });
  } catch (err) {
    console.error("getBookings error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function listBookings(req, res) {
  try {
    const { movieId, page = 1, limit = 100, paymentStatus, status } = req.query;
    const q = {};

    if (movieId) {
      if (mongoose.Types.ObjectId.isValid(String(movieId))) q.movieId = new mongoose.Types.ObjectId(String(movieId));
      else q.movieName = String(movieId);
    }

    if (paymentStatus && String(paymentStatus).toLowerCase() !== "all") {
      q.paymentStatus = String(paymentStatus).toLowerCase();
    } else if (status && String(status).toLowerCase() !== "all") {
      q.status = String(status).toLowerCase();
    } else {
      // default for listing endpoints: only paid bookings
      q.paymentStatus = "paid";
    }

    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.min(1000, Number(limit) || 100);
    const total = await Booking.countDocuments(q).exec();
    const items = await Booking.find(q).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean().exec();
    return res.json({ success: true, total, page: pg, limit: lim, items });
  } catch (err) {
    console.error("listBookings error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id" });
    const b = await Booking.findByIdAndDelete(id).lean().exec();
    if (!b) return res.status(404).json({ success: false, message: "Booking not found" });
    await deleteSeatLocksForBooking(id);
    return res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    console.error("deleteBooking error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getOccupiedSeats(req, res) {
  try {
    const { movieId, movieName, showtime: showtimeRaw, audi: audiRaw } = req.query;
    if (!showtimeRaw) return res.status(400).json({ success: false, message: "showtime query param required" });

    const auditorium = String(audiRaw || req.query.auditorium || "Audi 1");
    let parsed;
    try { parsed = normalizeShowtimeToMinute(showtimeRaw); } catch { return res.status(400).json({ success: false, message: "Invalid showtime" }); }

    const start = new Date(parsed);
    const end = new Date(start.getTime() + 60 * 1000);
    await cleanupExpiredSeatLocks();

    const activeStatusQuery = activeBookingStatusQuery();
    const q = {
      showtime: { $gte: start, $lt: end },
      auditorium,
      ...activeStatusQuery
    };
    const movieClauses = buildMovieMatchClause(movieId, movieName);
    if (movieClauses.length > 0) {
      delete q.$or;
      q.$and = [activeStatusQuery, { $or: movieClauses }];
    }

    if (!Booking) {
      console.error("Booking model undefined");
      return res.status(500).json({ success: false, message: "Server misconfiguration (Booking model)" });
    }

    const docs = await Booking.find(q, { seats: 1 }).lean().exec();
    const occupiedSet = new Set();
    for (const d of docs || []) {
      const sarr = Array.isArray(d.seats) ? d.seats : [];
      for (const s of sarr) {
        if (!s) continue;
        let seatId = "";
        if (typeof s === "string") seatId = s.trim().toUpperCase();
        else if (s.seatId) seatId = String(s.seatId).trim().toUpperCase();
        else if (s.id) seatId = String(s.id).trim().toUpperCase();
        else if (s.number) seatId = String(s.number).trim().toUpperCase();
        if (seatId) occupiedSet.add(seatId);
      }
    }

    const lockQuery = {
      showtime: { $gte: start, $lt: end },
      auditorium,
      $or: [
        { status: { $in: FINAL_LOCK_STATUSES } },
        { status: "pending", expiresAt: { $gt: new Date() } },
      ],
    };
    if (movieId && mongoose.Types.ObjectId.isValid(String(movieId))) {
      lockQuery.movieId = new mongoose.Types.ObjectId(String(movieId));
    } else if (movieName) {
      lockQuery.movieName = String(movieName);
    }
    const locks = await SeatLock.find(lockQuery, { seatId: 1 }).lean().exec();
    for (const lock of locks || []) {
      if (lock?.seatId) occupiedSet.add(String(lock.seatId).trim().toUpperCase());
    }

    return res.json({ success: true, occupied: [...occupiedSet] });
  } catch (err) {
    console.error("getOccupiedSeats error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Server error while fetching occupied seats", error: String(err.message || err) });
  }
}

export async function cancelCheckoutSession(req, res) {
  try {
    const sessionId = String(req.body?.session_id || req.query?.session_id || "").trim();
    if (!sessionId) return res.status(400).json({ success: false, message: "session_id required" });

    let stripe;
    try { stripe = getStripeOrThrow(); } catch (err) {
      return res.status(500).json({ success: false, message: "Payments not configured", error: err.message });
    }

    let sessionObj = await stripe.checkout.sessions.retrieve(sessionId);
    if (!sessionObj) return res.status(404).json({ success: false, message: "Session not found" });

    if (sessionObj.payment_status === "paid") {
      const booking = await markCheckoutSessionPaid(sessionObj, { user: req.user });
      return res.json({ success: true, message: "Payment already completed", booking });
    }

    if (sessionObj.status === "open") {
      sessionObj = await stripe.checkout.sessions.expire(sessionId);
    }

    const booking = await releasePendingCheckoutSession(sessionObj, "cancelled", { user: req.user });
    return res.json({ success: true, booking });
  } catch (err) {
    console.error("cancelCheckoutSession error:", err && err.stack ? err.stack : err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: "Server error", error: String(err.message || err) });
  }
}

export async function confirmPayment(req, res) {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ success: false, message: "session_id required" });

    let stripe;
    try { stripe = getStripeOrThrow(); } catch (err) {
      return res.status(500).json({ success: false, message: "Payments not configured", error: err.message });
    }

    const sessionObj = await stripe.checkout.sessions.retrieve(session_id);
    if (!sessionObj) return res.status(404).json({ success: false, message: "Session not found" });
    if (sessionObj.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: `Payment not completed (status=${sessionObj.payment_status})` });
    }

    const booking = await markCheckoutSessionPaid(sessionObj, { user: req.user });

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("confirmPayment error:", err && err.stack ? err.stack : err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: "Server error", error: String(err.message || err) });
  }
}

export async function stripeWebhook(req, res) {
  let stripe;
  try { stripe = getStripeOrThrow(); } catch (err) {
    return res.status(500).json({ success: false, message: "Payments not configured", error: err.message });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ success: false, message: "STRIPE_WEBHOOK_SECRET is not configured" });
  }

  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const sessionObj = event.data.object;

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      if (sessionObj.payment_status === "paid") {
        await markCheckoutSessionPaid(sessionObj);
      }
    } else if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      await releasePendingCheckoutSession(sessionObj, event.type);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handling failed:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: "Webhook handling failed" });
  }
}

export default {
  createBooking,
  getBooking,
  listBookings,
  deleteBooking,
  getOccupiedSeats,
  cancelCheckoutSession,
  confirmPayment,
  stripeWebhook
};
