const Retell = require('retell-sdk');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }

    // Initialize Retell SDK with secret API key from environment variable
    const client = new Retell({
      apiKey: process.env.RETELL_API_KEY
    });

    // Create web call and get access token
    const webCallResponse = await client.call.createWebCall({
      agent_id: agent_id
    });

    return res.status(200).json({
      access_token: webCallResponse.access_token,
      call_id: webCallResponse.call_id
    });
  } catch (error) {
    console.error('Error creating web call:', error);
    return res.status(500).json({ 
      error: 'Failed to create call',
      message: error.message 
    });
  }
};
