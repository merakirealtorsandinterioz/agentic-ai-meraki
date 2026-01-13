const express = require("express");
const OpenAI = require("openai");

// ==============================
// APP SETUP
// ==============================
const app = express();
app.use(express.json({ limit: "1mb" }));

// ==============================
// CORS (SAFE)
// ==============================
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
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
    mode: "LOCKED_FLOW",
    time: new Date().toISOString(),
  });
});

// ==============================
// AGENTIC AI – SINGLE ENDPOINT
// ==============================
app.post("/agent-intake", async (req, res) => {
  try {
    const payload = req.body || {};

    // --------------------------------
    // MODE DETECTION
    // --------------------------------
    const hasPhone = !!payload.phone; // phone mandatory only in COMMIT
    const isCommit = hasPhone === true;

    // --------------------------------
    // BASIC VALIDATION (COMMON)
    // --------------------------------
    if (!payload.intent) {
      return res.status(400).json({ error: "Intent missing" });
    }

    // ============================================================
    // MODE-1 : BRAIN MODE (NO PHONE / EMAIL)
    // ============================================================
    if (!isCommit) {
      const systemPrompt = `
You are Meraki AI, a senior Indian real estate consultant.

You are receiving ANONYMOUS INTENT DATA.
Do NOT ask for contact.
Do NOT think about sales.

Task:
- Decide lead_stage: cold | warm | hot
- Decide recommended_action: educate | whatsapp | call

Respond ONLY in JSON:
{
  "lead_stage": "cold | warm | hot",
  "recommended_action": "educate | whatsapp | call",
  "internal_summary": "short reasoning"
}
`;

      const userContext = `
Intent: ${payload.intent}
Location: ${payload.location}
Budget Range: ${payload.budget_range}
Property Type: ${payload.unit_type}
Page URL: ${payload.page_url}
`;

      const aiResponse = await client.responses.create({
        model: "gpt-5-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext }
        ]
      });

      let aiResult;
      try {
        aiResult = JSON.parse(aiResponse.output_text);
      } catch {
        aiResult = {
          lead_stage: "warm",
          recommended_action: "educate",
          internal_summary: "fallback"
        };
      }

      // 🔒 BRAIN RESPONSE ONLY (NO CRM / NO PRIVYR)
      return res.json({
        success: true,
        lead_stage: aiResult.lead_stage,
        recommended_action: aiResult.recommended_action
      });
    }

    // ============================================================
    // MODE-2 : COMMIT MODE (PHONE PRESENT)
    // ============================================================

    // Safety: phone validation
    if (!/^[6-9]\d{9}$/.test(payload.phone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // Trust frontend brain result (NO RE-CALCULATION)
    const leadStage = payload.lead_stage || "warm";
    const recommendedAction = payload.recommended_action || "educate";

    // --------------------------------
    // NORMALISED DATA
    // --------------------------------
    const commitData = {
      intent: payload.intent || null,

      budget: payload.budget_range
        ? parseInt(payload.budget_range.split("-")[0]) * 100000
        : null,

      location: payload.location || null,

      property_type: payload.unit_type
        ? payload.unit_type.toUpperCase()
        : "unknown",

      lead_stage: leadStage,

      ask_contact: true,

      followup_type: recommendedAction,

      phone: payload.phone,
      email: payload.email || null,

      source: payload.source || "AI_Property_Match_Engine",
      page_url: payload.page_url || "",
      created_at: new Date().toISOString()
    };

    // --------------------------------
    // CRM / GOOGLE SHEET (NON-BLOCKING)
    // --------------------------------
    if (process.env.CRM_WEBHOOK_URL) {
      try {
        await fetch(process.env.CRM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(commitData)
        });
      } catch (e) {
        console.error("CRM webhook failed");
      }
    }

    // --------------------------------
    // PRIVYR WEBHOOK (NON-BLOCKING)
    // --------------------------------
    if (process.env.PRIVYR_WEBHOOK_URL) {
      try {
        await fetch(process.env.PRIVYR_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "AI Property Match Lead",
            phone: commitData.phone,
            email: commitData.email || "",
            source: commitData.source,
            notes: `
Intent: ${commitData.intent}
Location: ${commitData.location}
Budget: ${payload.budget_range}
Property Type: ${commitData.property_type}

Lead Stage: ${commitData.lead_stage}
Recommended Action: ${recommendedAction}

Page URL:
${commitData.page_url}
            `.trim()
          })
        });
      } catch (e) {
        console.error("Privyr webhook failed");
      }
    }

    // --------------------------------
    // FINAL RESPONSE
    // --------------------------------
    return res.json({
      success: true,
      committed: true,
      lead_stage: leadStage,
      recommended_action: recommendedAction
    });

  } catch (error) {
    console.error("Agent Intake Error:", error);
    return res.status(500).json({ error: "Agent intake failed" });
  }
});

// ==============================
// SERVER START
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Agentic AI Meraki running on port ${PORT}`);
});
