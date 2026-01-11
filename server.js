const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Root
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki is LIVE with GPT!");
});

// Health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agentic-ai-meraki",
    time: new Date().toISOString(),
  });
});

// CHAT
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: `You are a professional real estate consultant in India.
User query: ${message}`,
    });

    // ✅ SAFEST EXTRACTION
    const reply =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "No AI response generated";

    res.json({ reply });

  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({
      error: "OpenAI failed",
      message: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
