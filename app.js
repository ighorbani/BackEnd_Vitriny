const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");

//CLEAN UP FUNCTIONS
const cleanUp = require("./helpers/cleanUp-functions");
// cleanUp.addNewFieldsToUsers()

const categoryRouter = require("./routes/categoryRouter");
const adminRouter = require("./routes/adminRouter");
const locationRouter = require("./routes/locationRouter");
const commentRouter = require("./routes/commentRouter");
const reportRouter = require("./routes/reportRouter");
const productRouter = require("./routes/productRouter");
const postRouter = require("./routes/postRouter");
const businessRouter = require("./routes/businessRouter");
const chatRouter = require("./routes/chatRouter");
const userRouter = require("./routes/userRouter");
const invoiceRouter = require("./routes/invoiceRouter");

const mongoose = require("mongoose");
const multer = require("multer");
const MONGODB_URI = process.env.MONGODB_URI;

const app = express();
mongoose.set('strictQuery', false);
// DEFIGN IMAGE STORAGE FOR MULTER
const uploadsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "sound") {
      cb(null, "./uploads/sounds/");
    } else if (file.fieldname === "image") {
      cb(null, "./uploads/upload/");
    }
  },
  filename: (req, file, cb) => {
    if (file.fieldname === "sound") {
      cb(null, new Date().toISOString().replace(/:/g, "-") + ".mp3");
    } else if (file.fieldname === "image") {
      cb(null, new Date().toISOString().replace(/:/g, "-") + ".jpg");
    }
  },
});

// DEFIGN FILE UPLOAD FILTER FOR MULTER
function checkFileType(file, cb) {
  if (file.fieldname === "image") {
    if (
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/webp" ||
      file.mimetype === "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  } else if (file.fieldname === "sound") {
    if (file.mimetype === "audio/mpeg") {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
}

app.use(bodyParser.json());

// prettier-ignore
app.use(multer({ storage: uploadsStorage ,limits: {fileSize: 20 * 1000 * 1024}, fileFilter: (req, file, cb) => {checkFileType(file, cb);} }).fields([ { name: 'image', maxCount: 1 }, { name: 'sound', maxCount: 1 }]));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// SET HEADERS FOR API
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// USER DEFIGNED ROUTES
app.use(locationRouter);
app.use(adminRouter);
app.use(categoryRouter);
app.use(commentRouter);
app.use(reportRouter);
app.use(productRouter);
app.use(businessRouter);
app.use(chatRouter);
app.use(postRouter);
app.use(userRouter);
app.use(invoiceRouter);


// ERROR REPORTING
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(status).json({ message: message });
});

// CONNECT TO MONGOOSE
mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    const server = app.listen(8080);
    const io = require("./socket").init(server);
    console.log("CONNECTED MONGOOSE !!!");
  })
  .catch((err) => {
    console.log(err);
  });
