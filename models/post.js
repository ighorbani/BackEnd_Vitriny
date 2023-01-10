const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },
    postInfo: {
      name: { type: String, required: false },
      featureImage: { type: String, required: false },
      sound: { type: String, required: false },
      description: { type: String, required: false },
      advertised: { type: Boolean, required: false },
    },
    // postTags: [{ type: String, required: false }],
    commentIds: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
