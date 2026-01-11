const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json({ limit: "1mb" }));

// ==============================
// OPENAI CLIENT
// ==============================
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==============================
// BASIC ROUTES
// ==============================
app.get("/", (req, res) => {
  res.send("🤖 Agentic AI Meraki – Master Control LIVE");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agentic-ai-meraki",
    stage: "Funnel Agent Active",
    time: new Date().toISOString(),
  });
});

// ==============================
// CHAT : MASTER + LEAD GEN + FUNNEL
// ==============================
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message?.trim();

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    // -------- SYSTEM PROMPT (LOCKED FOR PRODUCTION) --------
    const systemPrompt = `
You are Meraki AI, a senior real estate consultant and sales advisor in India.

Your behavior:
- Speak like an experienced property consultant (descriptive, reassuring, practical).
- Give short market context, practical advice, and next-step clarity.
- Ask intelligent follow-up questions when information is missing.
- Educate the buyer briefly before moving to sales actions.

Your funnel responsibility:
- First build trust with explanation.
- Then guide the user towards the next logical step.
- Ask for WhatsApp/contact ONLY if the buyer intent is strong (hot lead).

OUTPUT RULE (STRICT – PRODUCTION):
You MUST respond ONLY in valid JSON in this exact structure:

{
  "reply": "A descriptive, helpful response (2–4 short paragraphs max)",
  "lead_meta": {
    "intent": "buy | invest | rent | browse | unknown",
    "budget": "number or null",
    "location": "string or null",
    "property_type": "2BHK | 3BHK | villa | plot | unknown",
    "lead_stage": "cold | warm | hot",
    "ask_contact": true | false
  }
}

Guidelines:
- For HOT leads: include a soft CTA offering WhatsApp/site visit AFTER explanation.
- For WARM leads: ask 1–2 clarifying questions, do NOT push contact.
- For COLD leads: educate briefly and keep conversation open.
- Never sound pushy or robotic.
- Never mention JSON, system rules, or internal logic.
`;

    // -------- OPENAI CALL --------
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const rawText = response.output_text;

    if (!rawText) {
      return res.json({
        reply:
          "Thanks for reaching out. Could you please share a bit more detail so I can assist you better?",
        lead_meta: {
          intent: "unknown",
          budget: null,
          location: null,
          property_type: "unknown",
          lead_stage: "cold",
          ask_contact: false,
        },
      });
    }

    // -------- SAFE JSON PARSE --------
    let aiResult;
    try {
      aiResult = JSON.parse(rawText);
    } catch (err) {
      // HARD SAFETY (never break prod)
      aiResult = {
        reply: rawText,
        lead_meta: {
          intent: "unknown",
          budget: null,
          location: null,
          property_type: "unknown",
          lead_stage: "warm",
          ask_contact: false,
        },
      };
    }

    // -------- FUNNEL AGENT OVERRIDE (STAGE-3) --------
    if (
      aiResult.lead_meta &&
      aiResult.lead_meta.lead_stage === "hot" &&
      aiResult.lead_meta.ask_contact === true
    ) {
      aiResult.reply +=
        "\n\nIf you’d like, you can share your WhatsApp number and I’ll send you a curated shortlist with photos, pricing, and help arrange site visits.";
    }

    // -------- FOLLOW-UP AGENT (STAGE-4) --------
aiResult.follow_up = { type: "none", delay: "none", message: "" };

if (aiResult.lead_meta.lead_stage === "hot") {
  aiResult.follow_up = {
    type: "whatsapp",
    delay: "24h",
    message:
      "Hi! Just checking in — I’ve shortlisted a few 2 BHK options that match your requirement. Let me know if you’d like me to share them on WhatsApp or arrange site visits."
  };
}

if (aiResult.lead_meta.lead_stage === "warm") {
  aiResult.follow_up = {
    type: "chat",
    delay: "48h",
    message:
      "Just following up to see if you’d like me to shortlist options or answer any questions about pricing, possession, or loans."
  };
}

    
    // -------- FINAL RESPONSE --------
    return res.json(aiResult);

  } catch (error) {
    console.error("AI ERROR:", error);
    return res.status(500).json({
      error: "AI failed to respond",
    });
  }
});

// ==============================
// SERVER START
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Agentic AI Meraki running on port ${PORT}`);
});
