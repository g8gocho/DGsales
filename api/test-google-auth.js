import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    console.log("HAS SERVICE JSON:", !!raw);
    console.log("RAW LENGTH:", raw?.length || 0);

    if (!raw) {
      return res.status(500).json({ error: "Missing GOOGLE_SERVICE_ACCOUNT_JSON" });
    }

    const svc = JSON.parse(raw);
    const privateKey = svc.private_key?.replace(/\\n/g, "\n");

    console.log("EMAIL:", svc.client_email);
    console.log("PRIVATE KEY LENGTH:", privateKey?.length || 0);
    console.log("HAS BEGIN:", privateKey?.includes("BEGIN PRIVATE KEY"));
    console.log("HAS END:", privateKey?.includes("END PRIVATE KEY"));

    const jwtClient = new google.auth.JWT(
      svc.client_email,
      null,
      privateKey,
      ["https://www.googleapis.com/auth/calendar"]
    );

    await jwtClient.authorize();

    return res.status(200).json({
      ok: true,
      email: svc.client_email,
      keyLength: privateKey.length
    });
  } catch (e) {
    console.error("AUTH ERROR:", e);
    return res.status(500).json({
      error: e.message,
      stack: e.stack
    });
  }
}
