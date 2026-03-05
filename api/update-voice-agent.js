module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Step 1: Create a Retell LLM with DGsales prompt
    const llmRes = await fetch('https://api.retellai.com/create-retell-llm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        general_prompt: 'Eres el agente de voz de DGsales, una agencia especializada en webs de alto impacto y agentes de voz con IA. Tu objetivo es responder preguntas sobre nuestros servicios y guiar a los visitantes a contratar. Servicios: 1. Web Starter (499EUR one-time): Landing page premium, copywriting, integracion de leads. 2. AI Agent Pro (999EUR setup): Agente de voz 24/7, agenda de reservas directas, soporte multilingue. Responde siempre amigable y profesional en el idioma del visitante (espanol o ingles). Al final de cada conversacion, invita al usuario a dejar su email para una demo personalizada.',
        begin_message: 'Hola! Soy el asistente de voz de DGsales. Puedo contarte sobre nuestros servicios de webs e IA. Como puedo ayudarte?'
      })
    });
    const llmData = await llmRes.json();
    if (!llmRes.ok) return res.status(llmRes.status).json({ step: 'create-llm', error: llmData });

    // Step 2: Create a voice agent using the new LLM
    const agentRes = await fetch('https://api.retellai.com/create-agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_name: 'DGsales Voice Agent',
        response_engine: { type: 'retell-llm', llm_id: llmData.llm_id },
        voice_id: 'openai-Alloy',
        language: 'multi',
        responsiveness: 1,
        interruption_sensitivity: 1,
        enable_backchannel: false
      })
    });
    const agentData = await agentRes.json();
    if (!agentRes.ok) return res.status(agentRes.status).json({ step: 'create-agent', error: agentData });

    return res.status(200).json({
      success: true,
      llm_id: llmData.llm_id,
      agent_id: agentData.agent_id,
      message: 'New DGsales voice agent created! Update AGENT_ID in index.html to: ' + agentData.agent_id
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
