import express from "express";
import {
  getAllUser,
  signInController,
  signUpController,
  logoutController,
  getUserPublicProfile,
  UpdateUserProfile
} from "../controllers/userAuthController";
import auth from "../middlewares/auth"
import { authorize, canEditUser } from "../middlewares/authorization";
const router = express.Router();

router.post("/signup", signUpController);
router.post("/signin", signInController);
router.get("/allUsers",authorize(["ADMIN , MODERATOR"]) ,  getAllUser);
router.get("/:id" , getUserPublicProfile)
router.post("/logout",auth , logoutController );
router.patch("/updateProfile/:id" ,auth , canEditUser , UpdateUserProfile );
export default router;
