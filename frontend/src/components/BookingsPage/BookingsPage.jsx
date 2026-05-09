// src/pages/BookingsPage.jsx
import React, { useEffect, useState } from "react";
import { Film, Clock, MapPin, QrCode, ChevronDown, X, Ticket } from "lucide-react";
import QRCode from "qrcode";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { bookingsPageStyles, formatTime, formatDuration } from "../../assets/dummyStyles";
import { FlippingCard } from "../ui/flipping-card";
import { BeamsBackground } from "../ui/beams-background";
import { StaggerText } from "../ui/stagger-text";

// API base
const API_BASE = "http://localhost:5000";

/* ---------- small data-URI placeholder (offline-safe) ---------- */
function makePlaceholderDataUri(width = 320, height = 480, text = "No Image") {
  const fontSize = Math.max(10, Math.floor(Math.min(width, height) / 10));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><rect width='100%' height='100%' fill='#374151' /><text x='50%' y='50%' dy='.35em' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='${fontSize}' fill='#fff'>${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const PLACEHOLDER_POSTER = makePlaceholderDataUri(320, 480, "No Image");

/* ---------- robust client-side normalization for image fields ---------- */
function normalizeApiBase(b) {
  return String(b || "").replace(/\/+$/, "");
}
function getImageUrl(maybe) {
  if (!maybe) return null;

  if (typeof maybe === "object") {
    if (Array.isArray(maybe) && maybe.length) return getImageUrl(maybe[0]);
    const possible =
      maybe.url ||
      maybe.path ||
      maybe.filename ||
      maybe.file ||
      maybe.image ||
      maybe.src ||
      maybe.photo ||
      maybe.preview ||
      null;
    if (possible) return getImageUrl(possible);
    return null;
  }

  if (typeof maybe !== "string") return null;
  const s = maybe.trim();
  if (!s) return null;

  if (s.startsWith("data:")) return s;

  const apiBase = normalizeApiBase(API_BASE);

  let toParse = s;
  if (toParse.startsWith("//")) toParse = "http:" + toParse;

  if (/^(localhost|127\.0\.0\.1)(:|\/)/i.test(toParse)) {
    toParse = "http://" + toParse;
  }

  if (/^https?:\/\//i.test(toParse)) {
    try {
      const parsed = new URL(toParse);
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") {
        const parts = parsed.pathname.split("/uploads/");
        const filename = parts.length > 1 ? parts.pop() : parsed.pathname.split("/").pop();
        if (filename) return `${apiBase}/uploads/${filename}`;
        return `${apiBase}${parsed.pathname}`;
      }
      return s;
    } catch {
      // fall through
    }
  }

  if (s.startsWith("/")) return `${apiBase}/${s.replace(/^\/+/, "")}`;
  if (s.startsWith("uploads/")) return `${apiBase}/${s}`;

  if (/^(localhost|127\.0\.0\.1)[:/]/i.test(s)) {
    const parts = s.split("/uploads/");
    const filename = parts.length > 1 ? parts.pop() : s.split("/").pop();
    if (filename) return `${apiBase}/uploads/${filename}`;
  }

  return `${apiBase}/uploads/${s.replace(/^uploads\//, "")}`;
}

/* ---------- helper to read stored token ---------- */
function getStoredToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    null
  );
}

/* ==========================================================
   BookingCardFront — the FRONT face of the flipping card
   ========================================================== */
function BookingCardFront({ b }) {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden rounded-xl bg-neutral-950">
      {/* Poster — object-contain so portrait images are never cropped */}
      <div className="relative w-full bg-neutral-900" style={{ height: "260px" }}>
        <img
          src={b.poster || PLACEHOLDER_POSTER}
          alt={b.title}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = PLACEHOLDER_POSTER;
          }}
        />
        {/* Category badge */}
        {b.category && (
          <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-sm">
            {b.category}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 px-4 pt-3 pb-3 flex-1">
        {/* Title */}
        <div className="flex items-center gap-1.5">
          <Film size={14} className="text-rose-500 shrink-0" />
          <h2
            id={`booking-front-${b.id}-title`}
            className="font-semibold text-sm text-neutral-50 truncate"
          >
            {b.title}
          </h2>
        </div>

        {/* Time & Auditorium */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Clock size={12} className="shrink-0" />
            <span>{formatTime(b.slotTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{b.auditorium}</span>
          </div>
        </div>

        {/* Duration + click hint */}
        <div className="mt-auto flex items-center justify-between pt-1 border-t border-neutral-800">
          <span className="text-[11px] text-neutral-500">
            {formatDuration(b.durationMins)}
          </span>
          <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
            <Ticket size={10} />
            Click to flip
          </span>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   BookingCardBack — the BACK face of the flipping card
   ========================================================== */
function BookingCardBack({ b, totals, qrs, handleQrScan, toggle, expanded }) {
  const isOpen = !!expanded[b.id];

  return (
    <div className="flex flex-col h-full w-full px-4 py-3 overflow-auto [scrollbar-width:none]">
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-medium">
          Booking ID
        </p>
        <p className="text-[11px] font-mono text-neutral-600 dark:text-neutral-300 truncate">
          {b.id}
        </p>
      </div>

      {/* Seats summary */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Seats ({totals.seatCount})
        </span>
        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
          ₹{totals.total.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Seat chips */}
      {totals.seatCount > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(b.seats || []).map((s) => (
            <span
              key={s.id || s}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                s.type === "recliner"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {s.id || s}
            </span>
          ))}
        </div>
      )}

      {/* Pricing rows */}
      <div className="text-xs space-y-1 mb-3 border-t border-neutral-100 dark:border-neutral-800 pt-2">
        <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
          <span>Subtotal</span>
          <span>₹{totals.subtotal.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between font-semibold text-neutral-800 dark:text-neutral-200">
          <span>Total</span>
          <span>₹{totals.total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* QR code */}
      <div className="flex items-center gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-2 mt-auto">
        <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          <QrCode size={12} />
          <span>Ticket QR</span>
        </div>
        <div className="ml-auto">
          {qrs[b.id] && qrs[b.id].url ? (
            <img
              src={qrs[b.id].url}
              alt={`${b.title} qr`}
              className="w-14 h-14 rounded cursor-pointer hover:opacity-80 transition-opacity"
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); handleQrScan(b.id); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleQrScan(b.id); } }}
            />
          ) : (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">QR unavailable</span>
          )}
        </div>
      </div>

      {/* Expand/collapse toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); toggle(b.id); }}
        aria-expanded={isOpen}
        className="mt-2 flex items-center justify-center gap-1 w-full text-[11px] text-rose-500 hover:text-rose-600 font-medium transition-colors py-1"
      >
        <span>{isOpen ? "Less info" : "More info"}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>
    </div>
  );
}

/* ---------- main component ---------- */
export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [qrs, setQrs] = useState({});
  const [expanded, setExpanded] = useState({});
  const [scannedDetails, setScannedDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function computeTotals(booking) {
    if (booking.amountPaise !== undefined && booking.amountPaise !== null) {
      const amt = Number(booking.amountPaise) / 100;
      return { subtotal: amt, total: amt, seatCount: (booking.seats || []).length || 0 };
    }
    if (booking.raw && booking.raw.amountPaise !== undefined && booking.raw.amountPaise !== null) {
      const amt = Number(booking.raw.amountPaise) / 100;
      return { subtotal: amt, total: amt, seatCount: (booking.seats || []).length || 0 };
    }
    if (typeof booking.amount === "number" && booking.amount > 0) {
      return { subtotal: booking.amount, total: booking.amount, seatCount: (booking.seats || []).length || 0 };
    }
    if (booking.raw && typeof booking.raw.amount === "number" && booking.raw.amount > 0) {
      return { subtotal: booking.raw.amount, total: booking.raw.amount, seatCount: (booking.seats || []).length || 0 };
    }
    const seats = Array.isArray(booking.seats) ? booking.seats : [];
    const subtotal = seats.reduce((s, seat) => {
      if (!seat) return s;
      if (typeof seat === "object" && typeof seat.price === "number") return s + seat.price;
      return s;
    }, 0);
    return { subtotal, total: subtotal, seatCount: seats.length };
  }

  useEffect(() => {
    let mounted = true;
    async function fetchMyBookings() {
      setLoading(true);
      setError("");
      try {
        const token = getStoredToken();
        if (!token) {
          navigate("/login");
          return;
        }

        let res;
        try {
          res = await axios.get(`${API_BASE}/api/bookings/my`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          });
        } catch {
          res = await axios.get(`${API_BASE}/api/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          });
        }

        const data = res?.data || {};
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (Array.isArray(data.items)) items = data.items;
        else if (Array.isArray(data.bookings)) items = data.bookings;
        else if (Array.isArray(data.data)) items = data.data;
        else if (data.item && Array.isArray(data.item)) items = data.item;
        else if (data && data._id) items = [data];

        const normalized = items.map((b) => {
          const id = b._id || b.id || b.bookingId || String(b.id || "");
          const movie = b.movie || {};
          const title = movie.title || movie.name || b.movieName || b.title || "Untitled";
          const rawPoster = movie.poster || b.poster || movie.image || "";
          const poster = getImageUrl(rawPoster) || "";
          const category = movie.category || b.category || "";
          const durationMins = movie.durationMins ?? movie.duration ?? b.durationMins ?? 0;
          const slotTime = b.showtime || b.slotTime || b.slot || null;
          const auditorium = b.auditorium || b.audi || "Audi 1";

          const seats =
            Array.isArray(b.seats) && b.seats.length
              ? b.seats.map((s) =>
                  typeof s === "string"
                    ? { id: s }
                    : { id: s.seatId || s.id || s.name || "", type: s.type, price: typeof s.price === "number" ? s.price : undefined }
                )
              : [];

          let amount = 0;
          if (b.amountPaise !== undefined && b.amountPaise !== null) {
            amount = Number(b.amountPaise) / 100;
          } else if (typeof b.amount === "number") {
            amount = b.amount;
          } else if (typeof b.total === "number") {
            amount = b.total;
          }

          return { id, title, poster, category, durationMins, slotTime, auditorium, seats, amount, amountPaise: b.amountPaise, raw: b };
        });

        if (mounted) setBookings(normalized);
      } catch (err) {
        console.error("Failed to load bookings:", err);
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        if (mounted) setError(err?.response?.data?.message || err.message || "Failed to load bookings");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMyBookings();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    const makeQrs = async () => {
      const map = {};
      for (const b of bookings) {
        const seatsList = (b.seats || []).map((s) => (typeof s === "string" ? s : s.id || "")).filter(Boolean);
        const payload = JSON.stringify({
          bookingId: b.id,
          title: b.title,
          time: formatTime(b.slotTime),
          auditorium: b.auditorium,
          seats: seatsList,
        });
        try {
          const url = await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
          map[b.id] = { url, payload };
        } catch (e) {
          console.error("QR error for", b.id, e);
          map[b.id] = { url: "", payload };
        }
      }
      if (mounted) setQrs(map);
    };
    if (bookings.length) makeQrs();
    return () => { mounted = false; };
  }, [bookings]);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleQrScan = (bookingId) => {
    const entry = qrs[bookingId];
    if (!entry || !entry.payload) return;
    try {
      const parsed = JSON.parse(entry.payload);
      setExpanded((prev) => ({ ...prev, [bookingId]: true }));
      const el = document.getElementById(`booking-card-${bookingId}`);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScannedDetails({ bookingId, ...parsed });
    } catch (e) {
      console.error("Failed to parse QR payload", e);
    }
  };

  const closeModal = () => setScannedDetails(null);

  return (
    <BeamsBackground intensity="subtle" className="min-h-screen">
    <div className={bookingsPageStyles.pageContainer}>
      <div className={bookingsPageStyles.mainContainer}>
        <header className={bookingsPageStyles.header}>
          <StaggerText
            text="Your Tickets"
            direction="bottom"
            stagger={0.04}
            className="text-3xl md:text-4xl font-extrabold text-red-500"
          />
          <div className={bookingsPageStyles.subtitle}>Present QR at entry</div>
        </header>

        {loading && <div className={bookingsPageStyles.loading}>Loading bookings…</div>}
        {!loading && error && <div className={bookingsPageStyles.error}>{error}</div>}

        {/* ── Card grid ── */}
        <div className="flex flex-wrap justify-center gap-6 py-6 px-4">
          {bookings.length === 0 && !loading ? (
            <div className={bookingsPageStyles.noBookings}>No bookings found.</div>
          ) : (
            bookings.map((b) => {
              const totals = computeTotals(b);

              return (
                <div
                  id={`booking-card-${b.id}`}
                  key={b.id}
                  aria-labelledby={`booking-front-${b.id}-title`}
                >
                  <FlippingCard
                    width={290}
                    height={420}
                    frontContent={<BookingCardFront b={b} />}
                    backContent={
                      <BookingCardBack
                        b={b}
                        totals={totals}
                        qrs={qrs}
                        handleQrScan={handleQrScan}
                        toggle={toggle}
                        expanded={expanded}
                      />
                    }
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── QR scan modal (unchanged) ── */}
      {scannedDetails && (
        <div className={bookingsPageStyles.modalOverlay} aria-modal="true" role="dialog">
          <div className={bookingsPageStyles.modalBackdrop} onClick={closeModal} aria-hidden="true" />
          <div className={bookingsPageStyles.modalContent}>
            <div className={bookingsPageStyles.modalHeader}>
              <div>
                <h3 className={bookingsPageStyles.modalTitle}>{scannedDetails.title}</h3>
                <div className={bookingsPageStyles.modalBookingId}>
                  Booking ID: <span className={bookingsPageStyles.modalIdText}>{scannedDetails.bookingId}</span>
                </div>
                <div className={bookingsPageStyles.modalDetails}>
                  <div><strong>Time:</strong> {scannedDetails.time}</div>
                  <div><strong>Auditorium:</strong> {scannedDetails.auditorium}</div>
                  <div className="mt-2">
                    <strong>Seats:</strong>{" "}
                    {Array.isArray(scannedDetails.seats) ? scannedDetails.seats.join(", ") : scannedDetails.seats}
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className={bookingsPageStyles.modalCloseButton}
                aria-label="Close scanned details"
              >
                <X className={bookingsPageStyles.modalCloseIcon} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </BeamsBackground>
  );
}
