const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminSchema = new Schema(
  {
    adminInfo: {
      name: { type: String, required: false },
      number: { type: String, required: true },
      verifyKey: { type: String, required: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
