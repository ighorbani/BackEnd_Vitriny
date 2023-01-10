const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const Report = require("../models/report");
const mongoose = require("mongoose");

// RETURN ALL REPORTS
exports.getReports = (req, res, next) => {
  Report.find()
    .then((reports) => {
      res.status(200).json({
        reports: reports,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// CREATE A REPORT
exports.createReport = (req, res, next) => {
  const userId = req.userId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const type = req.body.type;
  const id = req.body.id;
  const description = req.body.description;
  const choice = req.body.choice;
  const name = req.body.name;

  let reportedItem = "";
  switch (type) {
    case "chat":
      reportedItem = { reportedChatId: id };
      break;
    case "user":
      reportedItem = { reportedUserId: id };
      break;
    case "business":
      reportedItem = { reportedBusinessId: id };
      break;
    case "product":
      reportedItem = { reportedProductId: id };
      break;
    case "story":
      reportedItem = { reportedStoryId: id };
      break;
  }

  const report = new Report({
    reportIfno: {
      reportedName: name,
      description: description,
      type: type,
      label: choice,
    },
    creator: userId,
    ...reportedItem,
  });

  report
    .save()
    .then((result) => {
      res.status(201).json({
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

// RETURN INFORMATION OF A SPECIFIC REPORT
exports.getReport = (req, res, next) => {
  const reportId = req.params.reportId;
  Report.findById(reportId)
    .then((report) => {
      if (!report) {
        const error = new Error("Can't find Report");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ report: report });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
