const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// OpenAI client (API key Render ENV se aayegi)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Root route
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki is LIVE with GPT!");
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

// REAL AI CHAT ENDPOINT
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: `You are Meraki AI, a professional real estate consultant for Noida & Greater Noida.
User query: ${userMessage}`
    });

    res.json({
      reply: response.output_text
    });

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({
      error: "AI failed to respond"
    });
  }
});

// Start server (Render auto PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
