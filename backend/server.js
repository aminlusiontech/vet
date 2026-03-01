const express = require("express");
const ErrorHandler = require("./middleware/error");
const connectDatabase = require("./db/Database");
const app = express();
const fs = require("fs");
const path = require("path");

const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

// Ensure uploads directory exists (use same logic as multer)
const { getUploadsDir } = require("./multer");
const uploadsDir = getUploadsDir();
console.log("Server using uploads directory:", uploadsDir);

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}
// connect db
connectDatabase();

// create server
const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

// middlewares
app.use(
  express.json({
    limit: "50mb",
  })
);
app.use(cookieParser());
// trust reverse proxy (needed for secure cookies behind HTTPS terminator like Dokploy)
app.set("trust proxy", 1);
// Enable CORS for all routes

app.use(
  cors({
    origin: [
      "https://vafront.lt-webdemolink.com",
      "http://vafront.lt-webdemolink.com",
      "http://localhost:3000",
      "https://localhost:3000",
      "http://127.0.0.1:3000",
      "https://127.0.0.1:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Serve static files from uploads directory (use same path as multer)
// Use absolute path to ensure consistency
const absoluteUploadsDir = path.resolve(uploadsDir);
app.use("/", express.static(absoluteUploadsDir));
console.log("Static files being served from:", absoluteUploadsDir);

app.get("/test", (req, res) => {
  res.send("Hello World!");
});

app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// why bodyparser?
// bodyparser is used to parse the data from the body of the request to the server (POST, PUT, DELETE, etc.)

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// routes
const user = require("./controller/user");
const admin = require("./controller/admin");
const shop = require("./controller/shop");
const product = require("./controller/product");
const event = require("./controller/event");
const payment = require("./controller/payment");
const order = require("./controller/order");
const message = require("./controller/message");
const conversation = require("./controller/conversation");
const withdraw = require("./controller/withdraw");
const wallet = require("./controller/wallet");
const pages = require("./controller/homePage");
const staticPages = require("./controller/staticPage");
const blog = require("./controller/blogPost");
const siteOptions = require("./controller/siteOptions");
const offer = require("./controller/offer");
const paymentSettings = require("./controller/paymentSettings");
const paymentRoutes = require("./routes/paymentRoutes");
const discount = require("./controller/discount");
const notification = require("./controller/notification");
const contact = require("./controller/contact");
const newsletter = require("./controller/newsletter");
app.use("/api/v2/withdraw", withdraw);
app.use("/api/v2/discount", discount);

// end points
app.use("/api/v2/user", user);
app.use("/api/v2/admin", admin);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/message", message);
app.use("/api/v2/order", order);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/event", event);
app.use("/api/v2/payment", payment);
app.use("/api/v2/payment", paymentRoutes);
app.use("/api/v2/pages", pages);
app.use("/api/v2/pages", staticPages);
app.use("/api/v2", blog);
// Mount paymentSettings BEFORE siteOptions to avoid route conflict
// paymentSettings handles /api/v2/options/payment-settings
// siteOptions handles /api/v2/options/:slug? (more general route)
app.use("/api/v2/options", paymentSettings);
app.use("/api/v2", siteOptions);
app.use("/api/v2/wallet", wallet);
app.use("/api/v2/offer", offer);
app.use("/api/v2/notification", notification.router);
app.use("/api/v2/contact", contact);
app.use("/api/v2/newsletter", newsletter);

// it'for errhendel
app.use(ErrorHandler);

// Handling Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`shutting down the server for handling UNCAUGHT EXCEPTION! 💥`);
});

// unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`shutting down the server for unhandle promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});
