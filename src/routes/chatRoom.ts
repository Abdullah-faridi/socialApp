import { Router } from "express";
import auth from "../middlewares/auth";
import {
  createRoom,
  getAllRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  getRoomMembers,
  getUserRooms,
  deleteRoom,
  getRoomMessages,
  inviteRoomMember,
} from "../controllers/chatRoom";

const router = Router();

router.get("/", auth, getAllRooms);
router.post("/", auth, createRoom);
router.get("/me", auth, getUserRooms);
router.get("/:id", auth, getRoomById);
router.post("/:id/join", auth, joinRoom);
router.post("/:id/members", auth, inviteRoomMember);
router.post("/:id/leave", auth, leaveRoom);
router.get("/:id/members", auth, getRoomMembers);
router.get("/:id/messages", auth, getRoomMessages);
router.delete("/:id", auth, deleteRoom);

export default router;
