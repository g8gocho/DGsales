module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch(
      'https://api.retellai.com/v1/create-access-token',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: 'agent_901b51dc8d7fecaef2e68a82b4',
        }),
      }
    );

    const data = await response.json();

    return res.status(200).json({
      access_token: data.access_token,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};
