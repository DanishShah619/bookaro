import express from "express";
import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import {
  createMovie,
  getMovies,
  getMovieById,
  deleteMovie,
} from "../controllers/moviesController.js";
import authMiddleware from "../middlewares/auth.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const movieRouter = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "movie_booking_uploads",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mkv"],
    resource_type: "auto", // automatically detect if it's an image or video
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/x-matroska",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 64,
    fields: 80,
  },
  fileFilter(req, file, cb) {
    if (allowedMimeTypes.has(file.mimetype)) return cb(null, true);
    return cb(new Error("Unsupported file type"));
  },
}).fields([
  { name: "poster", maxCount: 1 },
  { name: "trailerUrl", maxCount: 1 },
  { name: "videoUrl", maxCount: 1 },
  { name: "ltThumbnail", maxCount: 1 },
  { name: "castFiles", maxCount: 20 },
  { name: "directorFiles", maxCount: 20 },
  { name: "producerFiles", maxCount: 20 },
  { name: "ltDirectorFiles", maxCount: 20 },
  { name: "ltProducerFiles", maxCount: 20 },
  { name: "ltSingerFiles", maxCount: 20 },
]);

movieRouter.post("/", authMiddleware, requireAdmin, upload, createMovie);
movieRouter.get("/", getMovies);
movieRouter.get("/:id", getMovieById);
movieRouter.delete("/:id", authMiddleware, requireAdmin, deleteMovie);

export default movieRouter;
