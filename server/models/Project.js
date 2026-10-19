
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 10,
      match: /^[A-Z][A-Z0-9]*$/,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      immutable: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },

    issueCounter: {
      type: Number,
      default: 0,
      min: 0,
    },


    archivedAt: {
      type: Date,
      default: null,
    },

  },
  { timestamps: true }
);

// A project key must be unique within its team.
projectSchema.index({ team: 1, key: 1 }, { unique: true });
projectSchema.index({ team: 1, status: 1, createdAt: -1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
