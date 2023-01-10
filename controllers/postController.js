const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const Post = require("../models/post");
const mongoose = require("mongoose");
const Business = require("../models/business");
const User = require("../models/user");
const Product = require("../models/product");

// RETURN POSTS OF A SPECIFIC BUSINESS
exports.businessPosts = (req, res, next) => {
  const businessId = req.params.businessId;
  const currentPage = req.params.currentPage || 1;
  const perPage = 6;

  Post.find({ forBusinessId: businessId })
    .populate("forBusinessId")
    // .skip((currentPage - 1) * perPage)
    .limit((currentPage - 1) * perPage + perPage)
    .then((posts) => {
      res.status(200).json({
        posts: posts,
        state: "Ok",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// SHUFFLE HELPER FUNCTION
function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

// A HELPER FUNCTION TO FETCH HOME PAGE POSTS
async function fetchHomePagePosts(userLocationId, userId) {
  let businessesIdsArray = [];
  try {
    if (userId) {
      const userObject = await User.findById(mongoose.Types.ObjectId(userId));
      businessesIdsArray = userObject.followedBusinesses;
    }

    const areaBusinesses = await Business.find({
      "businessInfo.cityId": userLocationId,
    });

    const areaBusinessesIds = areaBusinesses.map((business) => {
      return business._id;
    });

    businessesIdsArray = [...areaBusinessesIds];

    let posts = await Post.find({
      "postInfo.featureImage": { $ne: null },
      forBusinessId: { $in: businessesIdsArray },
    })
      .populate("forBusinessId", "businessInfo creator")
      .limit(15);

    shuffle(posts);

    return posts;
  } catch (err) {
    console.log("error");
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
}

// RETURN POSTS BASED ON USER CITY FOR HOME PAGE
exports.getPosts = async (req, res, next) => {
  const userLocation = req.body.userLocation;
  const userId = req.body.userId || null;
  const seenedPostsIds = req.body.seenedPosts || [];

  try {
    let fetchedPosts = await fetchHomePagePosts(userLocation.id, userId);

    fetchedPosts = fetchedPosts.filter((p) => {
      if (!seenedPostsIds.includes(p._id.toString())) {
        return true;
      }
    });

    fetchedPosts = fetchedPosts.slice(0, 3);
    res.status(200).json({
      posts: fetchedPosts,
      state: "Ok",
    });
  } catch (err) {
    console.log("error");
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
};

// CREATE POST FOR A BUSINESS
exports.createPost = async (req, res, next) => {
  const userId = req.userId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  if (!req.files.image) {
    return res.status(422).json({
      state: "Error",
      errors: [
        {
          msg: "لطفا برای ایجاد پست، تصویر انتخاب کنید.",
          param: "image",
          location: "body",
        },
      ],
    });
  }

  const name = req.body.name;
  const description = req.body.description;
  const hasImage = req.body.hasImage;
  const hasSound = req.body.hasSound;
  // const tags = req.body.tags;

  // let postTags = tags.split("#");
  // postTags = postTags.filter(function (el) {
  //   return el != "";
  // });

  let featureImage = "";
  if (hasImage === "true") {
    featureImage = req.files.image[0].filename;

    let uploadedImage = path.join(
      __dirname,
      "../",
      "uploads",
      "post",
      req.files.image[0].filename
    );

    sharp(req.files.image[0].path)
      .resize({ width: 1000 })
      .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
      .toFile(uploadedImage);
  }

  let sound = "";
  if (hasSound === "true") {
    sound = req.files.sound[0].filename;
  }

  const post = new Post({
    creator: userId,
    postInfo: {
      name: name,
      description: description,
      featureImage: featureImage,
      sound: sound,
    },
    // postTags: postTags,
  });

  post
    .save()
    .then((result) => {
      res.status(201).json({
        post: result,
        state: "Ok",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// EDIT SPECIFIC POST
exports.editPost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const name = req.body.name;
  const description = req.body.description || "";
  const hasImage = req.body.hasImage;
  const hasSound = req.body.hasSound;
  // const tags = req.body.tags || "";

  // let postTags = tags.split("#");
  // postTags = postTags.filter(function (el) {
  //   return el != "";
  // });

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Can't find Post");
        error.statusCode = 404;
        throw error;
      }

      if (post.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      let featureImage = post.postInfo.featureImage;
      if (hasImage === "true") {
        if (featureImage !== "") {
          clearImage(featureImage);
        }
        featureImage = req.files.image[0].filename;

        let uploadedImage = path.join(
          __dirname,
          "../",
          "uploads",
          "post",
          req.files.image[0].filename
        );

        sharp(req.files.image[0].path)
          .resize({ width: 1000 })
          .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
          .toFile(uploadedImage);
      } else if (hasImage === "false") {
        // if (featureImage !== "") {
        //   clearImage(featureImage);
        // }
        // featureImage = "";
      }

      let sound = post.postInfo.sound;

      if (hasSound === "true") {
        if (sound !== "") {
          clearSound(sound);
        }
        sound = req.files.sound[0].filename;
      } else if (hasSound === "false") {
        if (sound !== "") {
          clearSound(sound);
        }
        sound = "";
      }

      post.postInfo.name = name || post.postInfo.name;
      post.postInfo.description = description;
      post.postInfo.featureImage = featureImage;
      // post.postTags = postTags;
      post.postInfo.sound = sound;

      return post.save();
    })
    .then((result) => {
      res.status(200).json({
        post: result,
        state: "Ok",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN INFORMATION OF A SPECIFIC POST
exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Can't find Post");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ post: post });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// DELETE A SPECIFIC POST
exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.userId;

  try {
    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      const error = new Error("Can't find Post");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== userId.toString()) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }

    await post.remove();
    res.status(200).json({
      state: "Deleted",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CLEAR OLD IMAGE OF POST
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", "uploads", "post", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

// CLEAR OLD SOUND OF POST
const clearSound = (filePath) => {
  filePath = path.join(__dirname, "..", "uploads", "sounds", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
