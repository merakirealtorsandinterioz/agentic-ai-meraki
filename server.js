const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- ROOT ----------
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki – Master Control LIVE");
});

// ---------- HEALTH ----------
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agentic-ai-meraki",
    stage: "Lead Gen Agent Active",
    time: new Date().toISOString(),
  });
});

// ---------- CHAT (Master Control + Lead Gen) ----------
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    // SYSTEM PROMPT = MASTER + LEAD GEN AGENT
    const systemPrompt = `
You are an expert real estate sales AI for India.

Your tasks:
1. Understand buyer intent (buy / rent / invest)
2. Extract lead details if possible (budget, location, property type)
3. Respond like a professional real estate consultant
4. DO NOT force contact details
5. If buyer intent is strong, softly ask for WhatsApp or phone number

Always return JSON in this exact format:

{
  "reply": "text for user",
  "lead_meta": {
    "intent": "",
    "budget": "",
    "location": "",
    "property_type": "",
    "lead_stage": "cold | warm | hot",
    "ask_contact": true | false
  }
}
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    let outputText = response.output_text;

    // Safety fallback
    if (!outputText) {
      return res.json({
        reply: "Thanks for your query. Could you please share a bit more detail?",
        lead_meta: { lead_stage: "cold", ask_contact: false },
      });
    }

    // Try parsing JSON safely
    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch (e) {
      parsed = {
        reply: outputText,
        lead_meta: { lead_stage: "warm", ask_contact: false },
      };
    }

    res.json(parsed);

  } catch (error) {
    console.error("AI ERROR:", error.message);
    res.status(500).json({
      error: "AI failed",
      details: error.message,
    });
  }
});

// ---------- START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Agentic AI Meraki running on port ${PORT}`);
});
