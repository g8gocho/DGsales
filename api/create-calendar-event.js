// Google Calendar event creation endpoint for voice agent leads
import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // These should be set in your environment variables
  const {
    GOOGLE_CLIENT_EMAIL,
    GOOGLE_PRIVATE_KEY,
    GOOGLE_CALENDAR_ID
  } = process.env;

  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
    return res.status(500).json({ error: 'Missing Google Calendar credentials' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  const { name, email, company } = body;
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min

  const jwtClient = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/calendar']
  );

  const calendar = google.calendar({ version: 'v3', auth: jwtClient });

  try {
    await jwtClient.authorize();
    // Check for existing events in the same timeslot
    const existing = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    if (existing.data.items && existing.data.items.length > 0) {
      return res.status(409).json({ error: 'Time slot already booked' });
    }
    const event = {
      summary: 'voicebot test',
      description: `Lead from voice agent.\nName: ${name}\nEmail: ${email}\nCompany: ${company}`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      attendees: email ? [{ email }] : [],
    };
    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      resource: event,
    });
    return res.status(200).json({ ok: true, eventId: response.data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message || String(error) });
  }
}
