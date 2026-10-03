import {
  signUpController,
  signInController,
  logoutController,
} from "../controllers/auth";
import express from "express";

import auth from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";

const router = express.Router();
router.post("/signup", rateLimit("signup", 10, 900), signUpController);
router.post("/signin", rateLimit("signin", 10, 900), signInController);
router.post("/logout", auth, logoutController);

export default router;
