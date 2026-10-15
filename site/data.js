/*
  KISUMU STAYS — EASY EDIT FILE
  --------------------------------
  Edit your brand details and property listings here.
  You do NOT need to edit app.js for normal content changes.

  IMPORTANT:
  - WhatsApp number must be digits only, including Kenya country code.
    Example: 2547XXXXXXXX
  - Replace image URLs with your own photos when you launch.
*/

const SITE = {
  name: "Kisumu Stays",
  tagline: "Find your stay. Book with ease.",
  city: "Kisumu, Kenya",
  whatsapp: "254795980628",
  mpesaNumber: "0795980628",
  email: "hello@yourdomain.com", // CHANGE THIS
  currency: "KSh",
  ownerMessage: "Hello Kisumu Stays, I would like to list my BnB/short-stay property on your platform."
};

const PROPERTIES = [
  {
    id: "milimani-citam-1bed",
    name: "Cozy Milimani 1 Bedroom",
    location: "Milimani, next to CITAM",
    price: 4500,
    guests: 2,
    rating: 0,
    verified: false,
    images: [
  "images/property1_milimani_1.jpg",
  "images/property1_milimani_2.jpg",
  "images/property1_milimani_3.jpg"
],
    description: "A warm and comfortable 1-bedroom stay in Milimani, conveniently located next to CITAM.",
    amenities: ["1 bedroom", "Living room", "TV", "Kitchen"]
  },
  {
    id: "milimani-2bed-1",
    name: "Elegant Milimani 2 Bedroom",
    location: "Milimani",
    price: 5500,
    guests: 4,
    rating: 0,
    verified: false,
    images: [
  "images/property2_milimani_1.jpg",
  "images/property2_milimani_2.jpg",
  "images/property2_milimani_3.jpg",
  "images/property2_milimani_4.jpg"
],
    description: "A spacious and stylish 2-bedroom stay with comfortable bedrooms, a welcoming living area and dining space.",
    amenities: ["2 bedrooms", "Living room", "Dining area", "Kitchen", "TV"]
  },
  {
    id: "carwash-studio",
    name: "Cozy Carwash Studio",
    location: "Carwash",
    price: 2200,
    guests: 2,
    rating: 0,
    verified: false,
    images: [
  "images/property3_carwash_1.jpg",
  "images/property3_carwash_2.jpg"
],
    description: "A simple and cozy studio stay at Carwash, ideal for a comfortable short stay.",
    amenities: ["Studio", "TV", "Fan", "Seating area"]
  },
  {
    id: "makasembo-1bed",
    name: "Makasembo 1 Bedroom",
    location: "Makasembo",
    price: 3500,
    guests: 2,
    rating: 0,
    verified: false,
    images: [
  "images/property4_makasembo_1.jpg",
  "images/property4_makasembo_2.jpg",
  "images/property4_makasembo_3.jpg"
],
    description: "A bright and comfortable 1-bedroom stay with a furnished living area and equipped kitchen.",
    amenities: ["1 bedroom", "Living room", "Kitchen", "TV", "Dining area"]
  },
  {
    id: "milimani-2bed-2",
    name: "Modern Milimani 2 Bedroom",
    location: "Milimani",
    price: 4500,
    guests: 4,
    rating: 0,
    verified: false,
    images: [
  "images/property5_milimani_1.jpg",
  "images/property5_milimani_2.jpg",
  "images/property5_milimani_3.jpg",
  "images/property5_milimani_4.jpg"
],
    description: "A modern 2-bedroom Milimani stay with a cozy lounge, comfortable bedrooms and a well-equipped kitchen.",
    amenities: ["2 bedrooms", "Living room", "Kitchen", "TV", "Dining area"]
  }
];
