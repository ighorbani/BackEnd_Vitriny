const { validationResult } = require("express-validator");
const Location = require("../models/location");

// RETURN ALL LOCATIONS
exports.getLocations = (req, res, next) => {
  Location.find()
    .then((locations) => {
      res.status(200).json({
        locations: locations,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN LOCATION WHICH USER HAD SEARCHED
exports.searchLocation = (req, res, next) => {
  let searchKey = req.params.location;
  searchKey = searchKey.charAt(0).toUpperCase() + searchKey.slice(1);

  Location.find({ "cities.title": { $regex: searchKey } })
    .then((provinces) => {
      const resultPairs = provinces?.map((province) => {
        const city = province?.cities?.filter((city) => {
          if (city.title.includes(searchKey)) {
            return true;
          }
        });

        return {
          city: city[0],
          province: province.province,
          provinceId: province._id,
        };
      });
      res.status(200).json({
        resultPairs: resultPairs,
        state: "Finded",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
