
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "NetSpot backend is running!",
    timestamp: new Date().toISOString(),
  });
});

// 2. Ping endpoint
app.get("/api/ping", (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  res.json({
    status: "success",
    message: "Network test successful!",
    timestamp: new Date().toISOString(),
  });
});

// 3. Download speed-test endpoint
app.get("/api/speed-test", (req, res) => {
  const sizeInBytes = 1024 * 1024; // 1 MB

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", sizeInBytes);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  res.end(Buffer.alloc(sizeInBytes));
});

// Start server
app.listen(PORT, () => {
  console.log(`NetSpot backend running at http://localhost:${PORT}`);
});
