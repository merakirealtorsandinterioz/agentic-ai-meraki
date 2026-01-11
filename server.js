const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Root
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki is LIVE");
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// CHAT (LATEST OPENAI RESPONSES API)
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: "You are a professional real estate consultant in India.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const outputText =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "No response generated";

    res.json({ reply: outputText });
  } catch (err) {
    console.error("OPENAI ERROR:", err);
    res.status(500).json({
      error: "AI failed",
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Server running on port", PORT)
);
