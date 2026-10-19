
import { Router } from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  requireProjectMember,
  requireProjectManager,
} from "../middleware/projectMiddleware.js";

import {
  getProject,
  updateProject,
  archiveProject,
} from "../controllers/projectController.js";

const router = Router();

router.use(protect);

router.get(
  "/:projectId",
  requireProjectMember,
  getProject
);

router.patch(
  "/:projectId",
  requireProjectMember,
  requireProjectManager,
  updateProject
);

router.patch(
  "/:projectId/archive",
  requireProjectMember,
  requireProjectManager,
  archiveProject
);

export default router;
