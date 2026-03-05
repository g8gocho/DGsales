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

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const company = String(body?.company || "").trim();
    const message = String(body?.message || "").trim();
    const website = String(body?.website || "").trim();

    // Basic honeypot anti-spam field: real users leave it empty.
    if (website) return res.status(200).json({ ok: true });

    if (!name || !email) {
      return res.status(400).json({ error: "Missing required fields: name and email" });
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validEmail) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const lead = {
      name,
      email,
      company,
      message,
      source: "website",
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
        return res.status(502).json({
          error: "Lead webhook error",
          status: webhookRes.status,
          details,
        });
      }
    }

    // Keep minimal server log for backup visibility in Vercel logs.
    console.log("new_lead", lead);

    return res.status(200).json({ ok: true, message: "Lead received" });
  } catch (error) {
    console.error("lead handler error:", error);
    return res.status(500).json({
      error: "Server error",
      message: error?.message || String(error),
    });
  }
}
