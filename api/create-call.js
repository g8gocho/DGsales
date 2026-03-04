module.exports = async (req, res) => {
  // --- CORS (por si llamas desde GitHub Pages también) ---
  res.setHeader("Access-Control-Allow-Origin", "https://g8gocho.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // --- Body parse (por si req.body viene vacío) ---
    let body = req.body;
    if (!body || typeof body === "string") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      body = raw ? JSON.parse(raw) : {};
    }

    const agent_id = body?.agent_id;
    if (!agent_id) return res.status(400).json({ error: "Missing agent_id" });

    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing RETELL_API_KEY in Vercel env" });

    const r = await fetch("https://api.retellai.com/v1/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id }),
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) return res.status(r.status).json(data);

    return res.status(200).json({ access_token: data.access_token });
  } catch (e) {
    console.error("create-call error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
};
