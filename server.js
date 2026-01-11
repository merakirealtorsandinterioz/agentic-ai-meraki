const express = require("express");
const app = express();

// Middleware
app.use(express.json());

// Root route (homepage)
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki is LIVE!");
});

// Health check (Render + future monitoring)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agentic-ai-meraki",
    time: new Date().toISOString()
  });
});

// Start server (Render uses PORT automatically)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
