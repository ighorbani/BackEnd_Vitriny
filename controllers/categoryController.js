const Category = require("../models/category");
const Business = require("../models/business");

//RETURN ALL CATEGORIES IN USER CITY
exports.getUserCategories = async (req, res, next) => {
  const userLocation = req.body.userLocation;
  try {
    const areaBusinesses = await Business.find({
      "businessInfo.cityId": userLocation.id,
    });

    const areaBusinessesCats = areaBusinesses.map((business) => {
      return business.inCategoryId;
    });

    const categoriesList = await Category.find({ parent: "" });
    const parentSlugs = categoriesList.map((cat) => cat.slug);

    const childCategories = await Category.find({
      parent: { $in: parentSlugs },
    });

    const result = categoriesList.map((category) => {
      return {
        ...category,
        childCats: childCategories.filter((childCat) => {
          if (childCat.parent === category.slug) {
            if (
              areaBusinessesCats.some((catId) => {
                return catId.equals(childCat._id);
              })
            ) {
              return true;
            }
          }
        }),
      };
    });

    res.status(200).json({
      result: result,
      state: "Ok",
    });
  } catch (err) {
    console.log("error");
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
};

//RETURN ALL CATEGORIES
exports.getCategories = async (req, res, next) => {
  try {
    const categoriesList = await Category.find({ parent: "" });
    const parentSlugs = categoriesList.map((cat) => cat.slug);

    const childCategories = await Category.find({
      parent: { $in: parentSlugs },
    });

    const result = categoriesList.map((category) => {
      return {
        ...category,
        childCats: childCategories.filter((childCat) => {
          if (childCat.parent === category.slug) {
            return true;
          }
        }),
      };
    });

    res.status(200).json({
      result: result,
      state: "Ok",
    });
  } catch (err) {
    console.log("error");
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
};

//RETURN BUSINESSES WHICH ARE IN THIS CATEGORY
exports.getCategoryBusinesses = async (req, res, next) => {
  let catId = req.params.catId;
  let allCats = req.body.allCats;

  if (allCats === "true") {
    allCats = await Category.find({ parent: catId });
    catId = allCats.map((cat) => cat._id);
  }

  try {
    const businesses = await Business.find({ inCategoryId: catId }).populate(
      "inCategoryId"
    );

    res.status(200).json({
      businesses: businesses,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
};
