
import mongoose from "mongoose";
import Issue from "../models/Issue.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import { recordActivity } from "../services/activityService.js";

const ISSUE_TYPES = ["bug", "task", "feature"];
const ISSUE_PRIORITIES = ["low", "medium", "high", "critical"];
const ISSUE_STATUSES = ["open", "in_progress", "blocked", "resolved"];

const populateIssue = (query) =>
  query
    .populate("reporter", "name email")
    .populate("assignee", "name email")
    .populate("project", "name key")
    .populate("team", "name");

const isValidText = (value, min, max) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.trim().length <= max;

const validateAssignee = async (assignee, team) => {
  if (assignee === null) return { valid: true };

  if (
    typeof assignee !== "string" ||
    !mongoose.isValidObjectId(assignee)
  ) {
    return { valid: false, message: "Invalid assignee ID" };
  }

  const isMember = team?.members?.some(
    (member) => member.user?.toString() === assignee
  );

  if (!isMember) {
    return {
      valid: false,
      message: "Assignee must be an active team member",
    };
  }

  const activeUser = await User.findOne({
    _id: assignee,
    isActive: true,
  });

  if (!activeUser) {
    return {
      valid: false,
      message: "Assignee must be an active team member",
    };
  }

  return { valid: true };
};

const endSession = async (session) => {
  if (session) {
    await session.endSession();
  }
};

// POST /api/projects/:projectId/issues
export const createIssue = async (req, res) => {
  let session;

  try {
    const {
      title,
      description = "",
      type = "task",
      priority = "medium",
      assignee = null,
    } = req.body ?? {};

    if (
      typeof title !== "string" ||
      typeof description !== "string" ||
      typeof type !== "string" ||
      typeof priority !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue fields",
      });
    }

    if (!isValidText(title, 3, 150)) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 3 and 150 characters",
      });
    }

    if (description.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 5000 characters",
      });
    }

    if (!ISSUE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue type",
      });
    }

    if (!ISSUE_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue priority",
      });
    }

    if (!req.project?._id || !req.user?.id || !req.team) {
      return res.status(400).json({
        success: false,
        message: "Project, team, and user context are required",
      });
    }

    const assigneeValidation = await validateAssignee(
      assignee,
      req.team
    );

    if (!assigneeValidation.valid) {
      return res.status(400).json({
        success: false,
        message: assigneeValidation.message,
      });
    }

    session = await mongoose.startSession();

    let createdIssueId;

    try {
      await session.withTransaction(async () => {
        const project = await Project.findOneAndUpdate(
          {
            _id: req.project._id,
            status: "active",
          },
          {
            $inc: { issueCounter: 1 },
          },
          {
            new: true,
            runValidators: true,
            session,
          }
        );

        if (!project) {
          const error = new Error(
            "Cannot create issues in an inactive project"
          );
          error.statusCode = 409;
          throw error;
        }

        const number = project.issueCounter;

        const [issue] = await Issue.create(
          [
            {
              identifier: `${project.key}-${number}`,
              number,
              title: title.trim(),
              description: description.trim(),
              type,
              priority,
              project: project._id,
              team: project.team,
              reporter: req.user.id,
              assignee,
            },
          ],
          { session }
        );

        await recordActivity(
          {
            issue: issue._id,
            actor: req.user.id,
            action: "created",
            changes: {
              identifier: issue.identifier,
              title: issue.title,
              status: issue.status,
              priority: issue.priority,
            },
          },
          session
        );

        createdIssueId = issue._id;
      });
    } catch (error) {
      if (error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    } finally {
      await endSession(session);
      session = null;
    }

    const populatedIssue = await populateIssue(
      Issue.findById(createdIssueId)
    );

    if (!populatedIssue) {
      throw new Error("Created issue could not be retrieved");
    }

    return res.status(201).json({
      success: true,
      message: "Issue created successfully",
      issue: populatedIssue,
    });
  } catch (error) {
    await endSession(session);

    console.error("Create issue error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create issue",
    });
  }
};

// GET /api/projects/:projectId/issues
export const listIssues = async (req, res) => {
  try {
    const {
      status,
      priority,
      type,
      assignee,
      search,
      page = "1",
      limit = "10",
      sort = "newest",
    } = req.query;

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    if (!req.project?._id) {
      return res.status(400).json({
        success: false,
        message: "Project context is required",
      });
    }

    const filter = { project: req.project._id };

    if (status !== undefined) {
      if (!ISSUE_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue status",
        });
      }

      filter.status = status;
    }

    if (priority !== undefined) {
      if (!ISSUE_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue priority",
        });
      }

      filter.priority = priority;
    }

    if (type !== undefined) {
      if (!ISSUE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue type",
        });
      }

      filter.type = type;
    }

    if (assignee !== undefined) {
      if (assignee === "unassigned") {
        filter.assignee = null;
      } else if (mongoose.isValidObjectId(assignee)) {
        filter.assignee = assignee;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid assignee filter",
        });
      }
    }

    if (search !== undefined) {
      if (typeof search !== "string" || search.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Search must be at most 100 characters",
        });
      }

      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      if (escapedSearch) {
        filter.$or = [
          { title: { $regex: escapedSearch, $options: "i" } },
          { description: { $regex: escapedSearch, $options: "i" } },
          { identifier: { $regex: escapedSearch, $options: "i" } },
        ];
      }
    }

    const sortOptions = {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      priority: { priority: -1, createdAt: -1 },
      updated: { updatedAt: -1, _id: -1 },
    };

    if (!Object.hasOwn(sortOptions, sort)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort option",
      });
    }

    const [issues, total] = await Promise.all([
      populateIssue(
        Issue.find(filter)
          .sort(sortOptions[sort])
          .skip((pageNumber - 1) * pageSize)
          .limit(pageSize)
      ),
      Issue.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      issues,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("List issues error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve issues",
    });
  }
};

// GET /api/issues/:issueId
export const getIssue = async (req, res) => {
  try {
    const issue = await populateIssue(
      Issue.findById(req.issue?._id)
    );

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    return res.status(200).json({
      success: true,
      issue,
    });
  } catch (error) {
    console.error("Get issue error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve issue",
    });
  }
};

// PATCH /api/issues/:issueId
export const updateIssue = async (req, res) => {
  let session;

  try {
    const {
      title,
      description,
      type,
      priority,
      status,
      assignee,
    } = req.body ?? {};

    const updates = {};

    if (title !== undefined) {
      if (!isValidText(title, 3, 150)) {
        return res.status(400).json({
          success: false,
          message: "Title must be between 3 and 150 characters",
        });
      }

      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        description.trim().length > 5000
      ) {
        return res.status(400).json({
          success: false,
          message: "Description cannot exceed 5000 characters",
        });
      }

      updates.description = description.trim();
    }

    if (type !== undefined) {
      if (!ISSUE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue type",
        });
      }

      updates.type = type;
    }

    if (priority !== undefined) {
      if (!ISSUE_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue priority",
        });
      }

      updates.priority = priority;
    }

    if (status !== undefined) {
      if (!ISSUE_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid issue status",
        });
      }

      updates.status = status;
    }

    if (assignee !== undefined) {
      if (assignee === null) {
        updates.assignee = null;
      } else {
        const assigneeValidation = await validateAssignee(
          assignee,
          req.team
        );

        if (!assigneeValidation.valid) {
          return res.status(400).json({
            success: false,
            message: assigneeValidation.message,
          });
        }

        updates.assignee = assignee;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update",
      });
    }

    if (!req.issue?._id || !req.user?.id) {
      return res.status(400).json({
        success: false,
        message: "Issue and user context are required",
      });
    }

    session = await mongoose.startSession();

    let updatedIssueId;

    try {
      await session.withTransaction(async () => {
        const issue = await Issue.findById(req.issue._id).session(
          session
        );

        if (!issue) {
          const error = new Error("Issue not found");
          error.statusCode = 404;
          throw error;
        }

        const changes = {};

        for (const [field, newValue] of Object.entries(updates)) {
          const oldValue = issue[field];

          const oldComparable =
            oldValue == null
              ? null
              : oldValue instanceof Date
                ? oldValue.toISOString()
                : String(oldValue);

          const newComparable =
            newValue == null ? null : String(newValue);

          if (oldComparable !== newComparable) {
            changes[field] = {
              from: oldComparable,
              to: newComparable,
            };

            issue[field] = newValue;
          }
        }

        if (changes.status) {
          const oldResolvedAt = issue.resolvedAt;

          issue.resolvedAt =
            issue.status === "resolved" ? new Date() : null;

          changes.resolvedAt = {
            from: oldResolvedAt ? oldResolvedAt.toISOString() : null,
            to: issue.resolvedAt ? issue.resolvedAt.toISOString() : null,
          };
        }

        if (Object.keys(changes).length === 0) {
          updatedIssueId = issue._id;
          return;
        }

        await issue.save({ session });

        let action = "updated";

        if (changes.status) {
          action = "status_changed";
        } else if (changes.priority) {
          action = "priority_changed";
        } else if (changes.assignee) {
          action = "assigned";
        }

        await recordActivity(
          {
            issue: issue._id,
            actor: req.user.id,
            action,
            changes,
          },
          session
        );

        updatedIssueId = issue._id;
      });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    } finally {
      await endSession(session);
      session = null;
    }

    const populatedIssue = await populateIssue(
      Issue.findById(updatedIssueId)
    );

    if (!populatedIssue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      issue: populatedIssue,
    });
  } catch (error) {
    await endSession(session);

    console.error("Update issue error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update issue",
    });
  }
};
