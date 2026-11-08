const express = require("express");
const app = express();

const authRoutes = require("./auth.routes");
const usersRoutes= require("./user.routes");
const partnerRoutes= require("./partner.routes");
const vehiclesRoutes= require("./vehicle.routes");
const ridesRoutes= require("./ride.routes");
const locationRoutes = require('./location.routes');


// const driverMarketplaceRoutes= require("./driver.marketplace.routes");




app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/partners", partnerRoutes);
app.use("/vehicles", vehiclesRoutes);
app.use("/rides", ridesRoutes);
app.use("/locations", locationRoutes);

// app.use("/marketplace", driverMarketplaceRoutes);


module.exports = app;
