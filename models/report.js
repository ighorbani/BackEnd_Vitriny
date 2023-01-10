const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reportSchema = new Schema(
  {
    reportIfno: {
      reportedName: { type: String, required: false },
      description: { type: String, required: false },
      type: { type: String, required: false },
      label: { type: String, required: false },
    },

    creator: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },

    reportedUserId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },

    reportedProductId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Product",
    },

    reportedBusinessId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Business",
    },

    reportedChatId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Chat",
    },

    reportedStoryId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Story",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
