const User = require("../models/user");
const Business = require("../models/business");
const Post = require("../models/post");
const Category = require("../models/category");
const Product = require("../models/product");
const mongoose = require("mongoose");
const path = require("path");

exports.addNewFieldsToUsers = async () => {
  User.find()
    .then((users) => {
        for(const user of users){
            let sampleSlug = Math.floor(10000000 + Math.random() * 90000000).toString();

            user.userInfo.slug = user.userInfo.slug ? user.userInfo.slug : sampleSlug
            user.userInfo.aboutMe = user.userInfo.aboutMe ? user.userInfo.aboutMe : "درباره من..."
            user.userInfo.verifyKey = ""

            user.deleted = user.deleted ? user.deleted : false
            user.banned = user.banned ? user.banned : false
            user.stopped = user.stopped ? user.stopped : false

            user.settings.soundActive = user.settings.soundActive ? user.settings.soundActive : true
            user.settings.pagePrivacy = user.settings.pagePrivacy ? user.settings.pagePrivacy : "public"

            user.followingUsers = user.followingUsers ? user.followingUsers : []
            user.followedBusinesses = user.followedBusinesses ? user.followedBusinesses : []
            user.likedPosts = user.likedPosts ? user.likedPosts : []
            user.seenedPosts = user.seenedPosts ? user.seenedPosts : []
            user.save()
        }
        console.log("CLEAN UP FUNCTION EXECUTED !!!")
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.setDefaultPicForUsers = async () => {
    User.find()
      .then((users) => {
          for(const user of users){ 
              user.userInfo.pic = user.userInfo.pic ? user.userInfo.pic : "default-user-pic.png"
              user.save()
          }
          console.log("CLEAN UP FUNCTION EXECUTED !!!")
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  };

exports.addNewFieldsToPosts = async () => {
Post.find()
    .then((posts) => {
        for(const post of posts){
            post.save()
        }
        console.log("CLEAN UP FUNCTION EXECUTED !!!")
    })
    .catch((err) => {
    if (!err.statusCode) {
        err.statusCode = 500;
    }
    next(err);
    });
};


exports.addNewFieldsToBusinesses = async () => {
    Business.find()
        .then((businesses) => {
            for(const business of businesses){
                business.businessInfo.description = business.businessInfo.description ? business.businessInfo.description : "درباره این کسب و کار..."
                business.businessInfo.indexImage = business.businessInfo.indexImage ? business.businessInfo.indexImage : "default-business-pic.png"

                business.financialInformation.accepted = business.financialInformation.accepted ? business.financialInformation.accepted : false
                business.financialInformation.sentForReview = business.financialInformation.sentForReview ? business.financialInformation.sentForReview : false
                business.financialInformation.hasAdminMessage = business.financialInformation.hasAdminMessage ? business.financialInformation.hasAdminMessage : false
                business.financialInformation.modalHtml = business.financialInformation.modalHtml ? business.financialInformation.modalHtml : ""

                business.deleted = business.deleted ? business.deleted : false
                business.banned = business.banned ? business.banned : false
                business.stopped = business.stopped ? business.stopped : false

                business.save()
            }
            console.log("CLEAN UP FUNCTION EXECUTED !!!")
        })
        .catch((err) => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
        });
};

exports.startBusinessSocialMediasWithHTTPS = async () => {
    Business.find()
        .then((businesses) => {
            for(const business of businesses){
                for(const social of business.socials){
                    if(!social.link.startsWith("https") || !social.link.startsWith("https")){
                        social.link = "https://" +social.link;
                    }
                }
                business.save()
            }
            console.log("CLEAN UP FUNCTION EXECUTED !!!")
        })
        .catch((err) => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
        });
};

exports.startUsersSocialMediasWithHTTPS = async () => {
    User.find()
        .then((users) => {
            for(const user of users){
                user.socials = user.socials ? user.socials : []
                for(const social of user.socials){
                    if(!social.link.startsWith("https") || !social.link.startsWith("https")){
                        social.link = "https://" +social.link;
                    }
                }
                user.save()
            }
            console.log("CLEAN UP FUNCTION EXECUTED !!!")
        })
        .catch((err) => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
        });
};