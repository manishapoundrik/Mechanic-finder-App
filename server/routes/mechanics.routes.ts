import { Router } from "express";
import {
  getNearbyMechanics,
  getMechanicProfile,
  updateMechanicStatus,
  updateMechanicProfile,
  getMechanicDetails,
  getMechanicPhoto,
} from "../controllers/mechanics.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/nearby", authenticateToken, getNearbyMechanics);
router.get("/details", authenticateToken, getMechanicDetails);
router.get("/photo", getMechanicPhoto);
router.get("/profile", authenticateToken, getMechanicProfile);
router.put("/status", authenticateToken, updateMechanicStatus);
router.put("/profile", authenticateToken, updateMechanicProfile);

export default router;
