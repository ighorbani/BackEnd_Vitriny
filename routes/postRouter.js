const sharp = require("sharp");
const express = require("express");
const { body } = require("express-validator");
const postController = require("../controllers/postController");
const router = express.Router();
const isAuth = require("../middleware/is-auth");

router.post("/userPosts", postController.getPosts);
// prettier-ignore
router.post(
    "/addPost",
     isAuth,
     body("name").trim().isLength({min:3,max:60}).withMessage("لطفا بین 3 تا 60 کاراکتر"),
     body("description").trim().isLength({min:0,max:2000}).withMessage("لطفا بین 10 تا 2000 کاراکتر"),
     postController.createPost);
// prettier-ignore
router.put(
    "/editPost/:postId/",
    body("name").trim().isLength({min:3,max:60}).withMessage("لطفا بین 3 تا 60 کاراکتر"),
    body("description").trim().isLength({min:0,max:2000}).withMessage("لطفا بین 10 تا 2000 کاراکتر"),
     isAuth,
     postController.editPost);
// prettier-ignore
router.get( "/businessPosts/:businessId/:currentPage", postController.businessPosts);
router.get("/getPost/:postId", postController.getPost);
router.put("/deletePost/:postId",isAuth, postController.deletePost);

module.exports = router;
