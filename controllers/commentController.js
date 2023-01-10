const { validationResult } = require("express-validator");
const Comment = require("../models/comment");
const mongoose = require("mongoose");
const Business = require("../models/business");
const User = require("../models/user");
const { deleteOne } = require("../models/comment");

// RETURN COMMENTS OF A SPECIFIC BUSINESS
exports.getComments = async (req, res, next) => {
  const businessId = req.params.businessId;
  const currentPage = req.params.currentPage || 1;
  const perPage = 6;
  let comments;

  try {
    const business = await Business.findById(
      mongoose.Types.ObjectId(businessId)
    );

    comments = await Comment.find({ _id: { $in: business.commentIds } })
      .populate("creator", "userInfo")
      .limit((currentPage - 1) * perPage + perPage);
    const result = comments.map((comment) => {
      return {
        comment: comment.commentInfo.comment,
        date: comment.commentInfo.date,
        creatorName: comment.creator.userInfo.name,
        creatorId: comment.creator._id,
        creatorSlug: comment.creator.userInfo.slug,
        creatorPic: comment.creator.userInfo.pic,
        forWhoSlug: business.businessInfo.slug,
        forWhoPic: business.businessInfo.indexImage,
        forWhoName: business.businessInfo.title,
        id: comment._id,
      };
    });

    res.status(200).json({
      comments: result,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CREATE A COMMENT FOR A BUSINESS
exports.createComment = (req, res, next) => {
  const businessId = req.params.businessId;
  const userId = req.userId;
  const commentText = req.body.comment;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      state: "Error",
      errors: errors.array(),
    });
  }

  const comment = new Comment({
    commentInfo: {
      date: new Date(),
      comment: commentText,
    },
    creator: userId,
    forBusinessId: businessId,
  });

  comment
    .save()
    .then((commentResult) => {
      Business.findById(businessId)
        .then((business) => {
          business.commentIds.push(commentResult._id);
          return business.save();
        })
        .then((businessResult) => {
          res.status(201).json({
            state: "Ok",
          });
        });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN SPECIFIC COMMENT INFO
exports.getComment = (req, res, next) => {
  const commentId = req.params.commentId;
  Comment.findById(commentId)
    .then((comment) => {
      if (!comment) {
        const error = new Error("Can't find Comment");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ comment: comment });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// DELETE A COMMENT
exports.deleteComment = async (req, res, next) => {
  const userId = req.userId;
  const commentId = req.params.commentId;

  try {
    const comment = await Comment.findById(commentId);
    const busienss = await Business.findOne({ commentIds: { $in: commentId } });
    if (
      comment.creator.toString() !== userId.toString() &&
      busienss.creator.toString() !== userId.toString()
    ) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }
    await comment.remove();
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
