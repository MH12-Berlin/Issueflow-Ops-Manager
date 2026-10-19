
import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import Comment from "../models/Comment.js";
import { recordActivity } from "../services/activityService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_COMMENT_LENGTH = 5000;

function getPagination(query = {}) {
  const page = Number(query.page ?? DEFAULT_PAGE);
  const limit = Number(query.limit ?? DEFAULT_LIMIT);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT
  ) {
    return null;
  }

  return { page, limit };
}

// GET /api/issues/:issueId/activity
export const getIssueActivity = async (req, res) => {
  try {
    if (!req.issue?._id) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const pagination = getPagination(req.query);

    if (!pagination) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    const { page, limit } = pagination;
    const filter = { issue: req.issue._id };

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate("actor", "name email")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Activity.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Activity history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve activity history",
    });
  }
};

// GET /api/issues/:issueId/comments
export const listComments = async (req, res) => {
  try {
    if (!req.issue?._id) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const pagination = getPagination(req.query);

    if (!pagination) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    const { page, limit } = pagination;
    const filter = { issue: req.issue._id };

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate("author", "name email")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Comment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Comment listing error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve comments",
    });
  }
};

// POST /api/issues/:issueId/comments
export const addComment = async (req, res) => {
  let session;

  try {
    const body = req.body?.body;

    if (typeof body !== "string") {
      return res.status(400).json({
        success: false,
        message: "Comment body is required",
      });
    }

    const normalizedBody = body.trim();

    if (
      normalizedBody.length < 1 ||
      normalizedBody.length > MAX_COMMENT_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message: "Comment must contain 1-5000 characters",
      });
    }

    if (!req.issue?._id) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    session = await mongoose.startSession();

    let createdCommentId;

    try {
      await session.withTransaction(async () => {
        const [comment] = await Comment.create(
          [
            {
              issue: req.issue._id,
              author: req.user.id,
              body: normalizedBody,
            },
          ],
          { session }
        );

        if (!comment) {
          throw new Error("Comment creation failed");
        }

        await recordActivity(
          {
            issue: req.issue._id,
            actor: req.user.id,
            action: "commented",
            changes: {
              commentId: comment._id.toString(),
            },
          },
          session
        );

        createdCommentId = comment._id;
      });
    } finally {
      await session.endSession();
      session = null;
    }

    if (!createdCommentId) {
      throw new Error("Transaction completed without creating a comment");
    }

    const populatedComment = await Comment.findById(createdCommentId)
      .populate("author", "name email");

    if (!populatedComment) {
      throw new Error("Created comment could not be retrieved");
    }

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Add comment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add comment",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
