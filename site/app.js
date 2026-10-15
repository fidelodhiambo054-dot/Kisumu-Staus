const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function formatPrice(price) { return price == null ? 'Contact for price' : `KSh ${price.toLocaleString()}`; }

function money(value) {
  return `${SITE.currency} ${Number(value).toLocaleString("en-KE")}`;
}

function formatMpesaNumber(value) {
  const digits = String(value || "0795980628").replace(/\D/g, "");
  return digits.length === 10 ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : digits;
}

function waUrl(message) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

function uniqueLocations() {
  return [...new Set(PROPERTIES.map(p => p.location))].sort();
}

function firstPhoto(p) {
  return (Array.isArray(p.images) && p.images.length ? p.images[0] : p.image) || "";
}

function propertyCard(p) {
  const photo = firstPhoto(p);
  return `
    <article class="property-card">
      <div class="property-image-wrap">
        ${photo ? `<img src="${photo}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('image-missing');this.parentElement.insertAdjacentHTML('beforeend','<div class=\'image-fallback\'>🏡<span>Photo unavailable</span></div>')">` : '<div class="image-fallback">🏡<span>Photo coming soon</span></div>'}
        ${p.verified ? '<span class="badge verified">✓ Verified</span>' : '<span class="badge">New listing</span>'}
        <button class="heart" aria-label="Save ${p.name}" title="Save for later">♡</button>
      </div>
      <div class="property-body">
        <div class="property-top">
          <div>
            <h3>${p.name}</h3>
            <p class="muted">📍 ${p.location}, Kisumu</p>
          </div>
          <span class="rating">${p.rating > 0 ? `★ ${p.rating}` : "Not rated yet"}</span>
        </div>
        <p class="amenity-line">${p.amenities.slice(0, 3).join(" • ")}</p>
        <div class="property-bottom">
          <div><strong>${money(p.price)}</strong> <span>/ night</span></div>
          <button class="btn btn-small btn-dark" data-view="${p.id}">View stay</button>
        </div>
      </div>
    </article>
  `;
}

function renderProperties(list = PROPERTIES) {
  const grid = $("#propertyGrid");
  grid.innerHTML = list.map(propertyCard).join("");
  $("#resultsCount").textContent = `${list.length} ${list.length === 1 ? "stay" : "stays"}`;
  $("#emptyState").classList.toggle("hidden", list.length !== 0);
  $$("[data-view]").forEach(btn => btn.addEventListener("click", () => openProperty(btn.dataset.view)));
}

function applyFilters() {
  const location = $("#locationFilter").value;
  const maxPrice = Number($("#priceFilter").value) || Infinity;
  const guests = Number($("#guestFilter").value) || 1;

  const results = PROPERTIES.filter(p =>
    (location === "all" || p.location === location) &&
    p.price <= maxPrice &&
    p.guests >= guests
  );

  renderProperties(results);
}

function openProperty(id) {
  const p = PROPERTIES.find(x => String(x.id) === String(id));
  if (!p) return;

  const message = `Hello ${SITE.name}, I would like to enquire about "${p.name}" in ${p.location}, Kisumu. Please share availability, total price and booking requirements.`;
  const photos = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : []);
  const mainPhoto = photos[0] || "";
  $("#modalContent").innerHTML = `
    ${mainPhoto ? `<img class="modal-image" id="modalMainImage" src="${mainPhoto}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling && (this.nextElementSibling.style.display='flex')">` : ""}
    <div class="image-fallback modal-fallback" ${mainPhoto ? 'style="display:none"' : ""}>🏡<span>Property photos unavailable</span></div>
    ${photos.length > 1 ? `<div class="photo-thumbnails" aria-label="More property photos">${photos.map((src, i) => `<button type="button" class="photo-thumb ${i === 0 ? "active" : ""}" data-photo="${src}" aria-label="View photo ${i + 1}"><img src="${src}" alt="${p.name}, photo ${i + 1}" loading="lazy"></button>`).join("")}</div>` : ""}
    <div class="modal-body">
      <div class="property-top">
        <div>
          <p class="eyebrow">${p.verified ? "VERIFIED LISTING" : "LISTING"}</p>
          <h2 id="modalTitle">${p.name}</h2>
          <p class="muted">📍 ${p.location}, Kisumu</p>
        </div>
        <span class="rating">${p.rating > 0 ? `★ ${p.rating}` : "Not rated yet"}</span>
      </div>
      <p>${p.description}</p>
      <div class="amenities-grid">${p.amenities.map(a => `<span>✓ ${a}</span>`).join("")}</div>
      <section class="secure-booking" aria-label="Booking and secure M-Pesa payment">
        <div class="booking-price"><div><strong>${money(p.price)}</strong> <span>/ night</span></div><small>Up to ${p.guests} guests · dates and availability require host confirmation</small></div>
        <h3>Request your stay</h3>
        <form id="bookingForm" class="booking-form" data-property-id="${p.id}">
          <label>Guest full name<input name="customerName" autocomplete="name" required maxlength="100" placeholder="Name used for the booking"></label>
          <label>M-Pesa phone number<input name="phone" inputmode="tel" autocomplete="tel" required placeholder="07XXXXXXXX" pattern="(?:\+?254|0)?[17][0-9]{8}" title="Enter a valid Kenyan mobile number"></label>
          <div class="booking-form-row">
            <label>Check-in<input name="checkIn" type="date" required min="${new Date().toISOString().slice(0,10)}"></label>
            <label>Check-out<input name="checkOut" type="date" required min="${new Date(Date.now()+86400000).toISOString().slice(0,10)}"></label>
          </div>
          <label>Guests<select name="guests" required>${Array.from({length:p.guests},(_,i)=>`<option value="${i+1}">${i+1} ${i===0?'guest':'guests'}</option>`).join('')}</select></label>
          <div class="booking-total"><span>Estimated total</span><strong id="bookingEstimate">Select your dates</strong></div>
          <button class="btn btn-primary booking-submit" type="submit">Request availability</button>
          <p id="bookingFeedback" class="booking-feedback" role="status" aria-live="polite"></p>
          <a id="bookingWhatsAppLink" class="btn btn-dark booking-whatsapp hidden" href="#" target="_blank" rel="noopener">Send request on WhatsApp</a>
        </form>
        <p class="small-note">No payment is taken at this step. Kisumu Stays must first check availability and confirm the total with the host. Only after confirmation should an authorized operator trigger an official Safaricom STK prompt. Never share your M-Pesa PIN or OTP in chat.</p>
        <a class="booking-help" href="${waUrl(message)}" target="_blank" rel="noopener">Questions? Contact us on WhatsApp</a>
      </section>
    </div>
  `;
  $("#propertyModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  $$("[data-photo]").forEach(button => button.addEventListener("click", () => {
    const main = $("#modalMainImage");
    if (main) { main.src = button.dataset.photo; main.style.display = "block"; }
    const fallback = $(".modal-fallback");
    if (fallback) fallback.style.display = "none";
    $$("[data-photo]").forEach(item => item.classList.toggle("active", item === button));
  }));
  setupBookingForm();
}

function closeModal() {
  $("#propertyModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function setupLocations() {
  const locations = uniqueLocations();
  $("#locationFilter").insertAdjacentHTML("beforeend", locations.map(l => `<option value="${l}">${l}</option>`).join(""));
  $("#locationChips").innerHTML = locations.map(l => `<button class="chip" data-chip="${l}">${l}</button>`).join("");
  $("#locationCards").innerHTML = locations.map((l, i) => {
    const count = PROPERTIES.filter(p => p.location === l).length;
    return `<button class="location-card" data-location-card="${l}">
      <span class="location-icon">${["🌿","🏙️","🌊","🏡","🌴","✈️"][i % 6]}</span>
      <strong>${l}</strong><span>${count} ${count === 1 ? "stay" : "stays"} listed</span>
    </button>`;
  }).join("");

  $$("[data-chip]").forEach(btn => btn.addEventListener("click", () => {
    $("#locationFilter").value = btn.dataset.chip;
    $$(".chip").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    applyFilters();
  }));

  $$("[data-location-card]").forEach(btn => btn.addEventListener("click", () => {
    $("#locationFilter").value = btn.dataset.locationCard;
    $("#stays").scrollIntoView({ behavior: "smooth" });
    applyFilters();
  }));
}

$("#searchForm").addEventListener("submit", e => {
  e.preventDefault();
  $$(".chip").forEach(x => x.classList.toggle("active", x.dataset.location === $("#locationFilter").value));
  applyFilters();
  $("#stays").scrollIntoView({ behavior: "smooth" });
});

$("#resetSearch").addEventListener("click", () => {
  $("#locationFilter").value = "all";
  $("#priceFilter").value = "";
  $("#guestFilter").value = 1;
  $$(".chip").forEach(x => x.classList.toggle("active", x.dataset.location === "all"));
  renderProperties();
});

$("#propertyModal").addEventListener("click", e => {
  if (e.target.matches("[data-close-modal]")) closeModal();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

$("#ownerWhatsApp").href = waUrl(SITE.ownerMessage);
$("#contactWhatsApp").href = waUrl(`Hello ${SITE.name}, I need help finding accommodation in Kisumu.`);
$("#contactPhone").textContent = `WhatsApp support: ${formatMpesaNumber(SITE.mpesaNumber)}`;
$("#footerTagline").textContent = SITE.tagline;
$("#year").textContent = new Date().getFullYear();

$("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
$$("nav a").forEach(a => a.addEventListener("click", () => $("#nav").classList.remove("open")));


function setupBookingForm() {
  const form = $("#bookingForm");
  if (!form) return;
  const checkIn = form.elements.checkIn;
  const checkOut = form.elements.checkOut;
  const estimate = $("#bookingEstimate");
  const feedback = $("#bookingFeedback");
  const property = PROPERTIES.find(item => item.id === form.dataset.propertyId);
  const updateEstimate = () => {
    if (checkIn.value) checkOut.min = new Date(new Date(checkIn.value + "T00:00:00").getTime() + 86400000).toISOString().slice(0, 10);
    if (checkIn.value && checkOut.value) {
      const nights = Math.round((new Date(checkOut.value + "T00:00:00") - new Date(checkIn.value + "T00:00:00")) / 86400000);
      estimate.textContent = nights > 0 && nights <= 30 ? money(property.price * nights) + ` · ${nights} ${nights === 1 ? "night" : "nights"}` : "Choose valid dates";
    } else estimate.textContent = "Select your dates";
  };
  checkIn.addEventListener("change", updateEstimate);
  checkOut.addEventListener("change", updateEstimate);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    feedback.className = "booking-feedback";
    feedback.textContent = "Connecting securely to M-Pesa…";
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "Please wait…";
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.propertyId = form.dataset.propertyId;
      const response = await fetch("/.netlify/functions/create-booking", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Booking request could not be submitted.");
      feedback.classList.add("success");
      feedback.textContent = `Your availability request has been recorded. Reference: ${result.bookingId}. No payment has been taken. Wait for availability and total-price confirmation.`;
      submit.textContent = "Request submitted";
      const wa = $("#bookingWhatsAppLink");
      wa.href = waUrl(`Hello ${SITE.name}, please check availability for booking request ${result.bookingId}. Property: ${property.name}. Check-in: ${payload.checkIn}. Check-out: ${payload.checkOut}. Guests: ${payload.guests}. Estimated total: ${money(result.amount)}. Please confirm availability and payment instructions.`);
      wa.classList.remove("hidden");
    } catch (error) {
      feedback.classList.add("error");
      feedback.textContent = error.message || "Unable to connect. Please try again or contact us on WhatsApp.";
      submit.disabled = false;
      submit.textContent = "Try secure M-Pesa again";
    }
  });
}


setupLocations();
renderProperties();
