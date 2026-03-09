export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Aquí va la lógica de tu endpoint, por ejemplo:
  try {
    // Simulación de respuesta exitosa
    return res.status(200).json({ ok: true, message: 'CORS habilitado correctamente.' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
