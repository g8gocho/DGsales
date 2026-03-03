export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const response = await fetch(
      'https://api.retellai.com/update-agent/agent_901b51dc8d7fecaef2e68a82b4',
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_name: 'DGsales Voice Agent',
          voice_id: 'openai-Alloy',
          language: 'es-ES',
          begin_message: 'Hola, soy el asistente de voz de DGsales. ¿En qué puedo ayudarte hoy?',
          prompt: 'Eres el agente de voz de DGsales, una agencia especializada en webs de alto impacto y agentes de voz con IA. Tu objetivo es responder preguntas sobre nuestros servicios y planes, y guiar a los visitantes hacia agendar una consulta o contratar. Servicios: 1. Web Starter (499€ one-time): Landing page premium, copywriting, integración de leads. 2. AI Agent Pro (999€ setup): Agente de voz 24/7, agenda de reservas directas, soporte multilingüe. Responde siempre de forma amigable y profesional en el idioma del visitante (español o inglés).'
        })
      }
    );
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
