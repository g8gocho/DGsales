import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!raw) {
      return res.status(500).json({ error: 'Missing GOOGLE_SERVICE_ACCOUNT_JSON' });
    }

    if (!calendarId) {
      return res.status(500).json({ error: 'Missing GOOGLE_CALENDAR_ID' });
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: 'Invalid GOOGLE_SERVICE_ACCOUNT_JSON',
        details: e.message,
      });
    }

    const privateKey = serviceAccount.private_key
      ? serviceAccount.private_key.replace(/\\n/g, '\n')
      : null;

    if (!serviceAccount.client_email || !privateKey) {
      return res.status(500).json({
        error: 'Service account JSON missing client_email or private_key',
      });
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
      return res.status(400).json({
        error: 'Missing required fields: name and email',
      });
    }

    let startTime;
    let endTime;

    if (start && end) {
      startTime = new Date(start);
      endTime = new Date(end);
    } else if (date) {
      startTime = new Date(date);
      endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    } else {
      return res.status(400).json({
        error: 'Missing reservation time. Send date or start/end',
      });
    }

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
      });
    }

    const jwtClient = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/calendar']
    );

    await jwtClient.authorize();

    const calendar = google.calendar({
      version: 'v3',
      auth: jwtClient,
    });

    const existing = await calendar.events.list({
      calendarId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const activeEvents = (existing.data.items || []).filter(
      (item) => item.status !== 'cancelled'
    );

    if (activeEvents.length > 0) {
      return res.status(409).json({
        error: 'Time slot already booked',
      });
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
      attendees: [{ email }],
    };

    const response = await calendar.events.insert({
      calendarId,
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