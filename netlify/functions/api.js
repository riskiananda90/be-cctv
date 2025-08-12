const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("../../routes/auth");
const cameraRoutes = require("../../routes/camera");
const statsRoutes = require("../../routes/stats");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/camera", cameraRoutes);
app.use("/stats", statsRoutes);

module.exports.handler = serverless(app);
