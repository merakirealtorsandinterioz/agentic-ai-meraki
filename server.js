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
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const rawText = response.output_text;

    let aiResult;
    try {
      aiResult = JSON.parse(rawText);
    } catch {
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
            user_message: userMessage,
            created_at: new Date().toISOString(),
          }),
        });
      } catch {}
    }

    return res.json(aiResult);
  } catch {
    return res.status(500).json({ error: "AI failed to respond" });
  }
});

// ==============================
// AGENTIC AI – STRUCTURED INTAKE
// ==============================
app.post("/agent-intake", async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || !payload.intent) {
      return res.status(400).json({ error: "Invalid intake payload" });
    }

    // ✅ ONLY ADDITIONS
    const phone = payload.phone || "";
    const email = payload.email || "";

    const systemPrompt = `
You are Meraki AI, a senior real estate consultant in India.

You are receiving a QUALIFIED LEAD from a landing page.

Decide:
- lead stage (cold / warm / hot)
- next best action (whatsapp / call / educate)

Respond ONLY in JSON:
{
  "lead_stage": "cold | warm | hot",
  "recommended_action": "whatsapp | call | educate",
  "internal_summary": "short reasoning"
}
`;

    const userContext = `
Intent: ${payload.intent}
Location: ${payload.location}
Budget Range: ${payload.budget_range}
Property Type: ${payload.unit_type}
Phone: ${phone}
Email: ${email}

Page URL: ${payload.page_url}
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContext },
      ],
    });

    let aiResult;
    try {
      aiResult = JSON.parse(response.output_text);
    } catch {
      aiResult = {
        lead_stage: "warm",
        recommended_action: "educate",
        internal_summary: "fallback",
      };
    }

    // ==============================
    // GOOGLE SHEET (UNCHANGED + phone + email)
    // ==============================
    if (process.env.CRM_WEBHOOK_URL) {
      try {
        await fetch(process.env.CRM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: payload.intent || null,
            budget: payload.budget_range || null,
            location: payload.location || null,
            property_type: payload.unit_type || null,

            phone: phone,   // ✅ added
            email: email,   // ✅ added (optional)

            lead_stage: aiResult.lead_stage,
            ask_contact: aiResult.recommended_action !== "educate",
            followup_type: aiResult.recommended_action,
            message: aiResult.internal_summary || "",
            source: payload.source,
            page_url: payload.page_url,
            created_at: new Date().toISOString(),
          }),
        });
      } catch {}
    }

    // ==============================
    // PRIVYR (UNCHANGED + phone + email)
    // ==============================
    if (process.env.PRIVYR_WEBHOOK_URL) {
      try {
        await fetch(process.env.PRIVYR_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "AI Property Match Lead",
            phone: phone,
            email: email, // ✅ optional

            source: payload.source || "AI Property Match Engine",
            notes: `
Intent: ${payload.intent}
Location: ${payload.location}
Budget: ${payload.budget_range}
Property Type: ${payload.unit_type}

Lead Stage: ${aiResult.lead_stage}
Recommended Action: ${aiResult.recommended_action}

${aiResult.internal_summary}
            `.trim(),
          }),
        });
      } catch {}
    }

    res.json({
      success: true,
      lead_stage: aiResult.lead_stage,
      recommended_action: aiResult.recommended_action,
    });
  } catch {
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
