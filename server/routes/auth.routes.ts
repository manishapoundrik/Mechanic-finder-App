import { Router } from "express";
import { register, login, getProfile, updateProfile } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/user/profile", authenticateToken, getProfile);
router.put("/user/profile", authenticateToken, updateProfile);

export default router;
