const express = require("express");
const app = express();

app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki is LIVE!");
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agentic-ai-meraki",
    time: new Date()
  });
});

// Temporary test chat route
app.post("/chat", (req, res) => {
  const userMessage = req.body.message || "No message received";

  res.json({
    reply: `AI received your message: "${userMessage}"`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
