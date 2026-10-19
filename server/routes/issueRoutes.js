
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireIssueMember } from "../middleware/issueMiddleware.js";

import {
  getIssue,
  updateIssue,
} from "../controllers/issueController.js";

import {
  getIssueActivity,
  listComments,
  addComment,
} from "../controllers/activityController.js";

const router = Router();

router.use(protect);

router.get(
  "/:issueId/activity",
  requireIssueMember,
  getIssueActivity
);

router.get(
  "/:issueId/comments",
  requireIssueMember,
  listComments
);

router.post(
  "/:issueId/comments",
  requireIssueMember,
  addComment
);

router.get("/:issueId", requireIssueMember, getIssue);
router.patch("/:issueId", requireIssueMember, updateIssue);

export default router;
