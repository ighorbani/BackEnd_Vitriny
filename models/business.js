const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const businessSchema = new Schema(
  {
    deleted: { type: Boolean, required: false },
    banned: { type: Boolean, required: false },
    stopped: { type: Boolean, required: false },

    creator: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },

    phoneNumbers: [
      {
        number: { type: String, required: false },
      },
    ],

    socials: [
      {
        type: { type: String, required: false },
        link: { type: String, required: false },
      },
    ],

    commentIds: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "Comment",
      },
    ],


    features: [
      {
        title: { type: String, required: false },
        value: { type: String, required: false },
        icon: { type: String, required: false },
        type: { type: String, required: false },
      },
    ],

    inCategoryId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Category",
    },

    review: {
      sentForReview: { type: Boolean, required: false },
      sentTime: { type: Date, required: false },
      reviewItems: [
        {
          type: { type: String, required: false },
          id: {
            type: Schema.Types.ObjectId,
            required: false,
          },
        },
      ],
      hasAdminMessage: { type: Boolean, required: false },
      modalHtml: { type: String, required: false },
      bannerInfo: { type: String, required: false },
      messageType: { type: String, required: false },
    },

    financialInformation: {
      fullName: { type: String, required: false },
      birthDate: { type: String, required: false },
      address: { type: String, required: false },
      description: { type: String, required: false },
      certificatePic: { type: String, required: false },
      identificationPic: { type: String, required: false },
      evidencePic: { type: String, required: false },
      accepted: { type: Boolean, required: false },
      sentForReview: { type: Boolean, required: false },
      hasAdminMessage: { type: Boolean, required: false },
      modalHtml: { type: String, required: false },
    },

    businessInfo: {
      slug: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: false },
      indexImage: { type: String, required: false },
      businessModel: { type: String, required: true },
      showFeatureType: { type: String, required: false },
      region: { type: String, required: false },
      cityName: { type: String, required: false },
      cityId: { type: String, required: false },
      web: { type: String, required: false },
      address: { type: String, required: false },
      googleLoc: { type: Array, required: false },
      premium: { type: Boolean, required: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Business", businessSchema);
