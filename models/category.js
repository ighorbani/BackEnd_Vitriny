const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema(
  {
    title: { type: String, required: false },
    slug: { type: String, required: false },
    parent: { type: String, required: false },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);

