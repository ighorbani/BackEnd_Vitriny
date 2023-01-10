const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const invoiceSchema = new Schema(
  {
    invoiceInfo: {
      number: { type: Number, required: false },
      totalPrice: { type: Number, required: false },
      date: { type: String, required: false },
      payed: { type: Boolean, required: false },

    },
    items: [
      {
        name: { type: String, required: false },
        price: { type: Number, required: false },
        unit: { type: String, required: false },
        description: { type: String, required: false },
      },
    ],
    fromBusiness: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Business",
    },
    forUser: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
