
import mongoose from "mongoose";
import Issue from "../models/Issue.js";
import Team from "../models/Team.js";

export const requireIssueMember = async (req, res, next) => {
  try {
    const { issueId } = req.params;

    if (!mongoose.isValidObjectId(issueId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue ID",
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const team = await Team.findOne({
      _id: issue.team,
      "members.user": req.user.id,
    });

    if (!team) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this issue",
      });
    }

    req.issue = issue;
    req.team = team;
    req.teamMembership = team.members.find(
      (member) => member.user.toString() === req.user.id
    );

    next();
  } catch (error) {
    console.error("Issue authorization error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify issue access",
    });
  }
};
