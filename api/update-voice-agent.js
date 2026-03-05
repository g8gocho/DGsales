module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.RETELL_API_KEY) {
      return res.status(500).json({ error: 'Missing RETELL_API_KEY on server' });
    }

    const headers = {
      'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const createLlm = async ({ generalPrompt, beginMessage }) => {
      const llmRes = await fetch('https://api.retellai.com/create-retell-llm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          general_prompt: generalPrompt,
          begin_message: beginMessage
        })
      });
      const llmData = await llmRes.json();
      if (!llmRes.ok) {
        throw { step: 'create-llm', status: llmRes.status, error: llmData };
      }
      return llmData;
    };

    const tryCreateAgent = async ({ agentName, llmId, language, voiceCandidates }) => {
      let lastError = null;
      for (const voiceId of voiceCandidates) {
        if (!voiceId) continue;
        const agentRes = await fetch('https://api.retellai.com/create-agent', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            agent_name: agentName,
            response_engine: { type: 'retell-llm', llm_id: llmId },
            voice_id: voiceId,
            language,
            // Maximum supported value for quicker turn-taking.
            responsiveness: 1,
            interruption_sensitivity: 1,
            enable_backchannel: false
          })
        });

        const agentData = await agentRes.json();
        if (agentRes.ok) {
          return { ...agentData, voice_id: voiceId };
        }
        lastError = { status: agentRes.status, error: agentData, attempted_voice_id: voiceId };
      }
      throw { step: 'create-agent', ...lastError };
    };

    const englishPrompt = 'You are DGsales voice assistant for a web and AI automation agency. Your goal is to answer clearly, qualify the lead, and guide visitors to book a strategy call. Services: 1) Web Starter (EUR499 one-time): premium landing page, persuasive copywriting, lead integrations. 2) AI Agent Pro (EUR999 setup): 24/7 voice agent, direct booking sync, multilingual support. Always answer in clear American English (en-US). Keep wording concise and natural. Speaking cadence rule: speak fluently at about 1.5x normal pace while staying intelligible and confident. Number and price delivery rules: when saying numbers, prices, dates, or phone numbers, speak clearly in one continuous sentence. Never restart mid-number, never self-correct aloud, and avoid partial repeats. For prices, say the full amount once and pause briefly. Do not use filler sounds. End by asking for email and inviting the user to book a strategy call.';

    const spanishPrompt = 'Eres el asistente de voz de DGsales para automatizacion web e IA de voz. Tu objetivo es responder con claridad, cualificar al lead y guiar al visitante para reservar una llamada estrategica. Servicios: 1) Web Starter (EUR499 pago unico): landing premium, copy persuasivo e integraciones de leads. 2) AI Agent Pro (EUR999 puesta en marcha): agente de voz 24/7, sincronizacion de reservas y soporte multilingue. Responde siempre en espanol de Espana (es-ES), con pronunciacion natural de Espana y diccion limpia. Regla de cadencia: habla fluido alrededor de 1.5x de velocidad conversacional normal, manteniendo claridad. Reglas para numeros y precios: cuando digas cifras, precios, fechas o telefonos, dilo en una sola frase continua, sin reiniciar ni corregirte a mitad. No repitas fragmentos. Para precios, di el importe completo una sola vez y haz una breve pausa. No uses muletillas. Al final, pide email e invita a reservar una llamada estrategica.';

    const llmEn = await createLlm({
      generalPrompt: englishPrompt,
      beginMessage: 'Hi, this is DGsales voice assistant. I can help with your website and AI voice automation. How can I help you today?'
    });

    const llmEs = await createLlm({
      generalPrompt: spanishPrompt,
      beginMessage: 'Hola, soy el asistente de voz de DGsales. Puedo ayudarte con tu web y la automatizacion con IA de voz. ¿En que te ayudo hoy?'
    });

    const agentEn = await tryCreateAgent({
      agentName: 'DGsales Voice Agent EN',
      llmId: llmEn.llm_id,
      language: 'en-US',
      voiceCandidates: [process.env.RETELL_VOICE_ID_EN, 'retell-Chloe']
    });

    const agentEs = await tryCreateAgent({
      agentName: 'DGsales Voice Agent ES',
      llmId: llmEs.llm_id,
      language: 'es-ES',
      voiceCandidates: [
        process.env.RETELL_VOICE_ID_ES,
        'retell-Lucia',
        'retell-Sofia',
        'retell-Carmen',
        'retell-Isabella',
        'retell-Elena',
        'retell-Chloe'
      ]
    });

    return res.status(200).json({
      success: true,
      llm_id_en: llmEn.llm_id,
      llm_id_es: llmEs.llm_id,
      agent_id_en: agentEn.agent_id,
      agent_id_es: agentEs.agent_id,
      voice_id_en: agentEn.voice_id,
      voice_id_es: agentEs.voice_id,
      message: 'Created EN and ES voice agents. Update RETELL_AGENT_ID_EN and RETELL_AGENT_ID_ES in Vercel.',
    });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json(error);
    }
    return res.status(500).json({ error: error.message || String(error) });
  }
};
