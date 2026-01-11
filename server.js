const express = require("express");

const app = express();
app.use(express.json());

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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional real estate consultant in India."
          },
          {
            role: "user",
            content: message
          }
        ]
      }),
    });

    const data = await response.json();

    // ✅ CORRECT WAY TO READ RESPONSE
    let reply = "AI could not generate a response";

    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.content) {
          for (const block of item.content) {
            if (block.type === "output_text") {
              reply = block.text;
              break;
            }
          }
        }
      }
    }

    res.json({ reply });

  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({
      error: "OpenAI failed",
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
