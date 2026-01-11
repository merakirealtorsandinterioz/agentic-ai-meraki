const express = require("express");

const app = express();
app.use(express.json());

// Root
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki is LIVE with REAL AI!");
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agentic-ai-meraki",
    ai: "connected",
    time: new Date().toISOString()
  });
});

// REAL AI CHAT (NO SDK – DIRECT API)
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.status(400).json({ error: "message is required" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: `You are a professional real estate AI assistant in India.
User query: ${userMessage}`
      })
    });

    const data = await response.json();

    res.json({
      reply: data.output_text || "AI response unavailable"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI failed" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
