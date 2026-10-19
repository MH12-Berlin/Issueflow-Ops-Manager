
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      immutable: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    body: {
      type: String,
      required: [true, "Comment cannot be empty"],
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
  },
  { timestamps: true }
);

commentSchema.index({ issue: 1, createdAt: -1, _id: -1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
