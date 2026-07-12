import {
  signUpController,
  signInController,
  logoutController,
} from "../controllers/auth";
import express from "express";

import auth from "../middlewares/auth";

const router = express.Router();
router.post("/signup", signUpController);
router.post("/signin", signInController);
router.post("/logout", auth, logoutController);

export default router;
