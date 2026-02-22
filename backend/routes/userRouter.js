import express from "express";
import { login, registerUser } from "../controllers/userController.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const userRouter = express.Router();

userRouter.post("/register", authLimiter, registerUser);
userRouter.post('/login', authLimiter, login);

export default userRouter;
