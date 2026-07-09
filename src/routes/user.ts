import express from "express";
import {
  getAllUser,
  getUserPublicProfile,
  UpdateUserProfile,
  FollowUser,
  unfollowUser,
  followerList,
  followingList
} from "../controllers/user";
import auth from "../middlewares/auth"
import { canEditUser } from "../middlewares/userAuthorization";
const router = express.Router();



router.get("/:id", getUserPublicProfile);

router.patch("/:id", auth, canEditUser, UpdateUserProfile);

router.post("/:id/follow", auth, FollowUser);
router.delete("/:id/follow", auth, unfollowUser);

router.get("/:id/followers", auth, followerList);
router.get("/:id/following", auth, followingList);
export default router;
