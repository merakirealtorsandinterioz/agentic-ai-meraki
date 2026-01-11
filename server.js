const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// OpenAI client (API key Render ENV se aayegi)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    time: new Date().toISOString(),
  });
});

// REAL AI CHAT ENDPOINT
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: "You are a helpful real estate AI assistant for India.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    // ✅ SAFE TEXT EXTRACTION
    const reply =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "No response from AI";

    res.json({ reply });

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({
      error: "AI failed",
      details: error.message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
