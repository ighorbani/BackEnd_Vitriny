const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatSchema = new Schema(
  {
    banned: { type: Boolean, required: false },

    participants: [
      {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
    ],
    chatDeletingUser: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "User",
      },
    ],

    blocking: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "User",
      },
    ],

    messages: [
      {
        message: { type: String, required: false },
        isImage: { type: Boolean, required: false },
        deletingUser: [
          {
            type: Schema.Types.ObjectId,
            required: false,
            ref: "User",
          },
        ],
        fromUser: {
          type: Schema.Types.ObjectId,
          required: false,
          ref: "User",
        },
        time: { type: Date, required: false },
        hasSeen: [
          {
            type: Schema.Types.ObjectId,
            required: false,
            ref: "User",
          },
        ],
        label: { type: String, required: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
