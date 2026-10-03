import { Router } from "express";
import auth from "../middlewares/auth";
import { getNotifications, markNotificationRead } from "../controllers/notification";

const router = Router();
router.get("/", auth, getNotifications);
router.patch("/:id/read", auth, markNotificationRead);
export default router;
