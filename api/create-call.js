export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RETELL_API_KEY;
  const agentId =
    process.env.RETELL_AGENT_ID_ES ||
    process.env.RETELL_AGENT_ID ||
    process.env.RETELL_AGENT_ID_EN;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing RETELL_API_KEY env var' });
  }

  if (!agentId) {
    return res.status(500).json({ error: 'Missing RETELL_AGENT_ID env var' });
  }

  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
      }),
    });

    const data = await response.json();

    console.log('Retell response status:', response.status);
    console.log('Retell response json:', data);

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Retell create-web-call failed',
        details: data,
      });
    }

    if (!data.access_token) {
      return res.status(500).json({
        error: 'No access_token returned by Retell',
        details: data,
      });
    }

    return res.status(200).json({
      access_token: data.access_token,
      call_id: data.call_id,
    });
  } catch (error) {
    console.error('create-call error:', error);
    return res.status(500).json({
      error: error.message || 'Unknown error',
    });
  }
}
}
