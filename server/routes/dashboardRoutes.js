import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    getDashboardSummary,
} from "../controllers/dashboardController.js";

const router = Router();

router.use(protect);

router.get("/summary", getDashboardSummary);

export default router;