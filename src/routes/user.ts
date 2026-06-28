import express from "express";
import {
  getAllUser,
  signInController,
  signUpController,
  logoutController,
  getUserPublicProfile,
  UpdateUserProfile,
  FollowUser,
  unfollowUser,
  followerList,
  followingList
} from "../controllers/userAuthController";
import auth from "../middlewares/auth"
import { authorize, canEditUser } from "../middlewares/authorization";
const router = express.Router();

router.post("/signup", signUpController);
router.post("/signin", signInController);
router.post("/logout", auth, logoutController);

router.get("/allUsers", auth, authorize(["ADMIN", "MODERATOR"]), getAllUser);

router.get("/:id", getUserPublicProfile);

router.patch("/:id", auth, canEditUser, UpdateUserProfile);

router.post("/:id/follow", auth, FollowUser);
router.delete("/:id/follow", auth, unfollowUser);

router.get("/:id/followers", auth, followerList);
router.get("/:id/following", auth, followingList);
export default router;
