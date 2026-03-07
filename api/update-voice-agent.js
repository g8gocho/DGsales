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

    const englishPrompt = 'You are the DGsales voice assistant, expert in web automation and voice AI for small businesses. Your goal is to answer clearly, qualify the lead, and guide them to book a strategy call. You offer two services: 1) Web Starter (€499 one-time): premium landing page and client capture. 2) AI Agent Pro (€999 setup): 24/7 voice agent, automatic bookings, and multilingual support. Always speak in clear American English, with natural pronunciation. State prices and data in one sentence, without repeating or correcting. At the end, ask for the email and offer to schedule a strategy call.';

    const spanishPrompt = 'Eres el asistente de voz de DGsales, experto en automatización web e IA de voz para pymes. Tu objetivo es responder con claridad, cualificar al lead y guiarle a reservar una llamada estratégica. Ofreces dos servicios: 1) Web Starter (499 € único pago): landing premium y captación de clientes. 2) AI Agent Pro (999 € puesta en marcha): agente de voz 24/7, reservas automáticas y soporte multilingüe. Habla siempre en español de España, con pronunciación clara y natural. Da precios y datos en una sola frase, sin repetir ni corregir. Al final, pide el email y ofrece agendar una llamada estratégica.';

    const llmEn = await createLlm({
      generalPrompt: englishPrompt,
      beginMessage: 'Hi, I am the DGsales voice assistant. Do you want to automate your website or client communications? Tell me what you need and I will help you.'
    });

    const llmEs = await createLlm({
      generalPrompt: spanishPrompt,
      beginMessage: 'Hola, soy el asistente de voz de DGsales. ¿Buscas automatizar tu web o atención de clientes? Cuéntame qué necesitas y te ayudo.'
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
