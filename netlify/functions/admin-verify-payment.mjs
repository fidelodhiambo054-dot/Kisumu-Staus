import { timingSafeEqual } from "node:crypto";
import { json, supabase, queryStkStatus } from "./_shared.mjs";

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
    const rows = await supabase(`bookings?id=eq.${encodeURIComponent(id)}&select=id,total_amount,payment_status,checkout_request_id,callback_amount,callback_receipt,callback_phone,callback_result_code,callback_result_desc`);
    const b = rows?.[0];
    if (!b) return json(404, { error: "Booking not found." });
    if (!b.checkout_request_id) return json(409, { error: "No M-Pesa request exists for this booking yet." });
    if (b.payment_status === "paid") return json(200, { ok: true, status: "paid", message: "This payment is already verified." });

    const query = await queryStkStatus(b.checkout_request_id);
    const resultCode = String(query?.ResultCode ?? "");
    if (resultCode === "0" && String(b.callback_result_code) === "0") {
      if (Number(b.callback_amount) !== Number(b.total_amount) || !b.callback_receipt) {
        await supabase(`bookings?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify([{ payment_status: "review_required", payment_note: "Safaricom query succeeded but callback amount/receipt needs manual reconciliation." }]) });
        return json(200, { ok: true, status: "review_required", message: "Safaricom reports success, but the recorded callback amount/receipt needs manual reconciliation. Do not issue another prompt." });
      }
      await supabase(`bookings?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify([{ payment_status: "paid", paid_amount: b.callback_amount, mpesa_receipt: b.callback_receipt, payer_phone_verified: b.callback_phone, payment_note: null }]) });
      return json(200, { ok: true, status: "paid", receipt: b.callback_receipt, message: "Payment verified with Safaricom." });
    }
    if (resultCode !== "" && resultCode !== "0" && String(b.callback_result_code) !== "0" && b.callback_result_code != null) {
      await supabase(`bookings?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify([{ payment_status: "failed", payment_note: String(b.callback_result_desc || query.ResultDesc || "Payment not completed").slice(0, 200) }]) });
      return json(200, { ok: true, status: "failed", message: "Safaricom reports that payment was not completed." });
    }
    await supabase(`bookings?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify([{ payment_status: "verification_pending", payment_note: "Status checked; no verified final result yet" }]) });
    return json(200, { ok: true, status: "verification_pending", message: "No final result is available yet. Wait and check again; do not send another prompt." });
  } catch (error) {
    console.error("admin-verify-payment error", error.message);
    return json(500, { error: "Could not verify payment. Check the provider status and try again." });
  }
};
