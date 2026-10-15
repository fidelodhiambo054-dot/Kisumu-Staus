import { timingSafeEqual } from "node:crypto";
import { json, supabase, darajaToken, darajaBase, timestamp, stkPassword } from "./_shared.mjs";

function authorized(request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN || "";
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (expected.length < 32 || !provided) return false;
  const a = Buffer.from(expected); const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed." });
  if (!authorized(request)) return json(401, { error: "Unauthorized." });
  try {
    const { bookingId } = await request.json();
    const id = String(bookingId || "");
    if (!/^[0-9a-f-]{12,60}$/i.test(id)) return json(400, { error: "Invalid booking reference." });
    const rows = await supabase(`bookings?id=eq.${encodeURIComponent(id)}&select=id,guest_phone,property_name,total_amount,booking_status,payment_status,checkout_request_id`);
    const booking = rows?.[0];
    if (!booking) return json(404, { error: "Booking not found." });
    if (booking.booking_status !== "confirmed") return json(409, { error: "Confirm availability before requesting payment." });
    if (["pending", "verification_pending", "paid"].includes(booking.payment_status)) return json(409, { error: "A payment is already pending or recorded for this booking. Check its status before retrying." });
    const shortcode = process.env.DARAJA_SHORTCODE;
    const passkey = process.env.DARAJA_PASSKEY;
    if (!shortcode || !passkey || !process.env.DARAJA_CALLBACK_URL) return json(503, { error: "Daraja merchant settings are not configured." });
    const stamp = timestamp();
    const token = await darajaToken();
    const response = await fetch(`${darajaBase()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ BusinessShortCode: shortcode, Password: stkPassword(shortcode, passkey, stamp), Timestamp: stamp, TransactionType: process.env.DARAJA_TRANSACTION_TYPE || "CustomerPayBillOnline", Amount: Number(booking.total_amount), PartyA: booking.guest_phone, PartyB: shortcode, PhoneNumber: booking.guest_phone, CallBackURL: process.env.DARAJA_CALLBACK_URL, AccountReference: `KS${String(booking.id).replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`, TransactionDesc: "Kisumu Stays booking" })
    });
    const result = await response.json();
    if (!response.ok || result.ResponseCode !== "0" || !result.CheckoutRequestID) return json(502, { error: result.errorMessage || result.ResponseDescription || "Safaricom could not start the M-Pesa prompt." });
    await supabase(`bookings?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify([{ checkout_request_id: result.CheckoutRequestID, merchant_request_id: result.MerchantRequestID, payment_status: "pending", payment_note: null }]) });
    return json(200, { ok: true, message: "STK Push requested. Ask the guest to check their phone and approve only if the merchant and amount are correct." });
  } catch (error) {
    console.error("admin-payment error", error.message);
    return json(500, { error: error.message || "Could not start M-Pesa payment." });
  }
};
