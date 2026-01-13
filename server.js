const express = require("express");
const OpenAI = require("openai");

// ==============================
// APP SETUP
// ==============================
const app = express();
app.use(express.json({ limit: "1mb" }));

// ==============================
// CORS FIX
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
  res.send("🤖 Meraki Agentic AI – LIVE");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "agentic-ai-meraki",
    time: new Date().toISOString(),
  });
});

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYER 1 — AGENTIC BRAIN (NO COMMIT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Understand intent
• Decide cold / warm / hot
• Generate sales-ready MESSAGE
• NO CRM / Sheet / Privyr push
*/
app.post("/agent-brain", async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || !payload.intent) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const systemPrompt = `
You are Meraki AI — a senior Indian real estate consultant.

Your task:
1. Understand buyer intent clearly
2. Decide lead_stage: cold | warm | hot
3. Decide recommended_action: whatsapp | call | educate
4. Generate a SHORT sales message explaining WHY

Rules:
- Message is for SALES TEAM (not user)
- Max 2–3 short lines
- Clear, practical, actionable
- Do NOT mention AI or system

Respond ONLY in JSON:

{
  "lead_stage": "cold | warm | hot",
  "recommended_action": "whatsapp | call | educate",
  "message": "sales-ready reasoning"
}
`;

    // ✅ UPGRADED CONTEXT (timeline added)
    const userContext = `
Intent: ${payload.intent}
Location: ${payload.location}
Budget: ${payload.budget_range}
Property Type: ${payload.unit_type}
Purchase Timeline: ${payload.purchase_timeline || "Not specified"}
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
        message:
          "User interest noted but urgency is moderate. Recommend light WhatsApp follow-up."
      };
    }

    // ⚠️ NO COMMIT HERE
    return res.json({
      success: true,
      ...aiResult
    });

  } catch (err) {
    console.error("Agent Brain Error:", err);
    res.status(500).json({ error: "Brain failed" });
  }
});

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYER 2 + 3 — IDENTITY + SINGLE COMMIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Phone mandatory, Email optional
• EXACTLY ONE COMMIT
• Sheet + CRM + Privyr
*/
app.post("/agent-commit", async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || !payload.intent || !payload.phone) {
      return res.status(400).json({ error: "Intent & phone required" });
    }

    // ==============================
    // NORMALISE DATA (UPGRADED)
    // ==============================
    const leadData = {
      intent: payload.intent || null,
      budget: payload.budget_range
        ? parseInt(payload.budget_range.split("–")[0]) * 100000
        : null,
      location: payload.location || null,
      property_type: payload.unit_type
        ? payload.unit_type.toUpperCase()
        : "unknown",
      purchase_timeline: payload.purchase_timeline || "unknown",
      lead_stage: payload.lead_stage || "warm",
      ask_contact: true,
      followup_type: payload.recommended_action || "educate",
      message: payload.message || "",
      phone: payload.phone,
      email: payload.email || "",
      source: payload.source || "AI_Property_Match_Engine",
      page_url: payload.page_url || "",
      created_at: new Date().toISOString()
    };

    // ==============================
    // GOOGLE SHEET / CRM
    // ==============================
    if (process.env.CRM_WEBHOOK_URL) {
      try {
        await fetch(process.env.CRM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(leadData)
        });
      } catch {
        console.error("CRM webhook failed");
      }
    }

    // ==============================
    // PRIVYR
    // ==============================
    if (process.env.PRIVYR_WEBHOOK_URL) {
      try {
        await fetch(process.env.PRIVYR_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "AI Property Match Lead",
            phone: leadData.phone,
            email: leadData.email,
            source: leadData.source,
            notes: `
Intent: ${leadData.intent}
Location: ${leadData.location}
Budget: ${payload.budget_range}
Property Type: ${payload.unit_type}
Purchase Timeline: ${leadData.purchase_timeline}

Lead Stage: ${leadData.lead_stage}
Action: ${leadData.followup_type}

Sales Note:
${leadData.message}

Page:
${leadData.page_url}
            `.trim()
          })
        });
      } catch {
        console.error("Privyr webhook failed");
      }
    }

    // ==============================
    // FINAL RESPONSE
    // ==============================
    res.json({
      success: true,
      committed: true,
      lead_stage: leadData.lead_stage,
      followup_type: leadData.followup_type
    });

  } catch (err) {
    console.error("Agent Commit Error:", err);
    res.status(500).json({ error: "Commit failed" });
  }
});

// ==============================
// SERVER START
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Meraki Agentic AI running on port ${PORT}`);
});
