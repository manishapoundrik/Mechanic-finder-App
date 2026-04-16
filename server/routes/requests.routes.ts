import { Router } from "express";
import {
  createRequest,
  getActiveRequest,
  getRequestStatus,
  cancelRequest,
  getRequestHistory,
  getMechanicActiveRequest,
  getMechanicJobHistory,
  submitRating,
} from "../controllers/requests.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/", authenticateToken, createRequest);
router.get("/active", authenticateToken, getActiveRequest);
router.get("/history", authenticateToken, getRequestHistory);
router.get("/mechanic/active", authenticateToken, getMechanicActiveRequest);
router.get("/mechanic/history", authenticateToken, getMechanicJobHistory);
router.post("/rate", authenticateToken, submitRating);
router.get("/:requestId/status", authenticateToken, getRequestStatus);
router.delete("/:requestId", authenticateToken, cancelRequest);

export default router;
