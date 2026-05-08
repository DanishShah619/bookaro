import express from "express";
import { getActingNews } from "../controllers/newsController.js";
import { newsLimiter } from "../middlewares/rateLimiter.js";

const newsRouter = express.Router();

newsRouter.get("/acting", newsLimiter, getActingNews);

export default newsRouter;
