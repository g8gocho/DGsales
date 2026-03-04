// api/create-call.js
module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "RETELL_API_KEY missing on server" });

    // Parse JSON body safely (Vercel provides req.body sometimes; handle both)
    let body = req.body;
    if (!body || typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch { body = {}; }
    }

    const agent_id = body.agent_id || "agent_901b51dc8d7fecaef2e68a82b4";
    if (!agent_id) return res.status(400).json({ error: "agent_id is required" });

    // ✅ Retell Call (V2) Create Web Call
    const r = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.message || data?.error || "Retell create-web-call failed",
        details: data,
      });
    }

    // Retell returns { access_token, call_id, ... }
    return res.status(200).json({ access_token: data.access_token, call_id: data.call_id });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unknown server error" });
  }
};
