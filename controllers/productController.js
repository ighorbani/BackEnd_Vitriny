const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const Product = require("../models/product");
const Post = require("../models/post");
const mongoose = require("mongoose");
const Business = require("../models/business");
const User = require("../models/user");

// RETURN PRODUCTS OF A SPECIFIC BUSINESS
exports.businessProducts = (req, res, next) => {
  const businessId = req.params.businessId;
  const currentPage = req.params.currentPage || 1;
  const perPage = 6;

  Product.find({ forBusinessId: businessId })
    .populate("forBusinessId")
    // .skip((currentPage - 1) * perPage)
    .limit((currentPage - 1) * perPage + perPage)
    .then((products) => {
      res.status(200).json({
        products: products,
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

// A HELPER FUNCTION TO FETCH HOME PAGE PRODUCTS AND POSTS
async function fetchHomePageProducts(userLocationId, userId) {
  let businessesIdsArray = [];
  let result = [];
  let posts = [];
  let likedPosts = [];
  let likedProducts = [];

  try {
    if (userId) {
      const userObject = await User.findById(mongoose.Types.ObjectId(userId));
      businessesIdsArray = userObject.followedBusinesses;

      likedPosts = userObject.likedPosts.map((p) => {
        return p.toString();
      });

      likedProducts = userObject.likedProducts.map((p) => {
        return p.toString();
      });

      posts = await Post.find({
        creator: mongoose.Types.ObjectId(userId),
      }).populate("creator", "userInfo");

      // posts = posts.filter((p) => {
      //   if (likedPosts.includes(p._id.toString())) {
      //     return false;
      //   } else {
      //     return true;
      //   }
      // });

      posts = posts.map((p) => {
        return { ...p._doc, type: "post" };
      });
    }

    let areaBusinesses = await Business.find({
      "businessInfo.cityId": userLocationId,
    });

    if (areaBusinesses.length === 0) {
      areaBusinesses = await Business.find({
        "businessInfo.cityId": "city_0bb81d7915f2b027db4d1d49496c3d107fbf313d",
      });
    }

    let areaBusinessesIds = areaBusinesses.map((business) => {
      return business._id;
    });

    businessesIdsArray = [...areaBusinessesIds];

    let products = await Product.find({
      "productInfo.featureImage": { $ne: null },
      forBusinessId: { $in: businessesIdsArray },
      // likedPosts: { $ne: likedPosts },
    }).populate("forBusinessId", "businessInfo creator");

    if (products.length === 0) {
      areaBusinesses = await Business.find({
        "businessInfo.cityId": "city_0bb81d7915f2b027db4d1d49496c3d107fbf313d",
      });

      areaBusinessesIds = areaBusinesses.map((business) => {
        return business._id;
      });

      businessesIdsArray = [...areaBusinessesIds];

      products = await Product.find({
        "productInfo.featureImage": { $ne: null },
        forBusinessId: { $in: businessesIdsArray },
        // likedPosts: { $ne: likedPosts },
      }).populate("forBusinessId", "businessInfo creator");
    }

    // products = products.filter((p) => {
    //   if (likedProducts.includes(p._id.toString())) {
    //     return false;
    //   } else {
    //     return true;
    //   }
    // });

    products = products.map((p) => {
      return { ...p._doc, type: "product" };
    });

    result = [...posts, ...products];
    shuffle(result);

    return result;
  } catch (err) {
    console.log("error");
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
}

// RETURN PRODUCTS AND POSTS BASED ON USER CITY FOR HOME PAGE
exports.getProducts = async (req, res, next) => {
  const userLocation = req.body.userLocation;
  const userId = req.body.userId || "6373d157b555a76ada12bb83";
  const seenedProductsIds = req.body.seenedProducts || [];

  try {
    let fetchedProducts = await fetchHomePageProducts(userLocation.id, userId);

    fetchedProducts = fetchedProducts.filter((p) => {
      if (!seenedProductsIds.includes(p._id.toString())) {
        return true;
      }
    });

    fetchedProducts = fetchedProducts.slice(0, 3);
    res.status(200).json({
      products: fetchedProducts,
      state: "Ok",
    });
  } catch (err) {
    console.log("error");
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
};

// CREATE PRODUCT FOR A BUSINESS
exports.createProduct = async (req, res, next) => {
  const businessId = req.params.businessId;

  const business = await Business.findById(businessId);
  if (business.creator.toString() !== req.userId.toString()) {
    return res.status(401).json({
      state: "Action unAutorized",
    });
  }

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
  const presentType = req.body.presentType;
  const description = req.body.description;
  const price = req.body.price;
  const priceType = "تومان";
  const hasImage = req.body.hasImage;
  // const tags = req.body.tags;

  // let productTags = tags.split("#");
  // productTags = productTags.filter(function (el) {
  //   return el != "";
  // });

  let featureImage = "";
  if (hasImage === "true") {
    featureImage = req.files.image[0].filename;

    let uploadedImage = path.join(
      __dirname,
      "../",
      "uploads",
      "product",
      req.files.image[0].filename
    );

    sharp(req.files.image[0].path)
      .resize({ width: 1000 })
      .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
      .toFile(uploadedImage);
  }

  const product = new Product({
    productInfo: {
      name: name,
      presentType: presentType,
      description: description,
      price: price,
      priceType: priceType,
      featureImage: featureImage,
    },
    // productTags: productTags,
    forBusinessId: businessId,
  });

  product
    .save()
    .then((result) => {
      res.status(201).json({
        product: result,
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

// EDIT SPECIFIC PRODUCT
exports.editProduct = async (req, res, next) => {
  const productId = req.params.productId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const name = req.body.name;
  const presentType = req.body.presentType;
  const description = req.body.description || "";
  const price = req.body.price || "";
  const priceType = "تومان";
  const hasImage = req.body.hasImage;
  // const tags = req.body.tags || "";

  // let productTags = tags.split("#");
  // productTags = productTags.filter(function (el) {
  //   return el != "";
  // });

  Product.findById(productId)
    .populate("forBusinessId")
    .then((product) => {
      if (!product) {
        const error = new Error("Can't find Product");
        error.statusCode = 404;
        throw error;
      }

      if (product.forBusinessId.creator.toString() !== req.userId.toString()) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      let featureImage = product.productInfo.featureImage;
      if (hasImage === "true") {
        if (featureImage !== "") {
          clearImage(featureImage);
        }
        featureImage = req.files.image[0].filename;

        let uploadedImage = path.join(
          __dirname,
          "../",
          "uploads",
          "product",
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
        // featureImage=""
      }

      product.productInfo.name = name || product.productInfo.name;
      product.productInfo.presentType = presentType;
      product.productInfo.description = description;
      product.productInfo.price = price;
      product.productInfo.priceType = priceType;
      product.productInfo.featureImage = featureImage;
      // product.productTags = productTags;

      return product.save();
    })
    .then((result) => {
      res.status(200).json({
        product: result,
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

// RETURN INFORMATION OF A SPECIFIC PRODUCT
exports.getProduct = (req, res, next) => {
  const productId = req.params.productId;
  Product.findById(productId)
    .then((product) => {
      if (!product) {
        const error = new Error("Can't find Product");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ product: product });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// DELETE A SPECIFIC PRODUCT
exports.deleteProduct = async (req, res, next) => {
  const productId = req.params.productId;
  const userId = req.userId;

  try {
    const product = await Product.findByIdAndDelete(productId).populate(
      "forBusinessId"
    );

    if (!product) {
      const error = new Error("Can't find Product");
      error.statusCode = 404;
      throw error;
    }

    if (product.forBusinessId.creator.toString() !== userId.toString()) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }

    await product.remove();

    res.status(200).json({
      product: product,
      state: "Deleted",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CLEAR OLD IMAGE OF PRODUCT
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", "uploads", "product", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
