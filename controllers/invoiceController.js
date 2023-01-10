const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const Product = require("../models/product");
const mongoose = require("mongoose");
const Business = require("../models/business");
const User = require("../models/user");
const Invoice = require("../models/invoice");

// const financialEvidenceFailed = require("../data/admin-messages");
// console.log(JSON.stringify(financialEvidenceFailed));

// GET BUSINESS INVOICES
exports.getBusinessInvoices = async (req, res, next) => {
  const userId = req.userId;

  try {
    const business = await Business.findOne({
      creator: mongoose.Types.ObjectId(userId),
    });

    let invoices = await Invoice.find({
      fromBusiness: business._id,
    }).populate("forUser fromBusiness");

    if (invoices.length !== 0) {
      res.status(201).json({
        invoices: invoices,
        state: "Ok",
      });
    } else {
      res.status(201).json({
        businessName: business.businessInfo.title,
        state: "No",
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// GET INVOICES OF A SPECIFIC USER AT A BUSINESS
exports.getUserBusinessInvoices = async (req, res, next) => {
  const forUserId = req.body.forUserId;
  const userId = req.userId;
  try {
    const business = await Business.findOne({
      creator: mongoose.Types.ObjectId(userId),
    });

    let invoices = await Invoice.find({
      forUser: mongoose.Types.ObjectId(forUserId),
      fromBusiness: business._id,
    })
      .sort("-createdAt")
      .populate("fromBusiness forUser");

    if (invoices.length !== 0) {
      res.status(200).json({
        invoices: invoices,
        state: "Ok",
      });
    } else {
      res.status(200).json({
        state: "No",
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// GET INVOICES OF A SPECIFIC USER
exports.getUserInvoices = async (req, res, next) => {
  const userId = req.userId;
  try {
    let invoices = await Invoice.find({
      forUser: mongoose.Types.ObjectId(userId),
    })
      .sort("-createdAt")
      .populate("fromBusiness forUser");

    if (invoices.length !== 0) {
      res.status(201).json({
        invoices: invoices,
        state: "Ok",
      });
    } else {
      res.status(201).json({
        state: "No",
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// GET COUNT OF UNPAYED INVOICES OF A SPECIFIC USER
exports.getUnpayedInvoicesCount = async (req, res, next) => {
  const userId = req.userId;
  try {
    let invoices = await Invoice.find({
      forUser: mongoose.Types.ObjectId(userId),
    }).sort("-createdAt");

    invoices = invoices.filter((i) => {
      if (i.invoiceInfo.payed === false) {
        return true;
      }
    });

    res.status(201).json({
      count: invoices.length,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// GET AN SPECIFIC INVOICE
exports.getInvoice = async (req, res, next) => {
  const invoiceId = req.params.invoiceId;
  const userId = req.userId;

  try {
    let invoice = await Invoice.findById(
      mongoose.Types.ObjectId(invoiceId)
    ).populate("forUser fromBusiness");

    if (invoice.forUser._id.toString() === userId) {
      invoice = { ...invoice._doc, forMe: true };
    } else {
      invoice = { ...invoice._doc, forMe: false };
    }

    const result = {
      payed: invoice.invoiceInfo.payed,
      date: invoice.invoiceInfo.date,
      invoiceNumber: invoice.invoiceInfo.number,
      itemName: invoice.items[0].name,
      itemPrice: invoice.items[0].price,
      totalPrice: invoice.invoiceInfo.totalPrice,
      unit: invoice.items[0].unit,
      description: invoice.items[0].description,
      forMe: invoice.forMe,
      userName: invoice.forUser.userInfo.name,
      userSlug: invoice.forUser.userInfo.slug,
      businessName: invoice.fromBusiness.businessInfo.title,
    };

    res.status(201).json({
      invoice: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CREATE INVOICE
exports.createInvoice = async (req, res, next) => {
  const forUserId = req.body.forUserId;
  const name = req.body.name;
  const price = req.body.price;
  const unit = req.body.unit;
  const userId = req.userId;
  const description = req.body.description;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  try {
    const business = await Business.findOne({
      creator: mongoose.Types.ObjectId(userId),
    });

    let invoice = new Invoice({
      invoiceInfo: {
        number: Math.floor(1000000 + Math.random() * 9000000).toString(),
        totalPrice: price,
        date: new Date(),
        payed: false,
      },
      items: [
        {
          name: name,
          price: price,
          unit: unit,
          description: description,
        },
      ],
      fromBusiness: business._id,
      forUser: forUserId,
    });
    await invoice.save();

    res.status(201).json({
      invoice: invoice,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CALCULATE BUSINESS FINANCIAL STATEMENT
exports.calculateBusinessFinancial = async (req, res, next) => {
  const userId = req.userId;

  try {
    const business = await Business.findOne({
      creator: mongoose.Types.ObjectId(userId),
    });

    let invoices = await Invoice.find({
      fromBusiness: business._id,
    }).populate("forUser fromBusiness");

    if (!business.financialInformation.accepted) {
      res.status(201).json({
        businessName: business.businessInfo.title,
        financialInformation: {
          sentForReview: business.financialInformation.sentForReview,
          accepted: business.financialInformation.accepted,
          hasAdminMessage: business.financialInformation.hasAdminMessage,
          modalHtml: business.financialInformation.modalHtml,
        },
        state: "NotAccepted",
      });
    } else if (invoices.length !== 0) {
      let lastMPayedInvoices = invoices.filter((m) => {
        if (m.invoiceInfo.payed === true) {
          return true;
        }
      });

      let financialStatement = {
        lastMInvoices: invoices.length,
        lastMPayedInvoices: lastMPayedInvoices.length,
        lastMIncome: 2000,
        businessName: invoices[0].fromBusiness.businessInfo.title,
        totalInvoices: invoices.length,
        totalPayedInvoices: lastMPayedInvoices.length,
        totalIncome: 5000,
      };

      res.status(201).json({
        financialStatement: financialStatement,
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

// EDIT BUSINESS INVOICE BEFORE PAYMENT
exports.editInvoice = async (req, res, next) => {
  const invoiceId = req.body.invoiceId;
  const name = req.body.name;
  const price = req.body.price;
  const description = req.body.description;
  const unit = req.body.unit;
  const userId = req.userId;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  try {
    const business = await Business.findOne({
      creator: mongoose.Types.ObjectId(userId),
    });

    let invoice = await Invoice.find({
      _id: mongoose.Types.ObjectId(invoiceId),
      fromBusiness: business._id,
    });

    invoice.invoiceInfo.totalPrice = price;
    invoice.items[0].name = name;
    invoice.items[0].price = price;
    invoice.items[0].description = description;
    invoice.items[0].unit = unit;
    await invoice.save();

    res.status(201).json({
      invoice: invoice,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// SET INVOICE AS PAYED
exports.payInvoice = async (req, res, next) => {
  const businessId = req.body.businessId;
  const forUserId = req.body.forUserId;
  const invoiceId = req.body.invoiceId;

  try {
    let invoice = await Invoice.findById(mongoose.Types.ObjectId(invoiceId));

    invoice.invoiceInfo.payed = true;
    await invoice.save();

    res.status(201).json({
      invoice: invoice,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
