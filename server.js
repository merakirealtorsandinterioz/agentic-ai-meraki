const express = require("express");

const app = express();
app.use(express.json());

// ==============================
// BASIC ROUTES
// ==============================

app.get("/", (req, res) => {
  res.send("🤖 Meraki AI – Agentic Real Estate Assistant is LIVE");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "meraki-agentic-ai",
    time: new Date().toISOString(),
  });
});

// ==============================
// MASTER CONTROL AGENT (MCA)
// ==============================

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // ----- MASTER SYSTEM PROMPT -----
    const systemPrompt = `
You are Meraki AI, the Master Control Agent for a real estate business in India.

Your goals:
1) Reply like a senior real estate consultant (helpful, practical, professional).
2) Ask smart follow-up questions if information is missing.
3) Classify the lead internally.

IMPORTANT OUTPUT RULE:
You MUST respond ONLY in valid JSON in this exact format:

{
  "reply": "string (natural human reply for the user)",
  "lead_meta": {
    "intent": "buy | invest | browse | unknown",
    "budget": "number or null",
    "location": "string or null",
    "property_type": "2BHK | 3BHK | villa | plot | unknown",
    "timeline": "immediate | 3-6 months | 6-12 months | unknown",
    "lead_quality": "hot | warm | cold"
  }
}
`;

    // ----- OPENAI API CALL (STABLE CHAT COMPLETIONS) -----
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
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "Invalid AI response" });
    }

    // ----- SAFE JSON PARSE -----
    let aiOutput;
    try {
      aiOutput = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      return res.status(500).json({
        error: "AI response parsing failed",
        raw: data.choices[0].message.content,
      });
    }

    // ----- FINAL RESPONSE -----
    res.json({
      reply: aiOutput.reply,
      lead_meta: aiOutput.lead_meta,
    });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: "AI failed to respond" });
  }
});

// ==============================
// SERVER START
// ==============================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Meraki Agentic AI running on port ${PORT}`);
});
