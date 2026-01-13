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

IMPORTANT OUTPUT RULE:
Respond ONLY in valid JSON.
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    let aiResult;
    try {
      aiResult = JSON.parse(response.output_text);
    } catch {
      aiResult = {
        reply: "Thanks for reaching out. We’ll guide you shortly.",
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

    if (!payload || !payload.intent) {
      return res.status(400).json({ error: "Invalid intake payload" });
    }

    const systemPrompt = `
You are Meraki AI, a senior real estate consultant in India.

You are receiving a QUALIFIED LEAD from a landing page.

Decide:
- lead stage (cold / warm / hot)
- next best action (whatsapp / call / educate)

Respond ONLY in JSON.
`;

    const userContext = `
Intent: ${payload.intent}
Location: ${payload.location}
Budget: ${payload.budget_range}
Property Type: ${payload.unit_type}
Page URL: ${payload.page_url}
`;

    let aiResult;

    // ===== FIX: SAFE AI CALL WITH FALLBACK =====
    try {
      const response = await client.responses.create({
        model: "gpt-5-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
      });

      aiResult = JSON.parse(response.output_text);

    } catch (err) {
      console.error("OpenAI failed, using fallback");
      aiResult = {
        lead_stage: "warm",
        recommended_action: "whatsapp",
        internal_summary: "AI fallback used",
      };
    }

    // Push to Google Sheet / CRM
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
            lead_stage: aiResult.lead_stage,
            ask_contact: aiResult.recommended_action !== "educate",
            followup_type: aiResult.recommended_action,
            message: aiResult.internal_summary || "",
            source: payload.source,
            page_url: payload.page_url,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.error("CRM webhook failed");
      }
    }

    // Privyr
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
Recommended Action: ${aiResult.recommended_action}
            `.trim(),
          }),
        });
      } catch (err) {
        console.error("Privyr webhook failed");
      }
    }

    // FINAL RESPONSE (THIS MAKES POPUP WORK)
    res.json({
      success: true,
      lead_stage: aiResult.lead_stage,
      recommended_action: aiResult.recommended_action,
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
