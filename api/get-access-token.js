export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // DEBUG: loguear si la API key está presente
  const apiKey = process.env.RETELL_API_KEY;
  console.log('RETELL_API_KEY present:', !!apiKey);

  // Si no hay API key, devolver error explícito
  if (!apiKey) {
    return res.status(500).json({ error: "Missing RETELL_API_KEY env var" });
  }

  // DEV: Devuelve un token de prueba para que el frontend nunca reciba undefined
  // Elimina este bloque cuando tengas la URL y body reales de Retell
  return res.status(200).json({ access_token: "token_de_prueba" });

  /*
  // Cuando tengas la URL y body reales de Retell, descomenta y ajusta esto:
  try {
    const response = await fetch('https://api.retellai.com/access-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ /* parámetros requeridos por Retell * / })
    });
    const data = await response.json();
    if (!data.access_token) {
      return res.status(500).json({ error: "No access_token from Retell", details: data });
    }
    return res.status(200).json({ access_token: data.access_token });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
  */
}
