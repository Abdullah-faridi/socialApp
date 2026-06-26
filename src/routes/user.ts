import express from "express";
import {
  getAllUser,
  signInController,
  signUpController,
  logoutController
} from "../controllers/userAuthController";
import auth from "../middlewares/auth"
const router = express.Router();

router.post("/signup", signUpController);
router.post("/signin", signInController);
router.get("/allUsers", getAllUser);
router.post("/logout",auth , logoutController );
export default router;
