const { validationResult } = require("express-validator");
const Admin = require("../models/admin");
const mongoose = require("mongoose");
const sendSms = require("../helpers/send-sms").sendSms;
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");
const Business = require("../models/business");
const Category = require("../models/category");
const User = require("../models/user");
dotenv.config({ path: path.join(__dirname, "../", ".env") });

// RETURN INFORMATION OF A SPECIFIC ADMIN
exports.getAdmin = (req, res, next) => {
  Admin.findById(req.adminId)
    .then((admin) => {
      res.status(200).json({
        admin: admin,
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
  let verifyKey = Math.floor(100000 + Math.random() * 900000).toString();
  if (verifyKey.length !== 6) {
    verifyKey = Math.floor(100000 + Math.random() * 900000).toString();
  }

  Admin.findOne({ "adminInfo.number": number })
    .then((admin) => {
      sendSms(verifyKey + "\n" + "کد ورود مدیر در ویترینی", number);
      if (!admin) {
        const newAdmin = new Admin({
          adminInfo: {
            number: number,
            verifyKey: verifyKey,
          },
        });
        newAdmin.save().then((result) => {
          res.status(201).json({
            state: "Ok",
          });
        });
      } else {
        admin.adminInfo.verifyKey = verifyKey;
        admin.save().then((result) => {
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
  Admin.findOne({ "adminInfo.number": number })
    .then((admin) => {
      if (admin.adminInfo.verifyKey === verifyCode) {
        admin.adminInfo.verifyKey = "";
        admin.save().then((result) => {
          const token = jwt.sign(
            { number: number, adminId: admin._id.toString() },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_LIFE }
          );
          res.status(200).json({
            admin: result,
            token: token,
            state: "Exists",
          });
          next();
        });
      } else {
        res.status(200).json({
          state: "no",
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

// EDIT SPECIFIC ADMIN INFO
exports.editAdmin = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  let adminId = req.adminId;
  const name = req.body.name;

  Admin.findById(mongoose.Types.ObjectId(adminId))
    .then((admin) => {
      if (!admin) {
        const error = new Error("Can't find Admin");
        error.statusCode = 404;
        throw error;
      }

      admin.adminInfo.name = name;
      return admin.save();
    })
    .then((result) => {
      res.status(200).json({
        admin: result,
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

// RETURN USER OR BUSINESSES WHICH ADMIN SEARCHING
exports.adminSearch = async (req, res, next) => {
  const filterType = req.body.filterType || ["business", "user"];
  const searchValue = req.params.searchValue;
  let searchResult = [];

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
        ])
        .populate("creator");
      if (findedBusinesses.length !== 0) {
        findedBusinesses = findedBusinesses.map((business) => {
          return { ...business._doc, type: "business" };
        });

        searchResult = [...findedBusinesses];
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
          "userInfo.number": {
            $regex: searchValue.toString(),
            $options: "i",
          },
        },
      ]);
      if (findedUsers.length !== 0) {
        findedUsers = findedUsers.map((user) => {
          return { ...user._doc, type: "user" };
        });
        searchResult = [...searchResult, ...findedUsers];
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

// ACTIVATE SPECIFIC USER
exports.ActivateUser = async (req, res, next) => {
  const userId = req.body.userId;
  try {
    findedUser = await User.findById(mongoose.Types.ObjectId(userId));
    const token = jwt.sign(
      {
        number: findedUser.userInfo.number,
        userId: findedUser._id.toString(),
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_LIFE }
    );

    res.status(200).json({
      user: findedUser,
      token: token,
      state: "SET",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// ACTIVATE SPECIFIC BUSINESS
exports.ActivateBusiness = async (req, res, next) => {
  const businessId = req.body.businessId;
  let findedUser = "";
  try {
    let findedBusiness = await Business.findById(
      mongoose.Types.ObjectId(businessId)
    );

    if (findedBusiness) {
      findedUser = await User.findById(findedBusiness.creator._id);
      const token = jwt.sign(
        {
          number: findedUser.userInfo.number,
          userId: findedUser._id.toString(),
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_LIFE }
      );

      res.status(200).json({
        user: findedUser,
        token: token,
        state: "SET",
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// ACTIVATE SUPPORT MODE
exports.ActivateSupportMode = async (req, res, next) => {
  const userId = mongoose.Types.ObjectId("6368ea418ef90fbb767a82a6");
  try {
    findedUser = await User.findById(mongoose.Types.ObjectId(userId));
    const token = jwt.sign(
      {
        number: findedUser.userInfo.number,
        userId: findedUser._id.toString(),
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_LIFE }
    );

    res.status(200).json({
      user: findedUser,
      token: token,
      state: "SET",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// SEARCH BY SORT
exports.searchBySort = async (req, res, next) => {
  const searchParameter = req.params.searchParameter;
  let searchResult = [];

  if (searchParameter === "newestBusinesses") {
    try {
      let findedBusinesses = await Business.find()
        .sort("-createdAt")
        .limit(10)
        .populate("creator");

      if (findedBusinesses.length !== 0) {
        findedBusinesses = findedBusinesses.map((business) => {
          return { ...business._doc, type: "business" };
        });

        searchResult = [...findedBusinesses];
      }
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  }
  if (searchParameter === "newestUsers") {
    try {
      let findedUsers = await User.find().sort("-createdAt").limit(10);

      if (findedUsers.length !== 0) {
        findedUsers = findedUsers.map((user) => {
          return { ...user._doc, type: "user" };
        });
        searchResult = [...searchResult, ...findedUsers];
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
