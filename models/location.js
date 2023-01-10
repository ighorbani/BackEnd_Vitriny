const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const locationSchema = new Schema(
  {
    province: { type: String, required: false },
    cities: [
      {
        title: { type: String, required: false },
        _id: { type: Schema.Types.ObjectId, required: false },
      },
    ],
  },

  { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);
