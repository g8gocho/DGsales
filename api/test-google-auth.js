
export default async function handler(req, res) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  console.log("HAS SERVICE JSON:", !!raw);
  console.log("RAW LENGTH:", raw?.length || 0);

  if (!raw) {
    return res.status(500).json({
      error: "Missing GOOGLE_SERVICE_ACCOUNT_JSON"
    });
  }

  let svc;
  try {
    svc = JSON.parse(raw);
  } catch (e) {
    return res.status(500).json({
      error: "Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON",
      details: e.message,
      rawPreview: raw.slice(0, 120)
    });
  }

  console.log("SERVICE ACCOUNT KEYS:", Object.keys(svc));
  console.log("HAS private_key:", !!svc.private_key);
  console.log("HAS client_email:", !!svc.client_email);
  console.log("CLIENT EMAIL:", svc.client_email || null);
  console.log("PRIVATE KEY RAW LENGTH:", svc.private_key?.length || 0);
  console.log("PRIVATE KEY RAW STARTS WITH BEGIN:", svc.private_key?.includes("BEGIN PRIVATE KEY") || false);
  console.log("PRIVATE KEY RAW ENDS WITH END:", svc.private_key?.includes("END PRIVATE KEY") || false);

  const privateKey = svc.private_key?.replace(/\\n/g, '\n');

  console.log("PRIVATE KEY AFTER REPLACE LENGTH:", privateKey?.length || 0);
  console.log("PRIVATE KEY AFTER REPLACE HAS BEGIN:", privateKey?.includes("BEGIN PRIVATE KEY") || false);
  console.log("PRIVATE KEY AFTER REPLACE HAS END:", privateKey?.includes("END PRIVATE KEY") || false);

  if (!svc.client_email || !privateKey) {
    return res.status(500).json({
      error: "Service account JSON missing client_email or private_key",
      hasClientEmail: !!svc.client_email,
      hasPrivateKey: !!svc.private_key,
      privateKeyLength: svc.private_key?.length || 0
    });
  }

  return res.status(200).json({
    ok: true,
    hasServiceJson: true,
    hasClientEmail: !!svc.client_email,
    hasPrivateKey: !!svc.private_key,
    privateKeyLength: svc.private_key?.length || 0,
    clientEmail: svc.client_email
  });
}
