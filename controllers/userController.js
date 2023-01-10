const sharp = require("sharp");
const fs = require("fs");
const express = require("express");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const Business = require("../models/business");
const Post = require("../models/post");
const Category = require("../models/category");
const Product = require("../models/product");
const mongoose = require("mongoose");
const sendSms = require("../helpers/send-sms").sendSms;
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");
const { create } = require("domain");
dotenv.config({ path: path.join(__dirname, "../", ".env") });
const getMP3Duration = require("get-mp3-duration");

// RETURN ALL USERS
exports.getUsers = (req, res, next) => {
  User.find()
    .then((users) => {
      res.status(200).json({
        users: users,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN INFORMATION OF A SPECIFIC USER
exports.getUser = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      res.status(200).json({
        user: user,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN SETTINGS OF USER
exports.getSettings = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      res.status(200).json({
        settings: user.settings || {},
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// LOGIN FIRST STEP: NUMBER
exports.loginNumber = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const number = req.body.number;
  let verifyKey = Math.floor(1000 + Math.random() * 9000).toString();
  if (verifyKey.length !== 6) {
    verifyKey = Math.floor(1000 + Math.random() * 9000).toString();
  }

  User.findOne({ "userInfo.number": number })
    .then((user) => {
      sendSms(verifyKey + "\n" + "کد ثبت نام شما در ویترینی", number);
      if (!user) {
        const newUser = new User({
          userInfo: {
            number: number,
            verifyKey: verifyKey,
          },
        });
        newUser.save().then((result) => {
          res.status(201).json({
            state: "Ok",
          });
        });
      } else {
        user.userInfo.verifyKey = verifyKey;
        user.save().then((result) => {
          res.status(200).json({
            state: "Ok",
          });
        });
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// LOGIN SECOND STEP: VERIFICATION
exports.loginVerification = (req, res, next) => {
  const verifyCode = req.body.verifyCode;
  const number = req.body.number;
  User.findOne({ "userInfo.number": number })
    .then((user) => {
      const business = {};
      if (user.userInfo.verifyKey === verifyCode) {
        if (user.userInfo.name) {
          Business.findOne({ creator: user._id })
            .then((business) => {
              business = business;
            })
            .catch((err) => {
              if (!err.statusCode) {
                err.statusCode = 500;
              }
              next(err);
            });
          user.userInfo.verifyKey = "";
          user.save().then((result) => {
            const token = jwt.sign(
              { number: number, userId: user._id.toString() },
              process.env.ACCESS_TOKEN_SECRET,
              { expiresIn: process.env.ACCESS_TOKEN_LIFE }
            );
            res.status(200).json({
              user: result,
              token: token,
              business: business,
              state: "Exists",
            });
            next();
          });
        } else {
          res.status(200).json({
            user: user,
            state: "Not Registered",
          });
          next();
        }
      } else {
        res.status(200).json({
          state: "falseCode",
        });
        next();
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// HELPS TO GENERATE RANDOM ID FOR USER
function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// USER SIGN UP STEP
exports.loginRegister = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }
  const sampleSlug = makeid(10);
  const verifyKey = req.body.verifyCode;
  const number = req.body.number;
  const name = req.body.name;
  const hasImage = req.body.hasImage;
  let pic = "";
  if (hasImage === "true") {
    pic = req.files.image[0].filename;

    let uploadedImage = path.join(
      __dirname,
      "../",
      "uploads",
      "user",
      req.files.image[0].filename
    );

    sharp(req.files.image[0].path)
      .resize({ width: 1000 })
      .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
      .toFile(uploadedImage);
  } else {
    pic = "default-user-pic.png";
  }

  User.findOne({ "userInfo.number": number, "userInfo.verifyKey": verifyKey })
    .then((user) => {
      user.userInfo.name = name;
      user.userInfo.verifyKey = "";
      user.userInfo.pic = pic;
      user.userInfo.slug = sampleSlug;
      user.save().then((result) => {
        const token = jwt.sign(
          {
            number: number,
            userId: result._id,
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: process.env.ACCESS_TOKEN_LIFE }
        );

        res.status(200).json({
          user: result,
          token: token,
          state: "Ok",
        });
        next();
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// SEND AGAIN VERIFICATION CODE
exports.sendVerificationCodeAgain = (req, res, next) => {
  const number = req.body.number;
  let verifyKey = Math.floor(1000 + Math.random() * 9000).toString();
  if (verifyKey.length !== 6) {
    verifyKey = Math.floor(1000 + Math.random() * 9000).toString();
  }

  User.findOne({ "userInfo.number": number }).then((user) => {
    sendSms(verifyKey + "\n" + "کد ثبت نام شما در ویترینی", number);
    user.userInfo.verifyKey = verifyKey;
    user.save().then((result) => {
      res.status(200).json({
        state: "Sent Again",
      });
    });
  });
};

//RETURN USER ADMIN PAGE IFNO
exports.getUserAdmin = async (req, res, next) => {
  const userId = req.userId;
  try {
    const user = await User.findById(mongoose.Types.ObjectId(userId));

    let posts = await Post.find({
      creator: mongoose.Types.ObjectId(userId),
    })
      .sort("-createdAt")
      .populate({
        path: "commentIds",
      });

    const activateStates = {
      deleted: user?.deleted || false,
      banned: user?.banned || false,
      stopped: user?.stopped || false,
    };

    const followersCount = await User.countDocuments({
      followingUsers: { $in: user._id },
    });

    const postsCount = await Post.countDocuments({
      creator: user._id,
    });

    const result = {
      userInfo: {
        name: user?.userInfo.name || "",
        slug: user?.userInfo.slug || "",
        aboutMe: user?.userInfo.aboutMe || "درباره خود بنوسید...",
        pic: user?.userInfo.pic || "",
        id: user?._id,
      },
      socials: user?.socials,
      pagePrivacy: user?.settingspagePrivacy || "public",
      activateStates: activateStates,
      posts: posts,
      postsCount: postsCount,
      followersCount: followersCount,
      hasStory: false,
    };

    res.status(200).json({
      result: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//RETURN SOUND DURATION
exports.getSoundLength = async (req, res, next) => {
  const soundName = req.params.soundName;

  try {
    const buffer = fs.readFileSync(
      path.join(__dirname, "..", "uploads", "sounds", soundName)
    );

    const duration = getMP3Duration(buffer);

    const soundTotalDuration = convertMsToMinutesSeconds(duration);
    const soundLength = convertMsToSeconds(duration);

    const result = {
      soundTotalDuration: soundTotalDuration,
      soundLength: soundLength,
    };

    res.status(200).json({
      result: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// DEACTIVATE USER PAGE
exports.deactivateUserPage = (req, res, next) => {
  const userId = req.userId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const deactivateState = req.body.deactivateState;

  User.findById(mongoose.Types.ObjectId(userId))
    .then((user) => {
      if (!user) {
        const error = new Error("Can't find User");
        error.statusCode = 404;
        throw error;
      }

      user.stopped = deactivateState;

      return user.save();
    })
    .then((result) => {
      res.status(200).json({
        deactivated: deactivateState,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//RETURN USER VIEW PAGE IFNO
exports.getUserView = async (req, res, next) => {
  const slug = req.params.slug;

  try {
    const user = await User.findOne({
      "userInfo.slug": slug,
    });

    const posts = await Post.find({
      creator: user._id,
    })
      .sort("-createdAt")
      .populate({
        path: "commentIds",
      });

    const postsCount = await Post.countDocuments({
      creator: user._id,
    });

    const activateStates = {
      deleted: user?.deleted || false,
      banned: user?.banned || false,
      stopped: user?.stopped || false,
    };

    const followersCount = await User.countDocuments({
      followingUsers: { $in: user._id },
    });

    const result = {
      userInfo: {
        name: user?.userInfo.name || "",
        slug: user?.userInfo.slug || "",
        aboutMe: user?.userInfo.aboutMe || "",
        pic: user?.userInfo.pic || "",
        id: user?._id,
      },
      socials: user?.socials,
      activateStates: activateStates,
      pagePrivacy: user?.settingspagePrivacy || "public",
      posts: posts,
      followersCount: followersCount,
      postsCount: postsCount,
      hasStory: false,
    };

    let HideUserPage = false;
    if (user) {
      if (user.stopped || user.deleted || user.banned) {
        HideUserPage = true;
      }
    }

    if (HideUserPage) {
      res.status(200).json({
        state: "UserHided",
      });
    } else {
      res.status(200).json({
        result: result,
        state: "Ok",
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//RETURN MY FOLLOWERS OR FOLLOWINGS
exports.getMyFollows = async (req, res, next) => {
  const followState = req.params.followState || "followers";
  const userId = req.userId;
  let followers = [];
  let result = [];

  try {
    if (followState === "followers") {
      followers = await User.find({
        followingUsers: { $in: mongoose.Types.ObjectId(userId) },
      });

      followers.map((user) => {
        result.push({
          name: user?.userInfo.name,
          slug: user?.userInfo.slug,
          image: user?.userInfo.pic,
        });
      });

      res.status(200).json({
        follows: result,
        state: "Ok",
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//RETURN FOLLOWERS OR FOLLOWINGS OF A USER
exports.getUserFollows = async (req, res, next) => {
  const followState = req.params.followState || "followers";
  const userId = req.params.userId;
  let followers = [];
  let result = [];

  try {
    if (followState === "followers") {
      followers = await User.find({
        followingUsers: { $in: mongoose.Types.ObjectId(userId) },
      });

      followers.map((user) => {
        result.push({
          name: user?.userInfo.name,
          slug: user?.userInfo.slug,
          image: user?.userInfo.pic,
        });
      });

      res.status(200).json({
        follows: result,
        state: "Ok",
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//ADD SOCIAL NETWORK TO USER
exports.addSocial = (req, res, next) => {
  const userId = req.userId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const link = req.body.link;
  const type = req.body.type;

  User.findById(mongoose.Types.ObjectId(userId))
    .then((user) => {
      if (!user) {
        const error = new Error("Can't find User");
        error.statusCode = 404;
        throw error;
      }

      const newSocial = {
        link: link,
        type: type,
      };

      user.socials.push(newSocial);
      return user.save();
    })
    .then((result) => {
      res.status(200).json({
        result: result,
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

//EDIT USER SOCIAL NETWORK
exports.editSocial = (req, res, next) => {
  const userId = req.userId;
  const socialId = req.params.socialId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const link = req.body.link;
  const type = req.body.type;

  User.findById(mongoose.Types.ObjectId(userId))
    .then((user) => {
      user.socials.map((social) => {
        if (social._id.toString() === socialId) {
          social.link = link;
          social.type = type;
        }
      });

      return user.save();
    })
    .then((result) => {
      res.status(200).json({
        result: result,
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

//DELETE USER SOCIAL NETWORK
exports.deleteSocial = async (req, res, next) => {
  const userId = req.userId;
  const socialId = req.params.socialId;

  try {
    const user = await User.findById(mongoose.Types.ObjectId(userId));
    const newSocials = user.socials.filter((social) => {
      if (social._id.toString() !== socialId) {
        return true;
      }
    });
    user.socials = newSocials;
    await user.save();
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

// RETURN USER SOCIAL NETWORK INFO
exports.getSocial = (req, res, next) => {
  const socialId = req.params.socialId;

  User.findOne({ "socials._id": { $in: socialId } })
    .then((user) => {
      const givenSocail = user.socials.find(
        (social) => social._id.toString() === socialId
      );

      res.status(200).json({
        type: givenSocail.type,
        link: givenSocail.link,
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

// EDIT SPECIFIC USER INFO
exports.editUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  let userId = req.userId;
  const name = req.body.name;
  const aboutMe = req.body.description;
  const pagePrivacy = req.body.pagePrivacy;
  const slug = req.body.slug.toLowerCase();
  const hasImage = req.body.hasImage;

  try {
    const user = await User.findById(mongoose.Types.ObjectId(userId));
    if (!user) {
      const error = new Error("Can't find User");
      error.statusCode = 404;
      throw error;
    }

    if (user.userInfo.slug !== slug) {
      availableUserSlug = await User.findOne({
        "userInfo.slug": slug,
      });

      if (availableUserSlug) {
        return res.status(422).json({
          state: "Error",
          errors: [
            {
              value: slug,
              msg: "این اسلاگ قبلا گرفته شده است!",
              param: "slug",
              location: "body",
            },
          ],
        });
      }
    }

    let pic = user.userInfo.pic;

    if (hasImage === "true") {
      if (pic !== "" && pic !== "default-user-pic.png") {
        clearImage(pic);
      }
      pic = req.files.image[0].filename;

      let uploadedImage = path.join(
        __dirname,
        "../",
        "uploads",
        "user",
        req.files.image[0].filename
      );

      sharp(req.files.image[0].path)
        .resize({ width: 1000 })
        .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
        .toFile(uploadedImage);
    } else if (hasImage === "false") {
      if (pic !== "" && pic !== "default-user-pic.png") {
        clearImage(pic);
      }
      pic = "default-user-pic.png";
    }

    user.userInfo.name = name || user.userInfo.name;
    user.settings.pagePrivacy = pagePrivacy || user.settings.pagePrivacy;
    user.userInfo.aboutMe = aboutMe;
    user.userInfo.slug = slug || user.userInfo.slug;
    user.userInfo.pic = pic;

    let result = await user.save();
    result = {
      name: result.userInfo.name,
      pic: result.userInfo.pic,
      slug: result.userInfo.slug,
      aboutMe: result.userInfo.aboutMe,
    };

    res.status(200).json({
      state: "Ok",
      user: result,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CLEAR OLD IMAGE OF USER
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", "uploads", "user", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

// USER CALLL TO ACTIONS: LIKE AND FOLLOW
exports.userCTA = (req, res, next) => {
  const userId = req.userId;
  const value = req.body.value;
  const type = req.body.type;
  const id = req.body.id;

  User.findById(userId)
    .then((user) => {
      if (!user) {
        const error = new Error("Can't find User");
        error.statusCode = 404;
        throw error;
      }

      switch (type) {
        case "story":
          if (value) {
            let newLikedStories = user.likedStories.filter(
              (likedStory) => likedStory.toString() !== id
            );
            user.likedStories = newLikedStories;
          } else {
            user.likedStories.push(id);
          }
          break;

        case "product":
          if (value) {
            user.likedProducts.push(id);
          } else {
            let newLikedProducts = user.likedProducts.filter(
              (likedProduct) => likedProduct.toString() !== id
            );
            user.likedProducts = newLikedProducts;
          }
          break;

        case "post":
          if (value) {
            user.likedPosts.push(id);
          } else {
            let newLikedPosts = user.likedPosts.filter(
              (likedPost) => likedPost.toString() !== id
            );
            user.likedPosts = newLikedPosts;
          }
          break;

        case "business":
          if (value) {
            let newFollowedBusinesses = user.followedBusinesses.filter(
              (followedBusiness) => followedBusiness?.toString() !== id
            );
            user.followedBusinesses = newFollowedBusinesses;
          } else {
            user.followedBusinesses.push(id);
          }
          break;

        case "user":
          if (value) {
            let newFollowingUsers = user.followingUsers.filter(
              (followingUser) => followingUser?.toString() !== id
            );
            user.followingUsers = newFollowingUsers;
          } else {
            user.followingUsers.push(id);
          }
          break;
      }
      return user.save();
    })
    .then((result) => {
      res.status(200).json({
        result: { value: value, type: type, id: id },
        state: "Ok",
        userResult: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// USER MANAGE FOLLOWERS AND FOLLOWINGS
exports.manageFollow = (req, res, next) => {
  const userId = req.userId;
  const action = req.body.action;
  const slug = req.body.slug;

  User.findOne({ "userInfo.slug": slug })
    .then((user) => {
      if (!user) {
        const error = new Error("Can't find User");
        error.statusCode = 404;
        throw error;
      }

      // let thisUserIndex = user.followingUsers.findIndex(
      //   (id) => id === userId.toString()
      // );

      // if (thisUserIndex < 0) {
      //   return res.status(401).json({
      //     state: "Action unAutorized",
      //   });
      // }

      switch (action) {
        case "remove":
          let newFollowingUsers = user.followingUsers.filter(
            (id) => id === userId.toString()
          );
          user.followingUsers = newFollowingUsers;
          break;
      }
      return user.save();
    })
    .then((result) => {
      res.status(200).json({
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

// USER SETTINGS CALL TO ACTIONS
exports.changeSettings = (req, res, next) => {
  const userId = req.userId;
  const parameter = req.body.parameter;
  const value = req.body.value || "";

  User.findById(userId)
    .then((user) => {
      if (!user) {
        const error = new Error("Can't find User");
        error.statusCode = 404;
        throw error;
      }

      switch (parameter) {
        case "weAreIndependent":
          user.settings.seen.weAreIndependent = true;
          break;
      }
      return user.save();
    })
    .then((result) => {
      res.status(200).json({
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

// GET THE BUSINESS OF A SPECIFIC USER
exports.getMyBusiness = (req, res, next) => {
  Business.findOne({
    creator: req.userId,
  })
    .sort("createdAt")
    .exec((err, business) => {
      if (err) {
        if (!err.statusCode) {
          err.statusCode = 500;
        } else {
          next(err);
        }
      }
      res.status(200).json({
        business: business,
        state: "Ok",
      });
    });
};

// GET BUSINESSES AND USERS WHICH A USER FOLLOWS
exports.followedAccounts = async (req, res, next) => {
  let result = [];
  try {
    const user = await User.findById(req.userId).populate(
      "followedBusinesses followingUsers"
    );

    const categoryName = await Category.findById(
      user.followedBusinesses[0].inCategoryId
    );

    const FBsData = user?.followedBusinesses.map((business) => {
      return {
        city: business.businessInfo.cityName,
        title: business.businessInfo.title,
        slug: business.businessInfo.slug,
        inCategory: categoryName.title,
        _id: business._id,
        image: business.businessInfo.indexImage,
        type: "business",
      };
    });

    const FUsData = user?.followingUsers.map((person) => {
      return {
        title: person.userInfo.name,
        slug: person.userInfo.slug,
        _id: person._id,
        image: person.userInfo.pic,
        type: "user",
      };
    });

    result.push(...FUsData);
    result.push(...FBsData);

    res.status(200).json({
      result: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// GET PRODUCTS AND POSTS WHICH A USER HAS LIKED
exports.likedProducts = async (req, res, next) => {
  let result = [];
  let likedProducts = [];
  let likedPosts = [];

  try {
    let user = await User.findById(req.userId).populate("likedProducts");

    likedProducts = user.likedProducts;
    likedPosts = user.likedPosts;

    const productsInfo = await Product.find({
      _id: { $in: likedProducts },
    })
      .sort("-createdAt")
      .populate("forBusinessId");

    if (productsInfo.length !== 0) {
      const FPrsData = productsInfo.map((product) => {
        return {
          city: product.forBusinessId.businessInfo.cityName,
          title: product.productInfo.name,
          businessName: product.forBusinessId.businessInfo.title,
          businessSlug: product.forBusinessId.businessInfo.slug,
          creator: product.forBusinessId.businessInfo.title,
          businessId: product.forBusinessId._id.toString(),
          _id: product._id,
          image: product.productInfo.featureImage,
          type: "product",
          price: product.productInfo.price,
          description: product.productInfo.description,
        };
      });
      result.push(...FPrsData);
    }

    const postsInfo = await Post.find({
      _id: { $in: likedPosts },
    }).populate("creator");

    if (postsInfo.length !== 0) {
      const FPosData = postsInfo.map((post) => {
        return {
          title: post.postInfo.name,
          creatorId: post.creator._id.toString(),
          creatorSlug: post.creator.userInfo.slug,
          creator: post.creator.userInfo.name,
          description: post.postInfo.description,
          image: post.postInfo.featureImage,
          sound: post.postInfo.sound,
          _id: post._id,
          type: "post",
        };
      });
      result.push(...FPosData);
    }

    res.status(200).json({
      result: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// GET PRODUCTS AND POSTS WHICH A USER HAS LIKED
exports.WhatsUp = async (req, res, next) => {
  const userLocation = req.body.userLocation;
  // const userId = req.body.userId || "6373d157b555a76ada12bb83";

  try {
    // let user = await User.findById(mongoose.Types.ObjectId(userId));

    let latestUsers = await User.find().sort("-createdAt").limit(30);

    latestUsers = latestUsers.map((user) => {
      return {
        name: user.userInfo.name,
        slug: user.userInfo.slug,
        pic: user.userInfo.pic,
      };
    });

    latestUsers = latestUsers.filter((user) => {
      if (user.name === undefined || user.name === "undefined") {
        return false;
      } else {
        return true;
      }
    });

    let latestProducts = await Product.find()
      .populate("forBusinessId")
      .sort("-createdAt")
      .limit(10);

    latestProducts = latestProducts.map((product) => {
      return {
        name: product.productInfo.name,
        forBusinessName: product?.forBusinessId?.businessInfo.title,
        forBusinessSlug: product?.forBusinessId?.businessInfo.slug,
        pic: product.productInfo.featureImage,
      };
    });

    latestProducts = latestProducts.filter((product) => {
      if (product.forBusinessName === undefined || product.pic === "") {
        return false;
      } else {
        return true;
      }
    });

    let latestPosts = await Post.find()
      .populate("creator")
      .sort("-createdAt")
      .limit(10);

    latestPosts = latestPosts.map((post) => {
      return {
        title: post.postInfo.name,
        pic: post.postInfo.featureImage,
        userSlug: post.creator.userInfo.slug,
        creatorName: post.creator.userInfo.name,
      };
    });

    let latestBusinesses = await Business.find().sort("-createdAt").limit(10);

    latestBusinesses = latestBusinesses.map((business) => {
      return {
        name: business.businessInfo.title,
        slug: business.businessInfo.slug,
        pic: business.businessInfo.indexImage,
        cityName: business.businessInfo.cityName,
        region: business.businessInfo.region,
      };
    });

    res.status(200).json({
      result: {
        latestProducts,
        latestBusinesses,
        latestUsers,
        latestPosts,
      },
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

function convertMsToMinutesSeconds(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.round((milliseconds % 60000) / 1000);

  return seconds === 60
    ? `${minutes + 1}:00`
    : `${minutes}:${padTo2Digits(seconds)}`;
}

function padTo2Digits(num) {
  return num.toString().padStart(2, "0");
}

function convertMsToSeconds(milliseconds) {
  const seconds = Math.round(milliseconds / 1000);
  return seconds;
}
