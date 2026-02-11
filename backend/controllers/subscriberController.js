// controllers/subscriberController.js
import Subscriber from "../models/subscriberModel.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Send welcome email via Resend (fire and forget, don't await/block the response)
    if (process.env.RESEND_API_KEY) {
      resend.emails.send({
        from: "CineNews <onboarding@resend.dev>", // Replace with your verified domain when in production
        to: email,
        subject: "Welcome to CineNews! 🎬",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #e50914;">Welcome to CineNews! 🍿</h1>
            <p>Hi there,</p>
            <p>Thanks for subscribing to <strong>CineNews</strong>. You're now on the list to get the latest movie drops, exclusive offers, and showtime alerts straight to your inbox.</p>
            <p>Stay tuned for cinematic greatness.</p>
            <br/>
            <p>Cheers,</p>
            <p><strong>The CineVerse Team</strong></p>
          </div>
        `,
      }).catch(err => console.error("Resend email failed:", err));
    }

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
