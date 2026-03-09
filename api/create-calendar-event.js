import { google } from 'googleapis';

export default async function handler(req, res) {
  console.log('METHOD:', req.method);
  console.log('BODY:', req.body);
  console.log('HAS GOOGLE_CLIENT_EMAIL:', !!process.env.GOOGLE_CLIENT_EMAIL);
  console.log('HAS GOOGLE_PRIVATE_KEY:', !!process.env.GOOGLE_PRIVATE_KEY);
  console.log('HAS GOOGLE_CALENDAR_ID:', !!process.env.GOOGLE_CALENDAR_ID);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      GOOGLE_CALENDAR_ID,
    } = process.env;

    console.log('typeof GOOGLE_PRIVATE_KEY:', typeof GOOGLE_PRIVATE_KEY);
    if (GOOGLE_PRIVATE_KEY) {
      console.log(
        'GOOGLE_PRIVATE_KEY includes BEGIN:',
        GOOGLE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')
      );
      console.log(
        'GOOGLE_PRIVATE_KEY includes END:',
        GOOGLE_PRIVATE_KEY.includes('END PRIVATE KEY')
      );
    }

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
      return res.status(500).json({ error: 'Missing Google Calendar credentials' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }


    const { name, email, company, start, end, date } = body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields: name, email' });
    }

    // 1. Use start/end from req.body if present.
    // 2. If start/end are missing, use date from req.body and default to 30 minutes duration.
    // 3. If no date/start/end is provided, return 400 instead of creating the event "now".
    // 4. Validate invalid dates and return 400.
    let startTime;
    let endTime;

    if (start && end) {
      startTime = new Date(start);
      endTime = new Date(end);
    } else if (date) {
      startTime = new Date(date);
      endTime = new Date(startTime.getTime() + 30 * 60000);
    } else {
      return res.status(400).json({
        error: 'Missing reservation time. Send start/end or date',
      });
    }

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Use ISO 8601',
      });
    }


    console.log('Creating calendar event with payload:', {
      name,
      email,
      company,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
    });


    // DEBUG LOGS before JWT creation
    console.log("HAS GOOGLE_CLIENT_EMAIL:", !!process.env.GOOGLE_CLIENT_EMAIL);
    console.log("HAS GOOGLE_PRIVATE_KEY:", !!process.env.GOOGLE_PRIVATE_KEY);
    console.log("PRIVATE KEY LENGTH:", process.env.GOOGLE_PRIVATE_KEY?.length || 0);
    console.log("HAS GOOGLE_CALENDAR_ID:", !!process.env.GOOGLE_CALENDAR_ID);

    // Safe private key handling
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : null;

    console.log("PRIVATE KEY AFTER REPLACE LENGTH:", privateKey?.length || 0);
    console.log("PRIVATE KEY HAS BEGIN:", privateKey?.includes("BEGIN PRIVATE KEY") || false);
    console.log("PRIVATE KEY HAS END:", privateKey?.includes("END PRIVATE KEY") || false);

    if (!privateKey) {
      return res.status(500).json({
        error: "GOOGLE_PRIVATE_KEY is missing at runtime"
      });
    }

    const jwtClient = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/calendar']
    );

    await jwtClient.authorize();

    const calendar = google.calendar({ version: 'v3', auth: jwtClient });

    const existing = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const activeEvents = (existing.data.items || []).filter(
      (item) => item.status !== 'cancelled'
    );

    if (activeEvents.length > 0) {
      return res.status(409).json({ error: 'Time slot already booked' });
    }


    const event = {
      summary: `Reserva de ${name}${company ? ' - ' + company : ''}`,
      description:
        `Reserva generada por agente de voz.\n` +
        `Nombre: ${name}\n` +
        `Email: ${email}\n` +
        `Empresa: ${company || ''}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Madrid',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Madrid',
      },
      attendees: email ? [{ email }] : [],
    };

    // 5. Change calendar.events.insert to use requestBody instead of resource.
    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: event,
      sendUpdates: 'all',
    });

    return res.status(200).json({
      ok: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    });
  } catch (error) {
    console.error('Calendar error full:', error);
    console.error('Calendar error message:', error?.message);
    console.error('Calendar error stack:', error?.stack);
    console.error('Calendar error response:', error?.response?.data);

    return res.status(500).json({
      error: error?.message || 'Unknown error',
      details: error?.response?.data || null,
    });
  }
}