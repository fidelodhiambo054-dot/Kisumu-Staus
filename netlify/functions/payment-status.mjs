import { json, supabase } from "./_shared.mjs";

export default async (request) => {
  if (request.method !== "GET") return json(405, { error: "Method not allowed." });
  const id = new URL(request.url).searchParams.get("bookingId");
  if (!id || !/^[0-9a-f-]{12,60}$/i.test(id)) return json(400, { error: "Invalid booking reference." });
  try {
    const rows = await supabase(`bookings?id=eq.${encodeURIComponent(id)}&select=id,payment_status,booking_status,mpesa_receipt,total_amount,property_name,check_in,check_out`);
    if (!rows?.length) return json(404, { error: "Booking not found." });
    const b = rows[0];
    return json(200, { bookingId: b.id, status: b.payment_status, bookingStatus: b.booking_status, receipt: b.mpesa_receipt, amount: b.total_amount, property: b.property_name, checkIn: b.check_in, checkOut: b.check_out });
  } catch (error) {
    console.error("payment-status error", error.message);
    return json(500, { error: "Could not check payment status." });
  }
};
