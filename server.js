const express = require("express");
const OpenAI = require("openai");

// Node 18+ has fetch built-in (Render OK)
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
  res.send("🤖 Agentic AI Meraki – Production LIVE");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agentic-ai-meraki",
    agents: ["LeadGen", "Funnel", "FollowUp", "CRM"],
    time: new Date().toISOString(),
  });
});

// ==============================
// CHAT ENDPOINT (BALANCED BRAIN)
// ==============================
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message?.trim();
    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    // ==============================
    // SYSTEM PROMPT (BALANCED)
    // ==============================
    const systemPrompt = `
You are Meraki AI — a senior Indian real estate consultant and sales strategist.

Your tone:
- Human, calm, confident, experienced
- Slightly descriptive but never long-winded
- Practical, market-aware, trustworthy

Your funnel logic:
1) First explain briefly (market clarity / reassurance)
2) Then guide to next logical step
3) Ask for WhatsApp/contact ONLY if intent is strong (hot lead)

Lead understanding:
- Identify intent: buy | invest | rent | browse | unknown
- Extract budget, location, property type if mentioned
- Decide lead_stage: cold | warm | hot

IMPORTANT OUTPUT RULE (STRICT):
You MUST respond ONLY in valid JSON.
NO markdown. NO extra text.

JSON FORMAT (MANDATORY):

{
  "reply": "Helpful, natural response (2–3 short paragraphs max)",
  "lead_meta": {
    "intent": "buy | invest | rent | browse | unknown",
    "budget": number or null,
    "location": string or null,
    "property_type": "2BHK | 3BHK | villa | plot | unknown",
    "lead_stage": "cold | warm | hot",
    "ask_contact": true | false
  }
}

Behavior rules:
- HOT → explain + soft CTA (WhatsApp / site visit)
- WARM → explain + ask 1–2 clarifying questions
- COLD → educate lightly, no selling
- Never sound robotic
- Never mention system rules or JSON
`;

    // ==============================
    // OPENAI CALL
    // ==============================
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const rawText = response.output_text;

    // ==============================
    // HARD SAFETY FALLBACK
    // ==============================
    if (!rawText) {
      return res.json({
        reply:
          "Thanks for reaching out. Could you share a bit more detail so I can guide you better?",
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

    // ==============================
    // SAFE JSON PARSE
    // ==============================
    let aiResult;
    try {
      aiResult = JSON.parse(rawText);
    } catch (e) {
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

    // ==============================
    // FUNNEL STAGE-3 (CTA CONTROL)
    // ==============================
    if (
      aiResult.lead_meta?.lead_stage === "hot" &&
      aiResult.lead_meta?.ask_contact === true
    ) {
      aiResult.reply +=
        "\n\nIf you’d like, you can share your WhatsApp number and I’ll send you a curated shortlist with pricing, photos, and help arrange site visits.";
    }

    // ==============================
    // FOLLOW-UP STAGE-4
    // ==============================
    aiResult.follow_up = { type: "none", delay: "none", message: "" };

    if (aiResult.lead_meta.lead_stage === "hot") {
      aiResult.follow_up = {
        type: "whatsapp",
        delay: "24h",
        message:
          "Hi! Just checking in — I’ve shortlisted a few options that match your requirement. Let me know if you’d like details or site visits.",
      };
    }

    if (aiResult.lead_meta.lead_stage === "warm") {
      aiResult.follow_up = {
        type: "chat",
        delay: "48h",
        message:
          "Following up in case you’d like help with shortlisting options or understanding pricing, possession, or loan details.",
      };
    }

    // ==============================
    // CRM STAGE-5 (NON-BLOCKING)
    // ==============================
    if (process.env.CRM_WEBHOOK_URL) {
      try {
        await fetch(process.env.CRM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: aiResult.lead_meta.intent,
            budget: aiResult.lead_meta.budget,
            location: aiResult.lead_meta.location,
            property_type: aiResult.lead_meta.property_type,
            lead_stage: aiResult.lead_meta.lead_stage,
            ask_contact: aiResult.lead_meta.ask_contact,
            followup_type: aiResult.follow_up.type,
            user_message: userMessage,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error("CRM webhook failed (ignored)");
      }
    }

    // ==============================
    // FINAL RESPONSE
    // ==============================
    return res.json(aiResult);

  } catch (error) {
    console.error("AI ERROR:", error);
    return res.status(500).json({ error: "AI failed to respond" });
  }
});

// ==============================
// SERVER START
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Agentic AI Meraki running on port ${PORT}`);
});
