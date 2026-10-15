import { json, supabase, queryStkStatus } from "./_shared.mjs";

export default async (request) => {
  if (request.method !== "POST") return json(405, { ResultCode: 1, ResultDesc: "Method not allowed" });
  try {
    const body = await request.json();
    const callback = body?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) return json(400, { ResultCode: 1, ResultDesc: "Invalid callback payload" });
    const checkoutId = callback.CheckoutRequestID;
    const rows = await supabase(`bookings?checkout_request_id=eq.${encodeURIComponent(checkoutId)}&select=id,total_amount,payment_status`);
    const booking = rows?.[0];
    if (!booking) return json(200, { ResultCode: 0, ResultDesc: "Callback received" });

    const metadata = callback.CallbackMetadata?.Item || [];
    const item = name => metadata.find(x => x.Name === name)?.Value;
    const receipt = item("MpesaReceiptNumber") || null;
    const paidAmount = item("Amount") == null ? null : Number(item("Amount"));
    const phone = item("PhoneNumber") ? String(item("PhoneNumber")) : null;
    const callbackCode = Number(callback.ResultCode);
    await supabase(`bookings?id=eq.${encodeURIComponent(booking.id)}`, { method: "PATCH", body: JSON.stringify([{ callback_amount: paidAmount, callback_receipt: receipt, callback_phone: phone, callback_result_code: String(callback.ResultCode), callback_result_desc: String(callback.ResultDesc || "").slice(0, 200) }]) });

    // Do not rely on the incoming callback alone. Ask Daraja to confirm the STK transaction.
    let verified = null;
    try { verified = await queryStkStatus(checkoutId); } catch (e) { console.warn("STK verification deferred", e.message); }
    const queryCode = String(verified?.ResultCode ?? "");
    if (callbackCode === 0 && queryCode === "0") {
      if (paidAmount !== Number(booking.total_amount)) {
        await supabase(`bookings?id=eq.${encodeURIComponent(booking.id)}`, { method: "PATCH", body: JSON.stringify([{ payment_status: "review_required", payment_note: "Amount mismatch; manual review required" }]) });
      } else {
        await supabase(`bookings?id=eq.${encodeURIComponent(booking.id)}`, { method: "PATCH", body: JSON.stringify([{ payment_status: "paid", payment_note: null, mpesa_receipt: receipt, paid_amount: paidAmount, payer_phone_verified: phone }]) });
      }
    } else if (callbackCode !== 0 && queryCode !== "" && queryCode !== "0") {
      await supabase(`bookings?id=eq.${encodeURIComponent(booking.id)}`, { method: "PATCH", body: JSON.stringify([{ payment_status: "failed", payment_note: String(callback.ResultDesc || verified?.ResultDesc || "Payment not completed").slice(0, 200) }]) });
    } else {
      await supabase(`bookings?id=eq.${encodeURIComponent(booking.id)}`, { method: "PATCH", body: JSON.stringify([{ payment_status: "verification_pending", payment_note: "Callback received; waiting for Daraja verification" }]) });
    }
    return json(200, { ResultCode: 0, ResultDesc: "Callback received" });
  } catch (error) {
    console.error("mpesa callback error", error.message);
    // Respond 200 to avoid endless retries; unresolved records remain pending for reconciliation.
    return json(200, { ResultCode: 0, ResultDesc: "Callback received for reconciliation" });
  }
};
