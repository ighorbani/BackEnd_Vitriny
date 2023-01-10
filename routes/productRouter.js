const sharp = require("sharp");
const express = require("express");
const { body } = require("express-validator");
const productController = require("../controllers/productController");
const router = express.Router();
const isAuth = require("../middleware/is-auth");

router.post("/userProducts", productController.getProducts);
// prettier-ignore
router.post(
    "/addProduct/:businessId/",
     isAuth,
     body("name").trim().isLength({min:3,max:30}).withMessage("لطفا بین 3 تا 30 کاراکتر"),
     body("description").trim().isLength({min:10,max:800}).withMessage("لطفا بین 10 تا 800 کاراکتر"),
     productController.createProduct);
// prettier-ignore
router.put(
    "/editProduct/:productId/",
    body("name").trim().isLength({min:3,max:30}).withMessage("لطفا بین 3 تا 30 کاراکتر"),
    body("description").trim().isLength({min:10,max:800}).withMessage("لطفا بین 10 تا 800 کاراکتر"),
     isAuth,
     productController.editProduct);
// prettier-ignore
router.get( "/businessProducts/:businessId/:currentPage", productController.businessProducts);
router.get("/getProduct/:productId", productController.getProduct);
router.put(
  "/deleteProduct/:productId",
  isAuth,
  productController.deleteProduct
);

module.exports = router;
