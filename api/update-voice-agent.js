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
        general_prompt: 'You are DGsales voice assistant for a web and AI automation agency. Your goal is to answer clearly, qualify the lead, and guide visitors to book a strategy call. Services: 1) Web Starter (EUR499 one-time): premium landing page, persuasive copywriting, lead integrations. 2) AI Agent Pro (EUR999 setup): 24/7 voice agent, direct booking sync, multilingual support. Always respond in the visitor language (English or Spanish). Default to English if language is unclear. Accent and language style rules: if the visitor speaks Spanish, use neutral Spain Spanish (es-ES) pronunciation and vocabulary. If the visitor speaks English, use clear American English (en-US) pronunciation and wording. Do not mix accents between languages. Number and price delivery rules: when saying numbers, prices, dates, or phone numbers, speak slowly and clearly, in one continuous sentence, without restarting mid-phrase. Avoid partial repeats and avoid self-corrections while speaking. For prices, say the full amount once and then stop briefly. Keep answers short, natural, and direct. Do not use filler sounds. At the end of the conversation, ask for email and invite the user to book a strategy call.',
        begin_message: 'Hi, this is DGsales voice assistant. I can help you with websites and AI voice automation. How can I help you today?'
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
        voice_id: 'retell-Chloe',
        language: 'multi',
        responsiveness: 0,
        interruption_sensitivity: 0,
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
