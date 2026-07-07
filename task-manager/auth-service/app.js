const express = require("express");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("Auth Service is running"));


const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0' ,() => console.log(`Auth Service running on port ${PORT}`));
