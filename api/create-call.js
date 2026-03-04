module.exports = async (req, res) => {
  // Habilitar CORS para cualquier origen y permitir POST/OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder de inmediato a las peticiones preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Llamada al endpoint de Retell para crear el access token
    const response = await fetch(
      'https://api.retellai.com/v1/create-access-token',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // ID de tu agente Retell
          agent_id: 'agent_901b51dc8d7fecaef2e68a82b4',
        }),
      }
    );

    const data = await response.json();

    // Devolver solo el access_token
    return res.status(200).json({
      access_token: data.access_token,
    });

  } catch (err) {
    // Devolver error si algo falla
    return res.status(500).json({
      error: err.message,
    });
  }
};
