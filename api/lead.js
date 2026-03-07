export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (_) {
        body = {};
      }
    }

    const source = String(body?.source || "website").trim().toLowerCase();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const company = String(body?.company || "").trim();
    const message = String(body?.message || "").trim();
    const website = String(body?.website || "").trim();

    // Basic honeypot anti-spam field: real users leave it empty.
    if (website) return res.status(200).json({ ok: true });

    const isVoiceSource = source.includes("voice");

    if (!name || !email) {
      if (!isVoiceSource) {
        return res.status(400).json({ error: "Missing required fields: name and email" });
      }
    }

    const normalizedName = name || "Voice Reservation";
    const normalizedEmail = email || `voice-reservation+${Date.now()}@dgsales.local`;

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!validEmail) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const lead = {
      name: normalizedName,
      email: normalizedEmail,
      company,
      message,
      source,
      created_at: new Date().toISOString(),
    };

    // Optional CRM/Webhook forwarding without code changes.
    if (process.env.LEAD_WEBHOOK_URL) {
      const webhookRes = await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });

      if (!webhookRes.ok) {
        const details = await webhookRes.text().catch(() => "");
        console.error("lead webhook error", webhookRes.status, details);
      }
    }

    // Optional direct Google Sheets forwarding.
    const googleScriptUrl =
      process.env.GOOGLE_SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbxEQI6Y9tOKqthfHtdz1kORFsX5o-jFFH5UXmGXhByltRi7VPvwnFFXcjPLRVoRFwbkzQ/exec";

    if (googleScriptUrl) {
      const sheetsPayload = {
        date: lead.created_at,
        source: lead.source,
        name: lead.name,
        email: lead.email,
        phone: "",
        company: lead.company,
        notes: lead.message,
      };

      // Apps Script deployments may reject POST depending on deployment mode.
      let sheetsRes = await fetch(googleScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sheetsPayload),
      });

      if (!sheetsRes.ok && sheetsRes.status === 405) {
        const query = new URLSearchParams(sheetsPayload).toString();
        sheetsRes = await fetch(`${googleScriptUrl}?${query}`, { method: "GET" });
      }

      const sheetsText = await sheetsRes.text().catch(() => "");
      let sheetsJson = null;
      try {
        sheetsJson = sheetsText ? JSON.parse(sheetsText) : null;
      } catch (_) {
        sheetsJson = null;
      }

      if (!sheetsRes.ok) {
        return res.status(502).json({
          ok: false,
          error: "Google Sheets request failed",
          status: sheetsRes.status,
          details: sheetsText,
          source: lead.source,
        });
      }

      if (sheetsJson && sheetsJson.ok === false) {
        return res.status(502).json({
          ok: false,
          error: "Google Sheets logical failure",
          details: sheetsJson,
          source: lead.source,
        });
      }
    }

    // Keep minimal server log for backup visibility in Vercel logs.
    console.log("new_lead", lead);

    return res.status(200).json({ ok: true, message: "Lead received", source: lead.source });
  } catch (error) {
    console.error("lead handler error:", error);
    return res.status(500).json({
      error: "Server error",
      message: error?.message || String(error),
    });
  }
}
