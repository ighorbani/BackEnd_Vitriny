const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    productInfo: {
      name: { type: String, required: false },
      presentType: { type: String, required: false },
      featureImage: { type: String, required: false },
      description: { type: String, required: false },
      caption: { type: String, required: false },
      delivery: { type: String, required: false },
      price: { type: String, required: false },
      priceType: { type: String, required: false },
      discountPrice: { type: String, required: false },
      productFeature: { type: String, required: false },
      discountAmount: { type: String, required: false },
      discounted: { type: Boolean, required: false },
    },
    // productTags: [{ type: String, required: false }],
    forBusinessId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Business",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
