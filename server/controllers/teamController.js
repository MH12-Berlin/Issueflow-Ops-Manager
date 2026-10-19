
import mongoose from "mongoose";
import User from "../models/User.js";
import Team from "../models/Team.js";

// POST /api/teams
export const createTeam = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const isAccountAdmin = req.user.role === "admin";

    const isTeamLead = await Team.exists({
      members: {
        $elemMatch: {
          user: req.user.id,
          role: "lead",
        },
      },
    });

    if (!isAccountAdmin && !isTeamLead) {
      return res.status(403).json({
        success: false,
        message: "Only admins and team leads can create teams",
      });
    }

    const {
      name,
      description = "",
    } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and description must be strings",
      });
    }

    const normalizedName = name.trim();
    const normalizedDescription = description.trim();

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Team name must be between 2 and 100 characters",
      });
    }

    if (normalizedDescription.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 500 characters",
      });
    }

    const team = await Team.create({
      name: normalizedName,
      description: normalizedDescription,
      createdBy: req.user.id,
      members: [
        {
          user: req.user.id,
          role: "admin",
        },
      ],
    });

    const populatedTeam = await Team.findById(team._id)
      .populate("createdBy", "name email")
      .populate("members.user", "name email");

    return res.status(201).json({
      success: true,
      message: "Team created successfully",
      team: populatedTeam,
    });
  } catch (error) {
    console.error("Create team error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create team",
    });
  }
};

// GET /api/teams
export const listTeams = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const teams = await Team.find({
      "members.user": req.user.id,
    })
      .populate("createdBy", "name email")
      .populate("members.user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: teams.length,
      teams,
    });
  } catch (error) {
    console.error("List teams error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve teams",
    });
  }
};

// GET /api/teams/:teamId
export const getTeam = async (req, res) => {
  try {
    if (!req.team?._id) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const team = await Team.findById(req.team._id)
      .populate("createdBy", "name email")
      .populate("members.user", "name email");

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    return res.status(200).json({
      success: true,
      team,
    });
  } catch (error) {
    console.error("Get team error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve team",
    });
  }
};

// POST /api/teams/:teamId/members
export const addTeamMember = async (req, res) => {
  try {
    const { userId, role = "member" } = req.body ?? {};

    if (!req.team?._id) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (
      typeof userId !== "string" ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid userId is required",
      });
    }

    // Only lead/member roles can be assigned through this endpoint.
    if (!["lead", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be lead or member",
      });
    }

    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "Active user not found",
      });
    }

    const alreadyMember = req.team.members.some(
      (member) => member.user.toString() === userId
    );

    if (alreadyMember) {
      return res.status(409).json({
        success: false,
        message: "User is already a team member",
      });
    }

    req.team.members.push({
      user: user._id,
      role,
    });

    await req.team.save();

    const updatedTeam = await Team.findById(req.team._id)
      .populate("createdBy", "name email")
      .populate("members.user", "name email");

    return res.status(200).json({
      success: true,
      message: "Team member added successfully",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("Add team member error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add team member",
    });
  }
};
