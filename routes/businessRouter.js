const express = require("express");
const { body } = require("express-validator");
const businessController = require("../controllers/businessController");
const router = express.Router();
const isAuth = require("../middleware/is-auth");

router.get("/getBusinessView/:slug", businessController.getBusinessView);
// prettier-ignore
router.get("/getBusinessAdmin/:slug", isAuth, businessController.getBusinessAdmin);
// prettier-ignore
router.get("/businesses", businessController.getBusinesses);
// prettier-ignore
router.put( "/business/deleteSocial/:socialId", isAuth, businessController.deleteSocial);
// prettier-ignore
router.post( "/business/setGoogleLocation/:slug", isAuth, businessController.setGoogleLocation);
// prettier-ignore
router.put( "/business/deleteGoogleLocation/:slug", isAuth, businessController.deleteGoogleLocation);
// prettier-ignore
router.put( "/deactivateBusiness/:businessId", isAuth, businessController.deactivateBusiness);
// prettier-ignore
router.put( "/banBusiness/:businessId", isAuth, businessController.banBusiness);
// prettier-ignore
router.post( "/generalSearch/:searchValue", businessController.generalSearch);
// prettier-ignore
router.put( "/business/deleteFeature/:featureId/", isAuth, businessController.deleteFeature);
// prettier-ignore
router.put( "/business/deletePhone/:phoneId/", isAuth, businessController.deletePhone);
router.get("/business/getSocial/:socialId", businessController.getSocial);
router.get("/business/getPhone/:phoneId", businessController.getPhone);
router.get("/business/getFeature/:featureId", businessController.getFeature);

// prettier-ignore
router.post(
    "/business/registerBusiness/",
     body("title").trim().isLength({min:3, max:25}).withMessage("لطفا بین 3 تا 25 کاراکتر"), 
     isAuth,
     businessController.createBusiness);

// prettier-ignore
router.put(
    "/editBusiness/:slug",
    body("title").trim().isLength({min:3, max:25}).withMessage("لطفا بین 3 تا 25 کاراکتر"),
    body("slug").trim().isLength({min:3,max:30}).matches(/^[A-Za-z0-9.,-_]+$/).withMessage("لطفا بین 3 تا 30 کاراکتر شامل حروف انگلیسی  - _ و عدد بدون فاصله"),
    body("description").trim().isLength({min:10,max:800}).withMessage("لطفا بین 10 تا 800 کاراکتر"),
     isAuth,
     businessController.updateBusiness);

// prettier-ignore
router.post(
    "/business/addFeature/:businessId",
    body("title").trim().isLength({min:2,max:20}).withMessage("لطفا بین 2 تا 20 کاراکتر"),
    body("value").trim().isLength({min:2,max:20}).withMessage("لطفا بین 2 تا 20 کاراکتر"),
     isAuth,
     businessController.addFeature);

// prettier-ignore
router.put(
    "/business/editFeature/:featureId/",
    body("title").trim().isLength({min:2,max:20}).withMessage("لطفا بین 2 تا 20 کاراکتر"),
    body("value").trim().isLength({min:2,max:20}).withMessage("لطفا بین 2 تا 20 کاراکتر"),
     isAuth,
     businessController.editFeature);

// prettier-ignore
router.post(
    "/business/addPhone/:businessId",
    body("number").trim().isLength({min:8}).withMessage("حداقل باید 8 کاراکتر باشد"),
    isAuth,
    businessController.addPhone);

// prettier-ignore
router.put(
    "/business/editPhone/:phoneId/",
    body("number").trim().isLength({min:8}).withMessage("حداقل باید 8 کاراکتر باشد"),
    isAuth,
    businessController.editPhone);

router.post(
  "/business/sendFinancialInformation/",
  body("fullName").trim().isLength({min:3,max:70}).withMessage("لطفا بین 3 تا 70 کاراکتر"),
  body("address").trim().isLength({min:10,max:200}).withMessage("لطفا بین 10 تا 200 کاراکتر"),
  body("description").trim().isLength({max:500}).withMessage("لطفا بین 0 تا 500 کاراکتر"),
  isAuth,
  businessController.sendFinancialInformation
);

// prettier-ignore
router.post(
    "/business/addSocial/:businessId", 
    body("link").trim().isLength({min:3}).withMessage("حداقل باید شامل 3 کاراکتر باشد."),
    isAuth, 
    businessController.addSocial);

// prettier-ignore
router.put(
    "/business/editSocial/:socialId",
    body("link").trim().isLength({min:3}).withMessage("حداقل باید شامل 3 کاراکتر باشد."),
    isAuth,
    businessController.editSocial);

module.exports = router;
