// controllers/subscriberController.js
import Subscriber from "../models/subscriberModel.js";

/**
 * POST /api/subscribers
 * Body: { email }
 * Saves a new subscriber. Returns 409 if email already subscribed.
 */
export async function subscribe(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email address." });
    }

    // Check for existing subscriber
    const existing = await Subscriber.findOne({ email }).lean();
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "You're already subscribed! 🎬" });
    }

    await Subscriber.create({ email });

    return res.status(201).json({
      success: true,
      message: "You're subscribed! Welcome to CineNews 🎉",
    });
  } catch (err) {
    // Handle Mongo duplicate key race condition
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "You're already subscribed! 🎬" });
    }
    console.error("subscribe error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
}

/**
 * GET /api/subscribers  (admin only)
 * Returns all subscribers.
 */
export async function listSubscribers(req, res) {
  try {
    const items = await Subscriber.find({})
      .sort({ subscribedAt: -1 })
      .lean();
    return res.json({ success: true, total: items.length, items });
  } catch (err) {
    console.error("listSubscribers error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}
