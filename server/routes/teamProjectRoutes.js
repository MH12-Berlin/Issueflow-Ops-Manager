
import { Router } from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  requireTeamMember,
  requireTeamRole,
} from "../middleware/teamMiddleware.js";

import {
  createProject,
  listProjects,
} from "../controllers/projectController.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireTeamMember);

router.post(
  "/",
  requireTeamRole("admin", "lead"),
  createProject
);

router.get("/", listProjects);

export default router;
