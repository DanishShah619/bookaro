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
} from "../controllers/bookingController.js";
import authMiddleware from "../middlewares/auth.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const bookingRouter = express.Router();

bookingRouter.post("/", authMiddleware, createBooking);
bookingRouter.get("/confirm-payment", authMiddleware, confirmPayment);
bookingRouter.post("/cancel-checkout", authMiddleware, cancelCheckoutSession);
bookingRouter.get("/", listBookings);
bookingRouter.get("/occupied",requireAdmin,getOccupiedSeats);

// Specific static routes must come BEFORE dynamic routes like "/:id"
bookingRouter.get("/my",authMiddleware,requireAdmin, getBooking);
bookingRouter.delete("/:id", authMiddleware,requireAdmin, deleteBooking);

export default bookingRouter;
