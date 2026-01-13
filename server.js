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
    time: new Date().toISOString(),
  });
});

// ==============================
// CHAT ENDPOINT (UNCHANGED)
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

    return res.json(JSON.parse(response.output_text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});

// ==============================
// AGENTIC AI – STRUCTURED INTAKE
// ==============================
app.post("/agent-intake", async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || !payload.intent) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // ------------------------------
    // AI DECISION (UNCHANGED)
    // ------------------------------
    const systemPrompt = `
You are Meraki AI, a senior real estate consultant in India.

Decide:
- lead_stage (cold | warm | hot)
- recommended_action (whatsapp | call | educate)

Respond ONLY in JSON.
`;

    const userContext = `
Intent: ${payload.intent}
Location: ${payload.location}
Budget: ${payload.budget_range}
Property Type: ${payload.unit_type}
`;

    const aiResponse = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContext }
      ]
    });

    let aiResult = JSON.parse(aiResponse.output_text);

    // ==============================
    // 🔒 CRITICAL FIX
    // ==============================
    // Phone NOT present → brain decision only
    // NO CRM, NO SHEET, NO PRIVYR
    if (!payload.phone) {
      return res.json({
        success: true,
        lead_stage: aiResult.lead_stage,
        recommended_action: aiResult.recommended_action
      });
    }

    // ==============================
    // FINAL LEAD COMMIT (PHONE PRESENT)
    // ==============================

    const finalLead = {
      intent: payload.intent,
      budget: payload.budget_range,
      location: payload.location,
      property_type: payload.unit_type,
      lead_stage: aiResult.lead_stage,
      recommended_action: aiResult.recommended_action,
      phone: payload.phone,
      email: payload.email || "",
      source: payload.source,
      page_url: payload.page_url,
      created_at: new Date().toISOString()
    };

    // ------------------------------
    // GOOGLE SHEET / CRM
    // ------------------------------
    if (process.env.CRM_WEBHOOK_URL) {
      await fetch(process.env.CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalLead)
      });
    }

    // ------------------------------
    // PRIVYR
    // ------------------------------
    if (process.env.PRIVYR_WEBHOOK_URL) {
      await fetch(process.env.PRIVYR_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "AI Property Match Lead",
          phone: payload.phone,
          email: payload.email || "",
          source: payload.source,
          notes: `
Intent: ${payload.intent}
Location: ${payload.location}
Budget: ${payload.budget_range}
Property: ${payload.unit_type}
Lead Stage: ${aiResult.lead_stage}
`
        })
      });
    }

    return res.json({
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
