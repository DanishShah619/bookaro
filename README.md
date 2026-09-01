# 🎬 Bookaro — Full-Stack Movie Booking Platform

> A production-grade, real-time cinema seat booking application built with the **MERN stack**, featuring Stripe payments, Redis-backed seat locking, Cloudinary media management, and a dedicated admin dashboard — all containerised with Docker.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Live Architecture](#-live-architecture)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Security & Engineering Highlights](#-security--engineering-highlights)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Seeding Sample Data](#-seeding-sample-data)
- [Creating an Admin User](#-creating-an-admin-user)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Hire-Worthy Engineering Qualities](#-hire-worthy-engineering-qualities)

---

## 🎯 Overview

**Bookaro** is a fully functional, end-to-end movie booking platform — similar to BookMyShow or Fandango — built from scratch. It supports:

- 🎟️ Real-time seat reservation with **race-condition protection**
- 💳 Stripe Checkout for secure online payment
- 🏛️ A separate **Admin Dashboard** for complete cinema management
- 📰 Live cinema news powered by **GNews API**
- 📧 Email subscription system with **Resend** welcome emails
- ☁️ Cloud image/video uploads via **Cloudinary**
- 🐳 One-command Docker deployment

This project demonstrates deep knowledge of full-stack engineering, distributed systems concerns (seat locking), payment integration, API design, and DevOps practices.

---

## 🏗 Live Architecture

```
+----------------------------------------------------------+
|                      Docker Compose                      |
|                                                          |
|  +--------------+  +--------------+  +--------------+   |
|  |   Frontend   |  |    Admin     |  |   Backend    |   |
|  | React + Vite |  | React + Vite |  |  Express 5   |   |
|  |  Port: 5173  |  |  Port: 5174  |  |  Port: 5000  |   |
|  |  nginx serve |  |  nginx serve |  |              |   |
|  +------+-------+  +------+-------+  +------+-------+   |
|         |                 |                 |            |
|         +-----------------+-----------------+            |
|                           |                              |
|                    +------v-------+                      |
|                    |  MongoDB 7   |                      |
|                    | Port: 27017  |                      |
|                    +--------------+                      |
|                                                          |
|  External: Redis (optional), Stripe, Cloudinary, GNews  |
+----------------------------------------------------------+
```

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | Runtime |
| **Express** | 5.x | Web framework (latest major) |
| **MongoDB** | 7 | Primary database |
| **Mongoose** | 8.x | ODM with strict schemas |
| **Redis** | 4.x | Pre-emptive seat locking (optional) |
| **Stripe** | 19.x | Payment processing |
| **Cloudinary** | 2.x | Image & video CDN |
| **Multer** | 2.x | Multipart file uploads |
| **JWT** | 9.x | Stateless authentication |
| **bcryptjs** | 3.x | Password hashing |
| **Resend** | 6.x | Transactional email |
| **express-rate-limit** | 8.x | DDoS / brute-force protection |

### Frontend & Admin

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.x | UI framework |
| **Vite** | 7.x | Ultra-fast build tool |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **React Router** | 7.x | Client-side routing |
| **Motion** | 12.x | Fluid animations |
| **Lucide React** | — | Icon library |
| **Axios** | 1.x | HTTP client |
| **QRCode** | 1.x | Booking QR code generation |
| **React Toastify** | 11.x | Notifications |

### DevOps

| Tool | Purpose |
|---|---|
| **Docker** + **Docker Compose** | Container orchestration |
| **nginx** | Static file serving for SPA builds |
| **Vercel** | Frontend deployment config included |

---

## ✨ Key Features

### Customer App

#### 🏠 Home & Discovery
- **Hero banner** with featured movie highlights and autoplay trailers
- **"Now Showing"** and **"Coming Soon"** movie grids
- **Latest Trailers** section with embedded video previews
- **Live Cinema News** feed via GNews API with server-side caching (1-hour TTL)
- **Email newsletter subscription** with a branded Resend welcome email

#### 🎥 Movie Detail
- Full movie info: cast, directors, producers, story synopsis, genres, rating, duration
- Showtime slot picker across a **60-day calendar** (4 shows/day)
- **Auditorium / screen selection** per movie

#### 💺 Real-Time Seat Selector
- Visual cinema seating layout with **Standard** and **Recliner** seat tiers (rows D & E)
- **Live occupied-seat detection** — booked and locked seats are greyed out instantly
- **Dual-layer seat locking**:
  1. **Redis `SET NX EX`** — sub-millisecond atomic pre-lock on seat selection
  2. **MongoDB `SeatLock` collection** — durable fallback when Redis is unavailable
- Per-seat pricing computed **server-side** to prevent client-side price manipulation
- QR code generated for each confirmed booking ticket

#### 💳 Checkout & Payment
- Stripe Checkout Session with a **30-minute expiry window**
- Lock TTL **automatically extended** to 15 minutes when the user enters checkout
- Stripe **Webhook** confirms payment atomically — uses `express.raw()` body to preserve Stripe signature
- Payment failure → seat locks are **automatically released** and booking cancelled
- Success page verifies payment, displays booking confirmation and QR code

#### 👤 User Account
- Register / Login with JWT (24-hour tokens)
- **"My Bookings"** page showing booking history with status badges
- Smooth scroll restoration across all page navigations

---

### Admin Dashboard

Accessible at port **5174** — a completely separate React SPA with zero coupling to the customer app.

| Feature | Details |
|---|---|
| **Secure Login** | Admin-only flag checked server-side; non-admins blocked at login |
| **Dashboard** | Overview metrics for movies, bookings, and subscribers |
| **Add Movie** | Rich form: upload poster, trailer, video, cast/director/producer photos |
| **List Movies** | View and delete all movies with media previews |
| **Bookings Manager** | View all bookings with status; admin can cancel/delete |
| **Subscriber List** | All newsletter subscribers with subscribe date |
| **Token Security** | Token stripped from URL immediately after admin login redirect |

---

## 🔐 Security & Engineering Highlights

### 1. Dual-Layer Distributed Seat Locking
The most technically sophisticated part of the system. When a user clicks a seat:

1. **Redis `SET NX EX` (atomic CAS)** — acquires a 5-minute lock instantly. If Redis is down, the system **degrades gracefully** rather than crashing.
2. **MongoDB `SeatLock` documents** — a durable fallback. Unique compound index on `lockKey` ensures only one booking can ever hold a seat.
3. **Compound queries** — occupied-seat queries check both `SeatLock` and `Booking` collections.
4. **Auto-cleanup** — expired locks are purged before every new lock acquisition.
5. **Lua scripted release** — lock release is atomic via Redis Lua `eval` to prevent check-then-act races.

### 2. Server-Side Price Computation
Seat prices are **never trusted from the client**. The server recomputes the total in paise from the movie's `seatPrices` document, preventing any price manipulation via API.

```
Standard rows (A-C, F+)  ->  movie.seatPrices.standard
Recliner rows  (D, E)    ->  movie.seatPrices.recliner  (default: 1.5x standard)
```

### 3. Stripe Webhook Integrity
The webhook handler registers **before** `express.json()` using `express.raw()`, so the raw body is preserved for Stripe HMAC signature verification — the industry-correct approach.

### 4. JWT + Role-Based Access Control
- JWT is **required** to start — missing `JWT_SECRET` throws a fatal error at boot.
- `isAdmin` flag is embedded in the JWT payload for fast middleware checks without extra DB round-trips.
- A separate `requireAdmin` middleware double-checks admin status from the database.
- Auth routes have a **stricter rate limit** (10 req / 15 min vs. 100 global).

### 5. Production Environment Guards
The server **refuses to start** in production if any of these are missing:

```
DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, CLIENT_URL,
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

### 6. Intelligent CORS Configuration
- Dynamically builds the allowed-origins list from multiple env vars.
- In development, `localhost` and `127.0.0.1` are automatically allowed.
- Logs blocked origins with full details without crashing or leaking info.

### 7. Cloudinary-First Media Pipeline
Movie uploads are streamed directly to **Cloudinary** — no local disk bloat. Deletion calls `cloudinary.uploader.destroy()` to avoid orphaned cloud assets.

### 8. In-Memory News Cache
The GNews controller caches responses for **1 hour** in memory, reducing external API calls and protecting the free-tier quota.

---

## 📁 Project Structure

```
bookaro/
├── backend/
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── redis.js            # Redis client + distributed lock helpers
│   ├── controllers/
│   │   ├── bookingController.js    # 954-line core: locking, Stripe, webhooks
│   │   ├── moviesController.js     # CRUD + Cloudinary media management
│   │   ├── newsController.js       # GNews proxy + in-memory cache
│   │   ├── subscriberController.js # Newsletter + Resend email
│   │   └── userController.js       # Register / Login / JWT
│   ├── middlewares/
│   │   ├── auth.js             # JWT Bearer token verification
│   │   ├── requireAdmin.js     # Admin RBAC guard
│   │   └── rateLimiter.js      # Global + auth-specific rate limits
│   ├── models/
│   │   ├── bookingModel.js     # Booking schema with compound indexes
│   │   ├── movieModel.js       # Movie schema (slots, cast, pricing)
│   │   ├── seatLockModel.js    # Distributed seat lock store
│   │   ├── subscriberModel.js  # Email subscriber
│   │   └── userModel.js        # User with isAdmin flag
│   ├── routes/                 # Express routers
│   ├── makeAdmin.js            # CLI: promote user to admin
│   ├── seedMovies.js           # Demo data seeder (60-day slots)
│   ├── Dockerfile
│   └── index.js                # App entry point
│
├── frontend/                   # Customer-facing React SPA
│   ├── src/
│   │   ├── pages/              # Home, Movie, Release, Booking, SeatSelector
│   │   ├── components/         # Banner, Navbar, Footer, News, Trailers
│   │   └── App.jsx             # React Router v7 config
│   ├── nginx.conf              # Production SPA serving
│   ├── Dockerfile
│   └── vercel.json             # Vercel deployment config
│
├── admin/                      # Admin SPA (independent app)
│   ├── src/
│   │   ├── pages/              # Dashboard, AddMovie, ListMovies, Bookings
│   │   └── App.jsx
│   ├── nginx.conf
│   └── Dockerfile
│
├── docker-compose.yml          # Full-stack orchestration (4 services)
├── .env.example                # Every env var documented
└── DOCKER.md                   # Docker quick-start guide
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Docker](https://www.docker.com/) & Docker Compose (for containerised setup)
- Stripe account (for payments)
- Cloudinary account (for media uploads)
- GNews API key (cinema news — optional)
- Resend API key (welcome emails — optional)

---

### Environment Variables

```bash
cp .env.example .env
# Edit .env with your keys
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random string for JWT signing |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `CLIENT_URL` | Yes | Frontend URL (e.g. `http://localhost:5173`) |
| `ADMIN_URL` | Yes | Admin URL (e.g. `http://localhost:5174`) |
| `API_BASE_URL` | Yes | Backend URL (e.g. `http://localhost:5000`) |
| `CORS_ORIGINS` | Optional | Comma-separated additional allowed origins |
| `REDIS_URL` | Optional | Redis URL (recommended for production) |
| `GNEWS_API_KEY` | Optional | For live cinema news feed |
| `RESEND_API_KEY` | Optional | For welcome emails on subscription |

---

### Run with Docker (Recommended)

```bash
git clone <repo-url>
cd bookaro
cp .env.example .env      # fill in your keys
docker compose up --build
```

| Service | URL |
|---|---|
| Customer App | http://localhost:5173 |
| Admin Panel | http://localhost:5174 |
| REST API | http://localhost:5000 |
| MongoDB | localhost:27017 |

> Docker Compose uses health checks — each service starts only after its dependencies are healthy.

---

### Run Locally (Manual Setup)

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev

# Admin (new terminal)
cd admin && npm install && npm run dev
```

---

## 🌱 Seeding Sample Data

```bash
cd backend
node seedMovies.js
```

Populates the database with 6 realistic movies spanning Sci-Fi, Action, Romance, Drama, and Thriller genres — each with 4 daily showtimes across a **60-day calendar**, cast info, and tiered seat pricing.

---

## 👑 Creating an Admin User

```bash
# 1. Register via the customer app at /signup
# 2. Grant admin privileges via the CLI tool
cd backend
node makeAdmin.js user@example.com
# Output: Success! User user@example.com is now an ADMIN.
# 3. Log in at http://localhost:5174
```

---

## 📋 API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user |
| `POST` | `/api/auth/login` | Public | Login, returns JWT |
| `GET` | `/api/movies` | Public | List all movies |
| `GET` | `/api/movies/:id` | Public | Get movie by ID |
| `POST` | `/api/movies` | Admin | Create movie (multipart) |
| `DELETE` | `/api/movies/:id` | Admin | Delete movie + media cleanup |
| `POST` | `/api/bookings/lock-seat` | User | Pre-lock a seat (Redis + Mongo) |
| `POST` | `/api/bookings/unlock-seat` | User | Release a seat lock |
| `POST` | `/api/bookings` | User | Create booking + Stripe Checkout |
| `GET` | `/api/bookings/confirm-payment` | User | Verify Stripe payment |
| `POST` | `/api/bookings/cancel-checkout` | User | Cancel pending Checkout |
| `GET` | `/api/bookings/my` | User | User's own bookings |
| `GET` | `/api/bookings/occupied` | Public | Occupied seats for a showtime |
| `GET` | `/api/bookings` | Admin | All bookings |
| `DELETE` | `/api/bookings/:id` | Admin | Delete a booking |
| `POST` | `/api/bookings/stripe-webhook` | Stripe | Payment confirmation webhook |
| `GET` | `/api/news` | Public | Live cinema news (cached 1h) |
| `POST` | `/api/subscribers` | Public | Subscribe to newsletter |
| `GET` | `/api/subscribers` | Admin | List all subscribers |
| `GET` | `/health` | Public | Health check |

---

## 🗄️ Database Schema

### Movie
```
movieName, type (normal | featured | releaseSoon | latestTrailers)
categories[], poster (URL), trailerUrl, videoUrl
rating, duration (minutes), auditorium
slots[]      { date, time, ampm }
seatPrices   { standard, recliner }
cast[]       { name, role, file }
directors[], producers[]
story
latestTrailer { title, genres, duration, directors, producers, singers, videoId }
```

### Booking
```
movieId (ref), userId (ref)
customer, movie { snapshot: title, poster, duration, category, year, rating }
showtime (Date, indexed), auditorium (indexed)
seats[] (Mixed — seatId strings or objects)
basePrice, amount (rupees), amountPaise (authoritative paise)
currency, status, paymentStatus, paymentMethod
paymentSessionId, paymentIntentId, holdExpiresAt
Compound indexes: [showtime, auditorium, status]
                  [movieId, showtime, auditorium]
                  [status, holdExpiresAt]
```

### SeatLock
```
lockKey (unique — the distributed lock key)
bookingId, userId, movieId, movieName
showtime, auditorium, seatId
status (pending | paid | cancelled | failed)
expiresAt (TTL for auto-cleanup)
Compound indexes for per-show queries
```

### User
```
fullName, username (unique), email (unique)
phone, birthDate, password (bcrypt hash)
isAdmin (Boolean, default: false)
```

---

## 🏆 Hire-Worthy Engineering Qualities

### Distributed Systems Thinking
Seat booking is a classic **race-condition problem** with real money on the line. The solution implements a **two-tier locking strategy**:
- **Atomic** — Redis `SET NX EX` guarantees no two users grab the same seat
- **Resilient** — graceful degradation to MongoDB-only when Redis is unavailable (no crashes)
- **Self-healing** — expired locks auto-purged before every new booking attempt
- **Idempotent** — lock release uses Lua scripts to prevent check-then-act races

### Secure by Design
- Passwords hashed with **bcrypt** (10 salt rounds)
- JWT with **role claims** — no extra DB round-trip for admin checks
- Stripe webhook validated with **HMAC signature** using `express.raw()` registered before global JSON middleware
- Server **refuses to boot in production** with missing secrets
- **Three-tier rate limiting**: 100/15 min global, 10/15 min auth, 30/15 min news
- Admin token stripped from URL on redirect — prevents token leakage in browser history

### Clean Architecture & Code Quality
- **MVC** — controllers, models, routes, middlewares cleanly separated
- **ES Modules** (`type: "module"`) throughout — modern JavaScript
- Business logic in pure named functions (`computeTotalPaiseFromSeats`, `normalizeShowtimeToMinute`, etc.)
- Consistent `{ success, message }` API response shape with correct HTTP status codes
- No magic strings — all constants defined at module scope

### Payment Engineering
- Full Stripe Checkout flow: create session → webhook → confirmation
- Amounts stored in **paise** (smallest currency unit) to eliminate floating-point errors
- Checkout expiry (30 min) synced with seat-lock TTL extension
- Payment state transitions are **idempotent** in the webhook handler

### Cloud-Native Media
- Direct-to-Cloudinary streaming via `multer-storage-cloudinary` — no temp disk usage
- Supports images + videos up to 50 MB with MIME-type allowlist validation
- Old media **deleted from Cloudinary** when a movie is removed — no orphaned assets
- Auto-detects `image` vs `video` resource type during upload

### DevOps & Developer Experience
- **One command** to run everything: `docker compose up --build`
- Docker Compose health checks with `depends_on: condition: service_healthy`
- Database seeder for instant realistic demo data (6 movies, 60-day slots)
- Admin CLI tool for user privilege management
- `.env.example` documents every single environment variable

### Modern Frontend Engineering
- **React 19** with React Router v7 nested routes
- **Tailwind CSS v4** with Motion library for polished micro-interactions
- `ScrollToTop` component handles all edge cases: hash links, browser history scroll restoration
- **QR code generation** for booking tickets — a production-quality UX detail
- Separate admin SPA: independent Dockerfile, independent deployment, zero coupling

### Observability & Reliability
- `/health` endpoint ready for load balancer health probes
- All Redis errors demoted to `console.warn` — the API server never crashes on cache failures
- Detailed CORS block logging for debugging without crashing or leaking info
- Consistent structured logging across all controllers

---

## 📄 License

ISC

---

Built with the MERN stack — MongoDB · Express · React · Node.js
