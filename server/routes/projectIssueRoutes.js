
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireProjectMember } from "../middleware/projectMiddleware.js";

import {
  createIssue,
  listIssues,
} from "../controllers/issueController.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireProjectMember);

router.post("/", createIssue);
router.get("/", listIssues);

export default router;
