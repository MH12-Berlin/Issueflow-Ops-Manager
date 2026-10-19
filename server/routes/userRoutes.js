
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { searchUsers } from "../controllers/userController.js";

const router = Router();

router.use(protect);
router.get("/search", searchUsers);

export default router;
