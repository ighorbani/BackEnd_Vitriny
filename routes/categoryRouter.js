const express = require("express");
const { body } = require("express-validator");
const categoryController = require("../controllers/categoryController");
const router = express.Router();

router.post("/getUserCategories/", categoryController.getUserCategories);
router.get("/getCategories/", categoryController.getCategories);
// prettier-ignore
router.post( "/getCategoryBusinesses/:catId", categoryController.getCategoryBusinesses);

module.exports = router;
