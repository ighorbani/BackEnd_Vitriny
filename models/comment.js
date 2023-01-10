const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },

    commentInfo: {
      date: { type: Date, required: false },
      comment: { type: String, required: false },
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
