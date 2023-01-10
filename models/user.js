const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    deleted: { type: Boolean, required: false },
    banned: { type: Boolean, required: false },
    stopped: { type: Boolean, required: false },

    userInfo: {
      name: { type: String, required: false },
      slug: { type: String, required: false },
      aboutMe: { type: String, required: false },
      pic: { type: String, required: false },
      googleLoc: { type: String, required: false },
      number: { type: String, required: true },
      verifyKey: { type: String, required: false },
    },
    settings: {
      soundActive: { type: Boolean, required: false },
      pagePrivacy: { type: String, required: false },
      favoriteTopics: [{ type: String, required: false }],
      seen: { weAreIndependent: false },
    },

    socials: [
      {
        type: { type: String, required: false },
        link: { type: String, required: false },
      },
    ],

    seenedStories: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "Story",
      },
    ],

    seenedPosts: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "Post",
      },
    ],

    likedStories: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "Story",
      },
    ],

    likedProducts: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "Product",
      },
    ],

    likedPosts: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "Post",
      },
    ],

    followedBusinesses: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "Business",
      },
    ],

    followingUsers: [
      {
        type: Schema.Types.ObjectId,
        required: false,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
