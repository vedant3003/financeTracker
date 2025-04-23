const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

// const databaseRoutes = require("./api/routes/database");
// const currentInfoRoutes = require("./api/routes/currentInfo");
// const verifyRoutes = require("./api/routes/verify");

const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

// Import access control models and middleware
const AccessControl = require("./models/AccessControl");
const { isAuthenticated, isAdmin } = require("./middleware/auth");

mongoose.connect(
  "mongodb+srv://prakharb2k6:" +
    process.env.MONGOPASS +
    "@cluster0.kjjpy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

const app = express();
app.use(cors());
app.use(morgan("dev")); //middleware that logs requests to the console
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Add a route to check authentication status and role
app.get("/auth/status", isAuthenticated, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      user_id: req.user.user_id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// Add a route to check if user is admin
app.get("/auth/admin", isAuthenticated, isAdmin, (req, res) => {
  res.json({
    isAdmin: true,
    user: {
      user_id: req.user.user_id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

app.use("/users", userRoutes);
app.use("/categories", categoryRoutes);
app.use("/transactions", transactionRoutes);

// app.use("/database", databaseRoutes);
// app.use("/currentInfo", currentInfoRoutes);
// app.use("/verify", verifyRoutes);

app.use((req, res, next) => {
  //all the requests and responses have to pass through our app and the next parameter allows us to pass them to the next middleware to be processed/executed
  res.status(200).json({
    //status 200 indicates "OK"
    message:
      "Hello there, welcome to Finance Tracker! You are NOT supposed to be here...", //custom JSON message
  });
});

//if the request reaches this point, i.e., it wasn't able to find the above two routes, it throws the following error!
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

//error status code 500 means internal server error, the following middleware might not be useful at this point, but later on when we add a database and it has its own operations and something fails, our request will reach this and throw an error accordingly
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

app.use((req, res, next) => {
  //setting CORS headers before handling routes, these do not send a response, but rather modify it, so that whenever we send a response, it has these headers
  res.header("Access-Control-Allow-Origin", "*"); //(Initially it was Not-Allowed but now we set it to Allowed, these headers need a value so we give * as a value so that all the URLs are allowed - you could also give https://devsoc.club but typically RESTful APIs allow all the URLs to have access!)
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, user_id, password"
  ); //these are some of the default headers than need to be added in order to avoid the CORS error, you can read about each one of them online
  if (req.method === "OPTIONS") {
    //whenever you send a GET, DELETE, PATCH, POST, or a PUT request, the browser always responds with an OPTIONS method which is inevitable, thus, to overcome this, we set a custom header for this too
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next(); //to end our middleware if we're not returning immediately due to receiving the OPTIONS request so that the other routes can't take over
});

module.exports = app; //lets us use our express app elsewhere in the backend program
