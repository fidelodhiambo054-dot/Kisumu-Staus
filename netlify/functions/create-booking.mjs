import { createHash } from "node:crypto";
import { PROPERTIES, json, normalizePhone, supabase } from "./_shared.mjs";

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) return json(403, { error: "Request origin not allowed." });
    const input = await request.json();
    const property = PROPERTIES[String(input.propertyId || "")];
    if (!property) return json(400, { error: "Please select a valid property." });
    const phone = normalizePhone(input.phone);
    if (!phone) return json(400, { error: "Enter a valid Kenyan mobile number, e.g. 07XXXXXXXX." });
    const checkIn = new Date(`${input.checkIn}T00:00:00Z`);
    const checkOut = new Date(`${input.checkOut}T00:00:00Z`);
    const now = new Date(); now.setUTCHours(0, 0, 0, 0);
    const nights = Math.round((checkOut - checkIn) / 86400000);
    const guests = Number(input.guests);
    const name = String(input.customerName || "").trim().slice(0, 100);
    if (!name) return json(400, { error: "Enter the guest's name." });
    if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime()) || checkIn < now || nights < 1 || nights > 30) return json(400, { error: "Choose valid dates. Check-out must be at least one night after check-in and within 30 nights." });
    if (!Number.isInteger(guests) || guests < 1 || guests > property.guests) return json(400, { error: `This property accommodates up to ${property.guests} guests.` });
    const amount = property.price * nights;
    if (amount > 150000) return json(400, { error: "This estimated total exceeds the current M-Pesa single-payment limit. Please contact support." });

    const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!salt) return json(503, { error: "Booking service is not configured yet. Please contact support." });
    const ip = request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = createHash("sha256").update(`${salt}:${ip}`).digest("hex");
    const phoneHash = createHash("sha256").update(`${salt}:${phone}`).digest("hex");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [ipAttempts, phoneAttempts] = await Promise.all([
      supabase(`payment_attempts?ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}&select=id`),
      supabase(`payment_attempts?phone_hash=eq.${phoneHash}&created_at=gte.${encodeURIComponent(since)}&select=id`)
    ]);
    if ((ipAttempts?.length || 0) >= 5 || (phoneAttempts?.length || 0) >= 3) return json(429, { error: "Too many requests. Please wait an hour or contact support." });
    await supabase("payment_attempts", { method: "POST", body: JSON.stringify([{ ip_hash: ipHash, phone_hash: phoneHash }]), prefer: "return=minimal" });

    const rows = await supabase("bookings", {
      method: "POST",
      body: JSON.stringify([{ property_id: input.propertyId, property_name: property.name, guest_name: name, guest_phone: phone, check_in: input.checkIn, check_out: input.checkOut, nights, guests, nightly_rate: property.price, total_amount: amount, commission_rate: 0.10, commission_amount: Math.round(amount * 0.10), payment_status: "not_requested", booking_status: "requested" }])
    });
    if (!rows?.[0]?.id) throw new Error("Could not create the booking request.");
    return json(201, { ok: true, bookingId: rows[0].id, amount, message: "Request received. Availability must be confirmed before payment." });
  } catch (error) {
    console.error("create-booking error", error.message);
    return json(500, { error: error.message || "Could not submit booking request." });
  }
};
