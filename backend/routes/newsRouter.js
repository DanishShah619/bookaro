import express from "express";
import { getActingNews } from "../controllers/newsController.js";

const newsRouter = express.Router();

newsRouter.get("/acting", getActingNews);

export default newsRouter;
