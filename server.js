const express = require("express");

const app = express();
app.use(express.json());

// Root
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki is LIVE");
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// CHAT
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a professional real estate consultant in India.",
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    res.json({
      reply:
        data.choices?.[0]?.message?.content ||
        "AI response unavailable",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Server running on port", PORT)
);
