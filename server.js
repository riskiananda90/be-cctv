import express from "express";
import cameraRoutes from "./routes/camera.js";
import authRoutes from "./routes/auth.js";
import statsRoutes from "./routes/stats.js";

const app = express();
app.use(express.json());

app.use("/api/cameras", cameraRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
