
import { Router } from "express";

import { protect } from "../middleware/authMiddleware.js";
import {
  requireTeamMember,
  requireTeamRole,
} from "../middleware/teamMiddleware.js";

import {
  createTeam,
  listTeams,
  getTeam,
  addTeamMember,
} from "../controllers/teamController.js";

const router = Router();

// All team endpoints require authentication.
router.use(protect);

router.post("/", createTeam);
router.get("/", listTeams);

router.get(
  "/:teamId",
  requireTeamMember,
  getTeam
);

router.post(
  "/:teamId/members",
  requireTeamMember,
  requireTeamRole("admin"),
  addTeamMember
);

export default router;
