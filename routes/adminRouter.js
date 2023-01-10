const express = require("express");
const adminController = require("../controllers/adminController");
const router = express.Router();
const isAdmin = require("../middleware/is-admin");

router.get("/admin/getAdmin", isAdmin, adminController.getAdmin);
router.post("/admin/loginAdminVerification", adminController.loginVerification);
router.post("/admin/loginAdminNumber", adminController.loginNumber);
router.post("/adminSearch/:searchValue", isAdmin, adminController.adminSearch);
router.post("/admin/searchBySort/:searchParameter", isAdmin, adminController.searchBySort);
router.post("/activateUser", isAdmin, adminController.ActivateUser);
router.post("/activateBusiness", isAdmin, adminController.ActivateBusiness);
router.post("/activateSupportMode", isAdmin, adminController.ActivateSupportMode);

module.exports = router;
