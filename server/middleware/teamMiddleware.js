
import mongoose from "mongoose";
import Team from "../models/Team.js";

export const requireTeamMember = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.isValidObjectId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const membership = team.members.find(
      (member) => member.user.toString() === req.user.id
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    req.team = team;
    req.teamMembership = membership;

    next();
  } catch (error) {
    console.error("Team authorization error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify team membership",
    });
  }
};

export const requireTeamRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (
      !req.teamMembership ||
      !allowedRoles.includes(req.teamMembership.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};
