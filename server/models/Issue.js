
import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
    },

    number: {
      type: Number,
      required: true,
      min: 1,
    },

    title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    type: {
      type: String,
      enum: ["bug", "task", "feature"],
      default: "task",
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      immutable: true,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      immutable: true,
    },

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "blocked", "resolved"],
      default: "open",
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Issue numbers are unique within each project.
issueSchema.index(
  { project: 1, number: 1 },
  { unique: true }
);

issueSchema.index({ project: 1, status: 1, createdAt: -1 });
issueSchema.index({ project: 1, priority: 1 });
issueSchema.index({ team: 1, assignee: 1, status: 1 });

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;
