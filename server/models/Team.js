
import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "lead", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [membershipSchema],
      validate: {
        validator(members) {
          const userIds = members.map((member) =>
            member.user.toString()
          );
          return new Set(userIds).size === userIds.length;
        },
        message: "A user cannot be added to a team twice",
      },
    },
  },
  { timestamps: true }
);

teamSchema.index({ "members.user": 1 });

const Team = mongoose.model("Team", teamSchema);

export default Team;
