import express from "express";
import {
  getUserPublicProfile,
  UpdateUserProfile,
  FollowUser,
  unfollowUser,
  followerList,
  followingList,
  uploadAvatarController,
} from "../controllers/user";
import auth from "../middlewares/auth";
import { requireSelf } from "../middlewares/userAuthorization";
import { uploadAvatar } from "../middlewares/uploadFile";
const router = express.Router();

router.get("/:id", getUserPublicProfile);

router.patch("/:id", auth, requireSelf(), UpdateUserProfile);
router.patch(
  "/:id/avatar",
  auth,
  requireSelf(),
  uploadAvatar,
  uploadAvatarController,
);

router.post("/:id/follow", auth, FollowUser);
router.delete("/:id/follow", auth, unfollowUser);

router.get("/:id/followers", auth, followerList);
router.get("/:id/following", auth, followingList);
export default router;
