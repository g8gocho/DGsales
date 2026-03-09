import { google } from "googleapis";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    const missing = [];
    if (!clientEmail) missing.push("GOOGLE_CLIENT_EMAIL");
    if (!privateKeyRaw) missing.push("GOOGLE_PRIVATE_KEY");
    if (!calendarId) missing.push("GOOGLE_CALENDAR_ID");

    console.log("GOOGLE_CLIENT_EMAIL present:", !!clientEmail);
    console.log("GOOGLE_PRIVATE_KEY present:", !!privateKeyRaw);
    console.log("GOOGLE_PRIVATE_KEY length:", privateKeyRaw ? privateKeyRaw.length : 0);
    console.log("GOOGLE_PRIVATE_KEY includes \\n:", privateKeyRaw ? privateKeyRaw.includes("\\n") : false);
    console.log("GOOGLE_CALENDAR_ID present:", !!calendarId);

    if (missing.length > 0) {
      return res.status(500).json({
        error: "Missing Google env vars",
        missing,
      });
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT(
      clientEmail,
      null,
      privateKey,
      ["https://www.googleapis.com/auth/calendar"]
    );

    // Explicitly authorize the JWT client and catch errors
    try {
      await auth.authorize();
      console.log("Google JWT authorized successfully");
    } catch (authError) {
      console.error("Google JWT authorization failed:", authError);
      return res.status(500).json({
        error: "Google JWT authorization failed",
        details: authError?.message || authError,
      });
    }

    const calendar = google.calendar({ version: "v3", auth });

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { name, email, company, start, end, date } = body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Missing required fields: name and email",
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
        error: "Missing reservation time. Send date or start/end",
      });
    }

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return res.status(400).json({
        error: "Invalid date format",
      });
    }

    const existing = await calendar.events.list({
      calendarId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const activeEvents = (existing.data.items || []).filter(
      (item) => item.status !== "cancelled"
    );

    if (activeEvents.length > 0) {
      return res.status(409).json({
        error: "Time slot already booked",
      });
    }

    const event = {
      summary: `Reserva de ${name}${company ? " - " + company : ""}`,
      description:
        `Reserva generada por agente de voz.\n` +
        `Nombre: ${name}\n` +
        `Email: ${email}\n` +
        `Empresa: ${company || ""}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Europe/Madrid",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Europe/Madrid",
      },
      attendees: [{ email }],
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: "all",
    });

    return res.status(200).json({
      ok: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    });
  } catch (error) {
    console.error("Calendar error full:", error);
    console.error("Calendar error message:", error?.message);
    console.error("Calendar error stack:", error?.stack);
    console.error("Calendar error response:", error?.response?.data);

    return res.status(500).json({
      error: error?.message || "Unknown error",
      details: error?.response?.data || null,
    });
  }
}
