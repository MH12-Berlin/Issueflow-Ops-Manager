
import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      immutable: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    action: {
      type: String,
      enum: [
        "created",
        "updated",
        "assigned",
        "priority_changed",
        "status_changed",
        "commented",
      ],
      required: true,
      immutable: true,
    },

    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      immutable: true,
    },
  },
  { timestamps: true }
);

activitySchema.index({ issue: 1, createdAt: -1, _id: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
