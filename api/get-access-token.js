export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Aquí deberías obtener el token real desde tu proveedor (Retell/LiveKit)
  // Por ahora, devuelve un token de prueba para que el frontend nunca reciba undefined
  const access_token = process.env.RETELL_ACCESS_TOKEN || "token_de_prueba";

  if (!access_token) {
    return res.status(500).json({ error: "No access_token available" });
  }

  return res.status(200).json({ access_token });
}
