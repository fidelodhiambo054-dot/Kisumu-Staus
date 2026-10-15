import { timingSafeEqual } from "node:crypto";
import { json, supabase } from "./_shared.mjs";

function authorized(request) {
  const expected = process.env.ADMIN_ACCESS_TOKEN || "";
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (expected.length < 32 || !provided) return false;
  const a = Buffer.from(expected); const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (request) => {
  if (!authorized(request)) return json(401, { error: "Unauthorized. Enter the admin access token configured by the site owner." });
  try {
    if (request.method === "GET") {
      const rows = await supabase("bookings?select=id,created_at,property_id,property_name,guest_name,guest_phone,check_in,check_out,nights,guests,nightly_rate,total_amount,commission_rate,commission_amount,payment_status,booking_status,mpesa_receipt,payment_note&order=created_at.desc&limit=100");
      return json(200, { bookings: rows || [] });
    }
    if (request.method === "POST") {
      const input = await request.json();
      const id = String(input.bookingId || "");
      if (!/^[0-9a-f-]{12,60}$/i.test(id)) return json(400, { error: "Invalid booking reference." });
      if (!(["confirm", "cancel"].includes(input.action))) return json(400, { error: "Unsupported action." });
      const status = input.action === "confirm" ? "confirmed" : "cancelled";
      const rows = await supabase(`bookings?id=eq.${encodeURIComponent(id)}&select=id,booking_status,payment_status`);
      if (!rows?.length) return json(404, { error: "Booking not found." });
      if (status === "cancelled" && ["paid", "pending", "verification_pending"].includes(rows[0].payment_status)) return json(409, { error: "This booking has a payment recorded or in progress. Check the transaction and follow the refund/dispute process instead of cancelling it here." });
      const updated = await supabase(`bookings?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify([{ booking_status: status }]) });
      return json(200, { ok: true, booking: updated?.[0] || { id, booking_status: status } });
    }
    return json(405, { error: "Method not allowed." });
  } catch (error) {
    console.error("admin-bookings error", error.message);
    return json(500, { error: "Admin action failed. Check server configuration and database logs." });
  }
};
