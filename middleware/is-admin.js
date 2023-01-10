const jwt = require("jsonwebtoken");

// ADMIN AUTHENTICATION FUNCTION
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }
  const token = req.headers.authorization.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(
      JSON.parse(token),
      process.env.ACCESS_TOKEN_SECRET
    );
  } catch (err) {
    res.status(401).json({
      state: "Unauthorized",
    });
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error("not authenticated.");
    error.statusCode = 401;
    throw error;
  }
  req.adminId = decodedToken.adminId;
  next();
};
