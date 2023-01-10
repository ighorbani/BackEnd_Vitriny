const express = require("express");
const { body } = require("express-validator");
const invoiceController = require("../controllers/invoiceController");
const router = express.Router();
const isAuth = require("../middleware/is-auth");

router.get("/getBusinessInvoices/", isAuth, invoiceController.getBusinessInvoices);
router.post("/getUserBusinessInvoices/", isAuth, invoiceController.getUserBusinessInvoices);
router.get("/getUserInvoices/", isAuth, invoiceController.getUserInvoices);
router.get("/getUnpayedInvoicesCount/", isAuth, invoiceController.getUnpayedInvoicesCount);
router.get("/getInvoice/:invoiceId", isAuth, invoiceController.getInvoice);
router.post("/createInvoice/",
body("name").trim().isLength({min:3,max:60}).withMessage("لطفا بین 3 تا 60 کاراکتر"),
body("price").trim().isNumeric().withMessage("فقط عدد"),
body("unit").trim().isLength({min:3,max:30}).withMessage("لطفا بین 3 تا 30 کاراکتر"),
isAuth, invoiceController.createInvoice);
router.get("/calculateBusinessFinancial/", isAuth, invoiceController.calculateBusinessFinancial);
router.put("/editInvoice/",
body("name").trim().isLength({min:3,max:60}).withMessage("لطفا بین 3 تا 60 کاراکتر"),
body("price").trim().isNumeric().withMessage("فقط عدد"),
body("unit").trim().isLength({min:3,max:30}).withMessage("لطفا بین 3 تا 30 کاراکتر"),
isAuth, invoiceController.editInvoice);
router.put("/payInvoice/", isAuth, invoiceController.payInvoice);

module.exports = router;
