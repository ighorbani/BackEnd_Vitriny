const express = require("express");
const locationController = require("../controllers/locationController");
const router = express.Router();

router.get("/locations/", locationController.getLocations);
// prettier-ignore
router.get( "/searchLocation/:location", locationController.searchLocation);

module.exports = router;
