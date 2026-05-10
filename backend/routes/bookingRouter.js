// routes/bookingRoutes.js
import express from "express";
import {
  createBooking,
  getBooking,
  listBookings,
  confirmPayment,
  cancelCheckoutSession,
  deleteBooking,
  getOccupiedSeats,
  lockSeat,
  unlockSeat,
} from "../controllers/bookingController.js";
import authMiddleware from "../middlewares/auth.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const bookingRouter = express.Router();

// Pre-eminent seat locking (Redis) — must be authenticated
bookingRouter.post("/lock-seat", authMiddleware, lockSeat);
bookingRouter.post("/unlock-seat", authMiddleware, unlockSeat);

bookingRouter.post("/", authMiddleware, createBooking);
bookingRouter.get("/confirm-payment", authMiddleware, confirmPayment);
bookingRouter.post("/cancel-checkout", authMiddleware, cancelCheckoutSession);
bookingRouter.get("/", authMiddleware, requireAdmin, listBookings);
bookingRouter.get("/occupied", getOccupiedSeats);

// Static named routes BEFORE dynamic /:id
bookingRouter.get("/my", authMiddleware, getBooking);
bookingRouter.delete("/:id", authMiddleware, requireAdmin, deleteBooking);

export default bookingRouter;
