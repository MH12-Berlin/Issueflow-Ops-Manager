
import mongoose from "mongoose";
import Project from "../models/Project.js";
import User from "../models/User.js";

const populateProject = (query) =>
  query
    .populate("team", "name")
    .populate("createdBy", "name email")
    .populate("lead", "name email");

const isValidProjectKey = (key) =>
  typeof key === "string" &&
  /^[A-Z][A-Z0-9]{1,9}$/.test(key);

const validateProjectLead = async (lead, team) => {
  if (lead === null) {
    return { valid: true };
  }

  if (typeof lead !== "string" || !mongoose.isValidObjectId(lead)) {
    return {
      valid: false,
      message: "Invalid project lead ID",
    };
  }

  const isTeamMember = team?.members?.some(
    (member) => member.user?.toString() === lead
  );

  if (!isTeamMember) {
    return {
      valid: false,
      message: "Project lead must be an active team member",
    };
  }

  const leadUser = await User.findOne({
    _id: lead,
    isActive: true,
  });

  if (!leadUser) {
    return {
      valid: false,
      message: "Project lead must be an active team member",
    };
  }

  return { valid: true };
};

// POST /api/teams/:teamId/projects
export const createProject = async (req, res) => {
  try {
    const {
      name,
      description = "",
      key,
      lead = null,
    } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof description !== "string" ||
      typeof key !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, description, and key must be strings",
      });
    }

    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    const normalizedKey = key.trim().toUpperCase();

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Project name must be between 2 and 100 characters",
      });
    }

    if (normalizedDescription.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 2000 characters",
      });
    }

    if (!isValidProjectKey(normalizedKey)) {
      return res.status(400).json({
        success: false,
        message: "Key must be 2-10 characters, starting with a letter",
      });
    }

    if (!req.team?._id || !req.user?.id) {
      return res.status(400).json({
        success: false,
        message: "Team and user context are required",
      });
    }

    const leadValidation = await validateProjectLead(lead, req.team);

    if (!leadValidation.valid) {
      return res.status(400).json({
        success: false,
        message: leadValidation.message,
      });
    }

    const project = await Project.create({
      name: normalizedName,
      description: normalizedDescription,
      key: normalizedKey,
      team: req.team._id,
      createdBy: req.user.id,
      lead,
    });

    const populatedProject = await populateProject(
      Project.findById(project._id)
    );

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This project key already exists in the team",
      });
    }

    console.error("Create project error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create project",
    });
  }
};

// GET /api/teams/:teamId/projects
export const listProjects = async (req, res) => {
  try {
    if (!req.team?._id) {
      return res.status(400).json({
        success: false,
        message: "Team context is required",
      });
    }

    const projects = await populateProject(
      Project.find({ team: req.team._id }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("List projects error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve projects",
    });
  }
};

// GET /api/projects/:projectId
export const getProject = async (req, res) => {
  try {
    if (!req.project?._id) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = await populateProject(
      Project.findById(req.project._id)
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get project error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve project",
    });
  }
};

// PATCH /api/projects/:projectId
export const updateProject = async (req, res) => {
  try {
    const { name, description, lead, status } = req.body ?? {};
    const updates = {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Project name must be between 2 and 100 characters",
        });
      }

      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        description.trim().length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "Description cannot exceed 2000 characters",
        });
      }

      updates.description = description.trim();
    }

    if (lead !== undefined) {
      const leadValidation = await validateProjectLead(
        lead,
        req.team
      );

      if (!leadValidation.valid) {
        return res.status(400).json({
          success: false,
          message: leadValidation.message,
        });
      }

      updates.lead = lead;
    }

    if (status !== undefined) {
      if (!["active", "completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be active or completed",
        });
      }

      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update",
      });
    }

    if (!req.project?._id) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const result = await Project.updateOne(
      { _id: req.project._id },
      { $set: updates },
      { runValidators: true }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const updatedProject = await populateProject(
      Project.findById(req.project._id)
    );

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update project",
    });
  }
};

// PATCH /api/projects/:projectId/archive
export const archiveProject = async (req, res) => {
  try {
    if (!req.project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (req.project.status === "archived") {
      return res.status(409).json({
        success: false,
        message: "Project is already archived",
      });
    }

    req.project.status = "archived";
    req.project.archivedAt = new Date();

    await req.project.save();

    return res.status(200).json({
      success: true,
      message: "Project archived successfully",
      project: {
        id: req.project._id,
        name: req.project.name,
        key: req.project.key,
        status: req.project.status,
        archivedAt: req.project.archivedAt,
      },
    });
  } catch (error) {
    console.error("Archive project error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to archive project",
    });
  }
};
