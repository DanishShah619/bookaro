import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { success: false, message: "Too many requests, slow down." }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter for login/register
  message: { success: false, message: "Too many auth attempts." }
});

export const newsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 30, // 30 requests per 15 minutes per IP
  message: { success: false, message: "Too many news requests, slow down." }
});