export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Validate env
    if (!process.env.RETELL_API_KEY) {
      return res.status(500).json({
        error: "Missing RETELL_API_KEY on server",
        hint: "Set RETELL_API_KEY in Vercel Project Settings → Environment Variables, then redeploy."
      });
    }

    // Parse body safely (object or string)
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }

    const agent_id = body?.agent_id;
    if (!agent_id) {
      return res.status(400).json({ error: "Missing agent_id in request body" });
    }

    const response = await fetch("https://api.retellai.com/v1/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Retell API error",
        status: response.status,
        details: data,
      });
    }

    if (!data?.access_token) {
      return res.status(500).json({
        error: "Retell did not return access_token",
        details: data,
      });
    }

    return res.status(200).json({ access_token: data.access_token });
  } catch (error) {
    console.error("create-call handler error:", error);
    return res.status(500).json({
      error: "Server error",
      message: error?.message || String(error),
    });
  }
}