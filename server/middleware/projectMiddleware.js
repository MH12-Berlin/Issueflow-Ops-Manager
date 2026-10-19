
import mongoose from "mongoose";
import Project from "../models/Project.js";

export const requireProjectMember = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const membership = await mongoose.model("Team").findOne({
      _id: project.team,
      "members.user": req.user.id,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    const teamMember = membership.members.find(
      (member) => member.user.toString() === req.user.id
    );

    req.project = project;
    req.team = membership;
    req.teamMembership = teamMember;

    next();
  } catch (error) {
    console.error("Project authorization error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify project access",
    });
  }
};

export const requireProjectManager = (req, res, next) => {
  if (
    !req.teamMembership ||
    !["admin", "lead"].includes(req.teamMembership.role)
  ) {
    return res.status(403).json({
      success: false,
      message: "Only team admins and leads can manage projects",
    });
  }

  next();
};
