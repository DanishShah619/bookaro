// Run this once from the backend folder: node patch-booking-guard.js
import { readFileSync, writeFileSync } from "fs";

const file = new URL("./controllers/bookingController.js", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
let src = readFileSync(file, "utf8");

const marker = "// best-effort movie load";
const guard = `\n    // ── Reject bookings for showtimes that have already passed ──\n    if (showtime < new Date()) {\n      return res.status(400).json({ success: false, message: "This showtime has already passed and can no longer be booked." });\n    }\n\n    `;

if (src.includes("already passed")) {
  console.log("Guard already applied. Nothing to do.");
  process.exit(0);
}

const idx = src.indexOf(marker);
if (idx === -1) {
  console.error("Could not find marker: //  best-effort movie load");
  process.exit(1);
}

src = src.slice(0, idx) + guard.trimStart() + src.slice(idx);
writeFileSync(file, src, "utf8");
console.log("✅ Past-showtime guard inserted into bookingController.js");
