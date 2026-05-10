import { setDefaultResultOrder } from "dns";
setDefaultResultOrder("ipv4first");
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { connectDB } from './config/db.js';
import path from 'path';
import movieRouter from './routes/movieRouter.js';
import userRouter from './routes/userRouter.js';
import bookingRouter from './routes/bookingRouter.js';
import newsRouter from './routes/newsRouter.js';
import subscriberRouter from './routes/subscriberRouter.js';
import { stripeWebhook } from './controllers/bookingController.js';
import { globalLimiter, authLimiter } from './middlewares/rateLimiter.js';

const app = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

const requiredProductionEnv = [
    "DATABASE_URL",
    "JWT_SECRET",
    "STRIPE_SECRET_KEY",
    "CLIENT_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];

if (isProduction) {
    const missing = requiredProductionEnv.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(`Missing required production env vars: ${missing.join(", ")}`);
    }
}

const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    ...(process.env.CORS_ORIGINS || "").split(","),
]
    .map((origin) => String(origin || "").trim().replace(/\/+$/, ""))
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        if (!isProduction || !origin) return callback(null, true);
        const normalizedOrigin = String(origin).replace(/\/+$/, "");
        if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
};

// Middleware
app.use(cors(corsOptions))
app.post("/api/bookings/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);
app.use('/api/auth', authLimiter); // Apply stricter rate limit to auth routes
// Database Connection
connectDB();

// Routes
app.set('trust proxy', 1); 
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"))); 
app.use("/api/auth", userRouter)
app.use("/api/movies", movieRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/news", newsRouter);
app.use("/api/subscribers", subscriberRouter);

app.get('/', (req, res) => {
    res.send('API Working');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
});
