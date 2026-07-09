import express from "express"
import { getAllUser } from "../controllers/user";
import auth from "../middlewares/auth";
import { authorize } from "../middlewares/userAuthorization";
import { banUser, updateUserRole } from "../controllers/admin";
const router = express.Router();


router.get("/users", auth, authorize(["ADMIN", "MODERATOR"]), getAllUser);
router.patch("/users/:id/ban" , auth , authorize(["ADMIN"]) , banUser)
router.patch("/users/:id/unban" , auth , authorize(["ADMIN"]) , banUser)
router.patch("users/:id/role" , auth , authorize(["ADMIN"]) ,updateUserRole )
export default router;