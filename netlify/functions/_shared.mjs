export const PROPERTIES = {
  "milimani-citam-1bed": { name: "Cozy Milimani 1 Bedroom", location: "Milimani, next to CITAM", price: 4500, guests: 2 },
  "milimani-2bed-1": { name: "Elegant Milimani 2 Bedroom", location: "Milimani", price: 5500, guests: 4 },
  "carwash-studio": { name: "Cozy Carwash Studio", location: "Carwash", price: 2200, guests: 2 },
  "makasembo-1bed": { name: "Makasembo 1 Bedroom", location: "Makasembo", price: 3500, guests: 2 },
  "milimani-2bed-2": { name: "Modern Milimani 2 Bedroom", location: "Milimani", price: 4500, guests: 4 }
};

export function json(statusCode, data) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export function supabaseReady() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function supabase(path, options = {}) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Database is not configured. Complete the deployment setup first.");
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!response.ok) throw new Error(data?.message || `Database request failed (${response.status}).`);
  return data;
}

export function normalizePhone(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

export function darajaBase() {
  return process.env.DARAJA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export async function darajaToken() {
  const key = process.env.DARAJA_CONSUMER_KEY;
  const secret = process.env.DARAJA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Safaricom Daraja credentials are not configured.");
  const basic = Buffer.from(`${key}:${secret}`).toString("base64");
  const response = await fetch(`${darajaBase()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` }
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Could not authenticate with Safaricom Daraja.");
  return data.access_token;
}

export function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function stkPassword(shortcode, passkey, stamp) {
  return Buffer.from(`${shortcode}${passkey}${stamp}`).toString("base64");
}

export async function queryStkStatus(checkoutRequestId) {
  const shortcode = process.env.DARAJA_SHORTCODE;
  const passkey = process.env.DARAJA_PASSKEY;
  if (!shortcode || !passkey) throw new Error("Daraja shortcode/passkey are not configured.");
  const stamp = timestamp();
  const token = await darajaToken();
  const response = await fetch(`${darajaBase()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: shortcode, Password: stkPassword(shortcode, passkey, stamp), Timestamp: stamp, CheckoutRequestID: checkoutRequestId })
  });
  const data = await response.json();
  if (!response.ok) throw new Error("Safaricom payment status query failed.");
  return data;
}
