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

// ===============================
// 🧠 AGENTIC AI – CHAT ENDPOINT
// ===============================
app.post("/chat", (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({
      error: "Message is required"
    });
  }

  // Temporary AI brain (dummy response)
  const aiReply = `You said: "${userMessage}". Agentic AI Meraki is listening.`;

  res.json({
    reply: aiReply
  });
});

// Start server (Render uses PORT automatically)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Simple chat test route (no AI yet)
app.post("/chat", (req, res) => {
  const userMessage = req.body.message;

  res.json({
    reply: `You said: ${userMessage}`
  });
});
