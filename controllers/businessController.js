const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const Business = require("../models/business");
const mongoose = require("mongoose");
const Category = require("../models/category");
const User = require("../models/user");
const Post = require("../models/post");
const io = require("../socket");
const Product = require("../models/product");
const sharp = require("sharp");
const Comment = require("../models/comment");

//RETURN PRODUCTS OR BUSINESSES WHICH USER SEARCHING
exports.generalSearch = async (req, res, next) => {
  const filterType = req.body.filterType || [
    "business",
    "product",
    "user",
    "post",
  ];
  const cityId = req.body.filterCity || "";
  const searchValue = req.params.searchValue;

  let searchResult = [];
  var catId = "";

  try {
    catId = await Category.findOne({
      title: { $regex: searchValue.toString(), $options: "i" },
    }).select("_id");
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }

  if (filterType.includes("business")) {
    try {
      let findedBusinesses = await Business.find()
        .or([
          {
            "businessInfo.title": {
              $regex: searchValue.toString(),
              $options: "i",
            },
          },
          {
            "businessInfo.slug": {
              $regex: searchValue.toString(),
              $options: "i",
            },
          },
          { inCategoryId: { $in: catId } },
        ])
        .populate("inCategoryId");
      if (findedBusinesses.length !== 0) {
        if (cityId !== "") {
          findedBusinesses = findedBusinesses.filter((business) => {
            if (business.businessInfo.cityId === cityId) {
              return true;
            } else {
              return false;
            }
          });
        }

        const FBsData = findedBusinesses.map((business) => {
          return {
            city: business.businessInfo.cityName,
            title: business.businessInfo.title,
            slug: business.businessInfo.slug,
            inCategory: business.inCategoryId.title,
            id: business._id,
            image: business.businessInfo.indexImage,
            type: "business",
          };
        });
        searchResult.push(...FBsData);
      }
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  }

  if (filterType.includes("user")) {
    try {
      let findedUsers = await User.find().or([
        {
          "userInfo.name": {
            $regex: searchValue.toString(),
            $options: "i",
          },
        },
        {
          "userInfo.slug": {
            $regex: searchValue.toString(),
            $options: "i",
          },
        },
      ]);
      if (findedUsers.length !== 0) {
        const FUsData = findedUsers.map((person) => {
          return {
            title: person.userInfo.name,
            slug: person.userInfo.slug,
            _id: person._id,
            image: person.userInfo.pic,
            type: "user",
          };
        });
        searchResult.push(...FUsData);
      }
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  }

  if (filterType.includes("product")) {
    try {
      let findedProducts = await Product.find()
        .or([
          // { productTags: { $regex: searchValue.toString(), $options: "i" } },
          {
            "productInfo.name": {
              $regex: searchValue.toString(),
              $options: "i",
            },
          },
        ])
        .populate("forBusinessId");
      if (findedProducts.length !== 0) {
        if (cityId !== "") {
          findedProducts = findedProducts.filter((product) => {
            return product.forBusinessId.businessInfo.cityId === cityId;
          });
        }
        const FPrsData = findedProducts.map((product) => {
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
        searchResult.push(...FPrsData);
      }
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  }

  if (filterType.includes("post")) {
    try {
      let findedPosts = await Post.find()
        .or([
          // { postTags: { $regex: searchValue.toString(), $options: "i" } },
          {
            "postInfo.name": {
              $regex: searchValue.toString(),
              $options: "i",
            },
          },
        ])
        .populate("creator");
      if (findedPosts.length !== 0) {
        const FPosData = findedPosts.map((post) => {
          return {
            title: post.postInfo.name,
            creatorId: post.creator._id.toString(),
            creatorSlug: post.creator.userInfo.slug,
            creator: post.creator.userInfo.name,
            description: post.postInfo.description,
            image: post.postInfo.featureImage,
            _id: post._id,
            type: "post",
          };
        });
        searchResult.push(...FPosData);
      }
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  }

  res.status(200).json({
    result: searchResult,
    state: searchResult.length !== 0 ? "Finded" : "NothingFinded",
  });
};

//RETURN ALL BUSINESSES
exports.getBusinesses = (req, res, next) => {
  Business.find()
    .then((businesses) => {
      res.status(200).json({
        businesses: businesses,
      });
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

//CREATE A BUSINESS WITH USER
exports.createBusiness = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const sampleSlug = makeid(15);

  // if (!req.files.image) {
  //   return res.status(422).json({
  //     state: "Error",
  //     errors: [
  //       {
  //         msg: "لطفا برای ایجاد پست، تصویر انتخاب کنید.",
  //         param: "image",
  //         location: "body",
  //       },
  //     ],
  //   });
  // }

  const title = req.body.title;
  const businessModel = req.body.businessModel || "";
  const categoryId = req.body.categoryId;
  const slug = sampleSlug;
  const userId = req.userId;
  const hasImage = req.body.hasImage;
  let indexImage = "";

  if (hasImage === "true") {
    indexImage = req.files.image[0].filename;

    let uploadedImage = path.join(
      __dirname,
      "../",
      "uploads",
      "business",
      req.files.image[0].filename
    );

    sharp(req.files.image[0].path)
      .resize({ width: 1000 })
      .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
      .toFile(uploadedImage);
  } else {
    indexImage = "default-business-pic.png";
  }

  const business = new Business({
    creator: userId,
    businessInfo: {
      title: title,
      indexImage: indexImage,
      businessModel: businessModel,
      slug: slug,
    },
    inCategoryId: categoryId,
    deleted: false,
    banned: false,
    stopped: false,
  });

  business
    .save()
    .then((result) => {
      res.status(201).json({
        businessSlug: result.businessInfo.slug,
        state: "Created",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//RETURN BUSINESS ADMIN PAGE IFNO
exports.getBusinessAdmin = async (req, res, next) => {
  const slug = req.params.slug;
  try {
    const business = await Business.findOne({
      "businessInfo.slug": slug,
    })
      .populate({
        path: "creator",
        populate: { path: "userInfo" },
      })
      .populate({
        path: "commentIds",
        populate: { path: "creator" },
      })
      .populate("inCategoryId");

    if (business.creator._id.toString() !== req.userId.toString()) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }

    const productsCount = await Product.countDocuments({
      forBusinessId: business?._id,
    });

    const products = await Product.find({ forBusinessId: business?._id })
      .sort("-createdAt")
      .populate({
        path: "forBusinessId",
      })
      .limit(5);
    let comments = await Comment.find({ forBusinessId: business?._id })
      .populate("creator")
      .limit(5);

    // const story = await Story.findOne({
    //   byBusinessId: business?._id,
    //   "storyInfo.active": false,
    // }).limit(1);

    comments = comments.map((comment) => {
      return {
        comment: comment.commentInfo.comment,
        date: comment.commentInfo.date,
        creator: comment.creator.userInfo.name,
      };
    });

    // let hasStory = false;
    // if (story) {
    //   hasStory = true;
    // }

    const activateStates = {
      deleted: business?.deleted,
      banned: business?.banned,
      stopped: business?.stopped,
    };

    const result = {
      id: business?._id,
      creatorName: business?.creator?.userInfo?.name,
      creatorId: business?.creator?._id,
      phoneNumbers: business?.phoneNumbers,
      socials: business?.socials,
      comments: comments,
      businessInfo: business?.businessInfo,
      features: business?.features,
      category: business?.inCategoryId,
      products: products,
      productsCount: productsCount,
      hasStory: false,
      reviewItems: business?.review.reviewItems,
      sentForReview: business?.review.sentForReview,
      activateStates: activateStates,
    };

    res.status(200).json({
      business: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//RETURN BUSINESS VIEW PAGE IFNO
exports.getBusinessView = async (req, res, next) => {
  const slug = req.params.slug;
  try {
    const business = await Business.findOne({
      "businessInfo.slug": slug,
    })
      .populate({
        path: "creator",
        populate: { path: "userInfo" },
      })

      .populate("inCategoryId");

    const products = await Product.find({ forBusinessId: business?._id })
      .sort("-createdAt")
      .populate({
        path: "forBusinessId",
      })
      .limit(5);

    let comments = await Comment.find({ forBusinessId: business?._id })
      .populate("creator")
      .limit(5);

    const commentsCount = await Comment.countDocuments({
      forBusinessId: business?._id,
    });

    const productsCount = await Product.countDocuments({
      forBusinessId: business?._id,
    });

    comments = comments.map((comment) => {
      return {
        comment: comment.commentInfo.comment,
        date: comment.commentInfo.date,
        creator: comment.creator.userInfo.name,
        creatorId: comment.creator._id,
        creatorSlug: comment.creator.userInfo.slug,
        pic: comment.creator.userInfo.pic,
        id: comment._id,
      };
    });

    // const story = await Story.findOne({
    //   byBusinessId: business?._id,
    //   "storyInfo.active": false,
    // }).limit(1);

    // const comments = business.commentIds.map((comment) => {
    //   return {
    //     comment: comment.commentInfo.comment,
    //     date: comment.commentInfo.date,
    //     creator: comment.creator.userInfo.name,
    //     creatorId: comment.creator._id,
    //     pic: comment.creator.userInfo.pic,
    //     id: comment._id,
    //   };
    // });

    // let hasStory = false;
    // if (story) {
    //   hasStory = true;
    // }

    let HideBusiness = false;
    if (business) {
      if (business.stopped || business.deleted || business.banned) {
        HideBusiness = true;
      }
    }

    const result = {
      id: business?._id,
      creatorName: business?.creator?.userInfo?.name,
      creatorId: business?.creator?._id,
      phoneNumbers: business?.phoneNumbers,
      socials: business?.socials,
      comments: comments,
      businessInfo: business?.businessInfo,
      features: business?.features,
      category: business?.inCategoryId,
      products: products,
      hasStory: false,
      productsCount: productsCount,
      commentsCount: commentsCount,
      reviewItems: business?.review.reviewItems,
      sentForReview: business?.review.sentForReview,
    };

    if (HideBusiness) {
      res.status(200).json({
        state: "BusinessHided",
      });
    } else {
      res.status(200).json({
        business: result,
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

//UPDATE BUSINESS GENERAL INFORMATION
exports.updateBusiness = async (req, res, next) => {
  const businessSlug = req.params.slug;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const name = req.body.title;
  const cityName = req.body.cityName || "";
  const web = req.body.web || "";
  const address = req.body.address || "";
  const cityId = req.body.cityId || "";
  const region = req.body.region || "";
  const businessModel = req.body.businessModel;
  const description = req.body.description || "service";
  const showFeatureType = req.body.showFeatureType || "row";
  const slug = req.body.slug.toLowerCase();
  const categoryId = req.body.categoryId;
  const hasImage = req.body.hasImage;
  let availableBusinessSlug = {};

  try {
    const business = await Business.findOne({
      "businessInfo.slug": businessSlug,
    });
    if (!business) {
      const error = new Error("Can't find Business");
      error.statusCode = 404;
      throw error;
    }

    if (business.businessInfo.slug !== slug) {
      availableBusinessSlug = await Business.findOne({
        "businessInfo.slug": slug,
      });

      if (availableBusinessSlug) {
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
    if (business.creator.toString() !== req.userId.toString()) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }

    let indexImage = business.businessInfo.indexImage;

    if (hasImage === "true") {
      if (indexImage !== "" && indexImage !== "default-business-pic.png") {
        clearImage(indexImage);
      }
      indexImage = req.files.image[0].filename;

      let uploadedImage = path.join(
        __dirname,
        "../",
        "uploads",
        "business",
        req.files.image[0].filename
      );

      sharp(req.files.image[0].path)
        .resize({ width: 1000 })
        .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
        .toFile(uploadedImage);
    } else if (hasImage === "false") {
      if (indexImage !== "" && indexImage !== "default-business-pic.png") {
        clearImage(indexImage);
      }
      indexImage = "default-business-pic.png";
    }

    business.businessInfo.title = name || business.businessInfo.title;
    business.businessInfo.region = region;
    business.businessInfo.address = address;
    business.businessInfo.web = web || "";
    business.businessInfo.businessModel = businessModel;
    business.businessInfo.description = description;
    business.businessInfo.showFeatureType = showFeatureType;
    business.businessInfo.indexImage = indexImage;
    business.businessInfo.cityName = cityName;
    business.businessInfo.cityId = cityId;
    business.businessInfo.slug = slug || business.businessInfo.slug;
    business.inCategoryId = categoryId;

    const result = await business.save();

    res.status(200).json({
      business: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// SEND INFORMATION FOR OPENING FINANCIAL ACCOUNT
exports.sendFinancialInformation = async (req, res, next) => {
  const userId = req.userId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const fullName = req.body.fullName;
  const birthDate = req.body.birthDate;
  const address = req.body.address;
  const description = req.body.description;

  try {
    const business = await Business.findOne({
      creator: mongoose.Types.ObjectId(userId),
    });
    if (!business) {
      const error = new Error("Can't find Business");
      error.statusCode = 404;
      throw error;
    }

    // let certificatePic = business.financialInformation.certificatePic;
    // let identificationPic = business.financialInformation.identificationPic;
    // let evidencePic = business.financialInformation.evidencePic;

    // if (hasImage === "true") {
    //   if (indexImage !== "") {
    //     clearImage(indexImage);
    //   }
    //   indexImage = req.files.image[0].filename;

    //   let uploadedImage = path.join(
    //     __dirname,
    //     "../",
    //     "uploads",
    //     "business",
    //     req.files.image[0].filename
    //   );

    //   sharp(req.files.image[0].path)
    //     .resize({ width: 1000 })
    //     .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
    //     .toFile(uploadedImage);
    // } else if (hasImage === "false") {
    //   if (indexImage !== "") {
    //     clearImage(indexImage);
    //   }
    // }

    business.financialInformation.fullName = fullName;
    business.financialInformation.birthDate = birthDate;
    business.financialInformation.address = address;
    business.financialInformation.description = description;
    business.financialInformation.sentForReview = true;
    business.financialInformation.accepted = false;

    const result = await business.save();

    res.status(200).json({
      business: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//SETTING BUSINESS GOOGLE LOCATION
exports.setGoogleLocation = (req, res, next) => {
  const googleLocation = req.body.googleLocation;
  const businessSlug = req.params.slug;

  Business.findOne({ "businessInfo.slug": businessSlug })
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      business.businessInfo.googleLoc =
        googleLocation || business.businessInfo.googleLoc;
      return business.save();
    })
    .then((result) => {
      res.status(200).json({
        business: result,
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

//DELETE BUSINESS GOOGLE LOCATION
exports.deleteGoogleLocation = (req, res, next) => {
  const businessSlug = req.params.slug;

  Business.findOne({ "businessInfo.slug": businessSlug })
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      business.businessInfo.googleLoc = [];
      return business.save();
    })
    .then((result) => {
      res.status(200).json({
        business: result,
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

//ADD FEATURE TO BUSINESS
exports.addFeature = (req, res, next) => {
  const businessId = req.params.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const title = req.body.title;
  const value = req.body.value;
  const type = req.body.type || "row";
  const icon = "req.body.socialLink";

  Business.findById(businessId)
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      const newFeature = {
        title: title,
        value: value,
        type: type,
        icon: icon,
      };

      business.features.push(newFeature);
      return business.save();
    })
    .then((result) => {
      res.status(200).json({ result: result, state: "Ok" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//EDIT BUSINESS FEATURE
exports.editFeature = (req, res, next) => {
  const featureId = req.params.featureId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const title = req.body.title;
  const value = req.body.value;
  const type = req.body.type;
  const icon = "req.body.socialLink";

  Business.findOne({ "features._id": { $in: featureId } })
    .then((business) => {
      business.features.map((feature) => {
        if (feature._id.toString() === featureId) {
          feature.title = title;
          feature.value = value;
          feature.icon = icon;
          feature.type = type;
        }
      });

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      return business.save();
    })
    .then((result) => {
      res.status(200).json({ result: result, state: "Ok" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//DELETE BUSINESS FEATURE
exports.deleteFeature = (req, res, next) => {
  const featureId = req.params.featureId;

  Business.findOne({ "features._id": { $in: featureId } })
    .then((business) => {
      const newFeatures = business.features.filter((feature) => {
        if (feature._id.toString() !== featureId) {
          return true;
        }
      });

      business.features = newFeatures;

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      return business.save();
    })
    .then((result) => {
      res.status(200).json({ result: result, state: "Deleted" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//ADD SOCIAL NETWORK TO BUSINESS
exports.addSocial = (req, res, next) => {
  const businessId = req.params.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const link = req.body.link;
  const type = req.body.type;

  Business.findById(businessId)
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      const newSocial = {
        link: link,
        type: type,
      };

      business.socials.push(newSocial);

      return business.save();
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

//EDIT BUSINESS SOCIAL NETWORK
exports.editSocial = (req, res, next) => {
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

  Business.findOne({ "socials._id": { $in: socialId } })
    .then((business) => {
      business.socials.map((social) => {
        if (social._id.toString() === socialId) {
          social.link = link;
          social.type = type;
        }
      });

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      return business.save();
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

//DELETE BUSINESS SOCIAL NETWORK
exports.deleteSocial = (req, res, next) => {
  const socialId = req.params.socialId;

  Business.findOne({ "socials._id": { $in: socialId } })
    .then((business) => {
      const newSocials = business.socials.filter((social) => {
        if (social._id.toString() !== socialId) {
          return true;
        }
      });

      business.socials = newSocials;

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      return business.save();
    })
    .then((result) => {
      res.status(200).json({
        result: result,
        state: "Deleted",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//ADD PHONE TO BUSINESS
exports.addPhone = (req, res, next) => {
  const businessId = req.params.businessId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const number = req.body.number;

  Business.findById(businessId)
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }
      const newPhone = {
        number: number,
      };

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      business.phoneNumbers.push(newPhone);
      return business.save();
    })
    .then((result) => {
      res.status(200).json({ result: result, state: "Ok" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//EDIT BUSINESS PHONE
exports.editPhone = (req, res, next) => {
  const phoneId = req.params.phoneId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const number = req.body.number;

  Business.findOne({ "phoneNumbers._id": { $in: phoneId } })
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      const givenIndex = business.phoneNumbers.findIndex((phoneNumber) => {
        return phoneNumber._id.toString() === phoneId;
      });

      business.phoneNumbers[givenIndex].number = number;
      return business.save();
    })
    .then((result) => {
      res.status(200).json({ result: result, state: "Ok" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//DELETE BUSINESS PHONE
exports.deletePhone = (req, res, next) => {
  const phoneId = req.params.phoneId;

  Business.findOne({ "phoneNumbers._id": { $in: phoneId } })
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      const newPhones = business.phoneNumbers.filter((phoneNumber) => {
        if (phoneNumber._id.toString() !== phoneId) {
          return true;
        }
      });

      business.phoneNumbers = newPhones;
      return business.save();
    })
    .then((result) => {
      res.status(200).json({ result: result, state: "Deleted" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// CLEAR OLD IMAGE OF BUSINESS
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", "uploads", "business", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

// DEACTIVATE BUSINESS
exports.deactivateBusiness = (req, res, next) => {
  const businessId = req.params.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const deactivateState = req.body.deactivateState;

  Business.findById(businessId)
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      business.stopped = deactivateState;

      return business.save();
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

// BAN BUSINESS
exports.banBusiness = (req, res, next) => {
  const businessId = req.params.businessId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const banState = req.body.banState;

  Business.findById(businessId)
    .then((business) => {
      if (!business) {
        const error = new Error("Can't find Business");
        error.statusCode = 404;
        throw error;
      }

      if (business.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      business.banned = banState;

      return business.save();
    })
    .then((result) => {
      res.status(200).json({
        banned: banState,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN SOCIAL NETWORK INFO
exports.getSocial = (req, res, next) => {
  const socialId = req.params.socialId;
  Business.findOne({ "socials._id": { $in: socialId } })
    .then((business) => {
      const givenSocail = business.socials.find(
        (social) => social._id.toString() === socialId
      );
      res.status(200).json({
        state: "Ok",
        type: givenSocail.type,
        link: givenSocail.link,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN PHONE INFO
exports.getPhone = (req, res, next) => {
  const phoneId = req.params.phoneId;
  Business.findOne({ "phoneNumbers._id": { $in: phoneId } })
    .then((business) => {
      const givenPhone = business.phoneNumbers.find(
        (phone) => phone._id.toString() === phoneId
      );
      res.status(200).json({
        state: "Ok",
        number: givenPhone.number,
        link: givenPhone.link,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN FEATURE INFO
exports.getFeature = (req, res, next) => {
  const featureId = req.params.featureId;
  Business.findOne({ "features._id": { $in: featureId } })
    .then((business) => {
      const givenFeature = business.features.find(
        (feature) => feature._id.toString() === featureId
      );
      res.status(200).json({
        state: "Ok",
        title: givenFeature.title,
        value: givenFeature.value,
        icon: givenFeature.icon,
        type: givenFeature.type,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
