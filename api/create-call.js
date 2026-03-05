export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "no-store");

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

    const normalizeAgentId = (value) => {
      if (typeof value !== "string") return value;
      return value.replace(/\\n/g, "").trim();
    };

    const requestedAgentId = normalizeAgentId(body?.agent_id);
    const fallbackAgentId = normalizeAgentId(process.env.RETELL_AGENT_ID);
    const fallbackAgentIdEn = normalizeAgentId(process.env.RETELL_AGENT_ID_EN);
    const fallbackAgentIdEs = normalizeAgentId(process.env.RETELL_AGENT_ID_ES);
    const requestLanguage = String(body?.language || "").toLowerCase();
    const languageCode = requestLanguage.startsWith("es")
      ? "es"
      : requestLanguage.startsWith("en")
        ? "en"
        : null;

    const languageOrderedFallbacks = languageCode === "es"
      ? [fallbackAgentIdEs, fallbackAgentIdEn, fallbackAgentId]
      : languageCode === "en"
        ? [fallbackAgentIdEn, fallbackAgentIdEs, fallbackAgentId]
        : [fallbackAgentId, fallbackAgentIdEn, fallbackAgentIdEs];

    if (!requestedAgentId && !languageOrderedFallbacks.some(Boolean)) {
      return res.status(400).json({
        error: "Missing agent_id",
        hint: "Send agent_id in request body or set RETELL_AGENT_ID / RETELL_AGENT_ID_EN / RETELL_AGENT_ID_ES on server.",
      });
    }

    const candidateAgentIds = [requestedAgentId, ...languageOrderedFallbacks].filter(
      (id, index, arr) => Boolean(id) && arr.indexOf(id) === index
    );

    const headers = {
      Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
      "Content-Type": "application/json",
    };

    const retellUrls = [
      "https://api.retellai.com/v2/create-web-call",
      "https://api.retellai.com/v1/create-web-call",
      "https://api.retellai.com/create-web-call",
    ];

    let response;
    let data = {};
    let lastStatus = 0;
    let chosenAgentId = null;

    for (const candidateAgentId of candidateAgentIds) {
      const payload = JSON.stringify({ agent_id: candidateAgentId });
      chosenAgentId = candidateAgentId;

      // Retell has changed web-call routes across API versions; try compatible paths.
      for (const url of retellUrls) {
        response = await fetch(url, {
          method: "POST",
          headers,
          body: payload,
        });
        data = await response.json().catch(() => ({}));
        lastStatus = response.status;

        if (response.ok) break;
        if (response.status !== 404) break;
      }

      if (response?.ok) break;

      const msg = String(data?.message || "").toLowerCase();
      const isChatAgentError = msg.includes("chat agent");
      const canTryFallback = candidateAgentId === requestedAgentId && candidateAgentId !== fallbackAgentId;
      if (!(isChatAgentError && canTryFallback)) break;
    }

    if (!response || !response.ok) {
      const hint = lastStatus === 404
        ? "Verify RETELL_API_KEY and that agent_id exists in the same Retell workspace."
        : String(data?.message || "").toLowerCase().includes("chat agent")
          ? "Use a Retell voice agent (not chat agent). Set RETELL_AGENT_ID in Vercel env with a valid voice agent id."
        : undefined;

      return res.status(lastStatus || 500).json({
        error: "Retell API error",
        status: lastStatus || 500,
        hint,
        details: data,
      });
    }

    if (!data?.access_token) {
      return res.status(500).json({
        error: "Retell did not return access_token",
        details: data,
      });
    }

    return res.status(200).json({
      access_token: data.access_token,
      agent_id: chosenAgentId,
      language_selected: languageCode || "auto",
    });
  } catch (error) {
    console.error("create-call handler error:", error);
    return res.status(500).json({
      error: "Server error",
      message: error?.message || String(error),
    });
  }
}