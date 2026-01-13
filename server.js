const express = require("express");
const OpenAI = require("openai");

// Node 18+ has fetch built-in (Render OK)
const app = express();
app.use(express.json({ limit: "1mb" }));

// ==============================
// CORS FIX (FRONTEND PERMISSION)
// ==============================
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});


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
// AGENTIC AI – STRUCTURED INTAKE
// ==============================
app.post("/agent-intake", async (req, res) => {
  try {
    const payload = req.body;

    // Basic validation
    if (!payload || !payload.intent) {
      return res.status(400).json({ error: "Invalid intake payload" });
    }

    // AI system prompt (decision-making only)
    const systemPrompt = `
You are Meraki AI, a senior real estate consultant in India.

You are receiving a QUALIFIED LEAD from a landing page.
This is NOT a casual chat.

Your task:
- Confirm intent
- Decide lead stage (cold / warm / hot)
- Decide next best action (whatsapp / call / educate)

Respond ONLY in JSON:

{
  "lead_stage": "cold | warm | hot",
  "recommended_action": "whatsapp | call | educate",
  "internal_summary": "short reasoning"
}
`;

    const userContext = `
Lead Source: ${payload.source}
Channel: ${payload.channel}

Intent: ${payload.intent}
Location: ${payload.location}
Budget Range: ${payload.budget_range}
Property Type: ${payload.unit_type}

Page URL: ${payload.page_url}
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContext }
      ]
    });

    let aiResult;
    try {
      aiResult = JSON.parse(response.output_text);
    } catch {
      aiResult = {
        lead_stage: "warm",
        recommended_action: "educate",
        internal_summary: "fallback"
      };
    }

    // Push to CRM / Google Sheet (safe, non-blocking)
    try {
      await fetch(process.env.CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  intent: payload.intent || null,

  // convert budget_range → number (approx)
  budget: payload.budget_range
    ? parseInt(payload.budget_range.split("-")[0]) * 100000
    : null,

  location: payload.location || null,

  // convert unit_type → property_type
  property_type: payload.unit_type
    ? payload.unit_type.toUpperCase()
    : "unknown",

  lead_stage: aiResult.lead_stage,

  ask_contact: aiResult.recommended_action !== "educate",

  followup_type: aiResult.recommended_action,

  message: aiResult.internal_summary || "",

  source: payload.source,
  page_url: payload.page_url,
  created_at: new Date().toISOString()
})

      });
    } catch (e) {
      console.error("CRM webhook failed");
    }

    // Fast response to frontend
    res.json({
      success: true,
      lead_stage: aiResult.lead_stage,
      recommended_action: aiResult.recommended_action
    });

  } catch (error) {
    console.error("Agent Intake Error:", error);
    res.status(500).json({ error: "Agent intake failed" });
  }
});



// ==============================
// SERVER START
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Agentic AI Meraki running on port ${PORT}`);
});
