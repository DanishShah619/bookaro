// routes/subscriberRouter.js
import express from "express";
import { subscribe, listSubscribers } from "../controllers/subscriberController.js";
import authMiddleware from "../middlewares/auth.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const subscriberRouter = express.Router();

// Public — anyone can subscribe
subscriberRouter.post("/", subscribe);

// Admin only — view all subscribers
subscriberRouter.get("/", authMiddleware, requireAdmin, listSubscribers);

export default subscriberRouter;
