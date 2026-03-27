// models/subscriberModel.js
import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    subscribedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", subscriberSchema);

export default Subscriber;
