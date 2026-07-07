const express = require("express");
const dotenv = require("dotenv");
const taskRoutes = require("./routes/taskRoutes");
const db = require("./config/db");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
// Routes
app.use("/api/tasks", taskRoutes);
app.get("/", (req, res) => res.send("task Service is running"));
const PORT = process.env.PORT || 5002;
app.listen(PORT, '0.0.0.0' ,() => console.log(`✅ Task-service running on port ${PORT}`));
