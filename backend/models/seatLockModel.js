import mongoose from "mongoose";

const { Schema } = mongoose;

const seatLockSchema = new Schema(
  {
    lockKey: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: false },
    movieName: { type: String, default: "", index: true },
    showtime: { type: Date, required: true, index: true },
    auditorium: { type: String, required: true, index: true },
    seatId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "failed"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

seatLockSchema.index({ showtime: 1, auditorium: 1, movieId: 1, status: 1 });
seatLockSchema.index({ showtime: 1, auditorium: 1, movieName: 1, status: 1 });

export default mongoose.models.SeatLock || mongoose.model("SeatLock", seatLockSchema);
