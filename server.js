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
1) First explain briefly
2) Then guide to next logical step
3) Ask for WhatsApp/contact ONLY if intent is strong (hot lead)

Lead understanding:
- Identify intent: buy | invest | rent | browse | unknown
- Extract budget, location, property type
- Decide lead_stage: cold | warm | hot

IMPORTANT:
Respond ONLY in valid JSON.
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

    // FOLLOW-UP LOGIC (UNCHANGED)
    aiResult.follow_up = { type: "none", delay: "none", message: "" };

    if (aiResult.lead_meta.lead_stage === "hot") {
      aiResult.follow_up = {
        type: "whatsapp",
        delay: "24h",
        message:
          "Hi! Just checking in — I’ve shortlisted a few options that match your requirement.",
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
            followup_type: aiResult.follow_up.type,
            user_message: userMessage,
            created_at: new Date().toISOString(),
          }),
        });
      } catch {}
    }

    return res.json(aiResult);
  } catch (error) {
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

    const systemPrompt = `
You are Meraki AI, a senior real estate consultant in India.

Decide:
- lead_stage (cold / warm / hot)
- recommended_action (whatsapp / call / educate)

Respond ONLY in JSON.
`;

    const userContext = `
Intent: ${payload.intent}
Location: ${payload.location}
Budget Range: ${payload.budget_range}
Property Type: ${payload.unit_type}
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
    // GOOGLE SHEET / CRM PUSH  ✅ PHONE + EMAIL ADDED
    // ==============================
    if (process.env.CRM_WEBHOOK_URL) {
      try {
        await fetch(process.env.CRM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: payload.intent || null,
            budget: payload.budget_range
              ? parseInt(payload.budget_range.split("-")[0]) * 100000
              : null,
            location: payload.location || null,
            property_type: payload.unit_type || "unknown",
            lead_stage: aiResult.lead_stage,
            ask_contact: aiResult.recommended_action !== "educate",
            followup_type: aiResult.recommended_action,
            message: aiResult.internal_summary || "",
            phone: payload.phone || "",   // ✅ ADDED
            email: payload.email || "",   // ✅ ADDED
            source: payload.source,
            page_url: payload.page_url,
            created_at: new Date().toISOString(),
          }),
        });
      } catch {}
    }

    // ==============================
    // PRIVYR WEBHOOK  ✅ PHONE + EMAIL ADDED
    // ==============================
    if (process.env.PRIVYR_WEBHOOK_URL) {
      try {
        await fetch(process.env.PRIVYR_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "AI Property Match Lead",
            phone: payload.phone || "",
            email: payload.email || "",
            source: payload.source || "AI Property Match Engine",
            notes: `
Intent: ${payload.intent}
Location: ${payload.location}
Budget: ${payload.budget_range}
Property Type: ${payload.unit_type}
Lead Stage: ${aiResult.lead_stage}
Action: ${aiResult.recommended_action}
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
  } catch (error) {
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
