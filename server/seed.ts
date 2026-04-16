import * as storage from "./storage";

const SPECIALTIES = [
  "General Repair",
  "Engine Specialist",
  "Brake & Suspension",
  "Transmission",
  "Electrical Systems",
  "Oil Change & Tune-Up",
  "Body & Paint",
  "Tire & Alignment",
  "AC & Heating",
  "Diagnostics",
];

const SHOP_NAMES = [
  "AutoFix Pro",
  "QuickWrench Garage",
  "PrecisionAuto Care",
  "TurboTech Motors",
  "Elite Auto Repair",
  "FastLane Mechanics",
  "GearShift Auto",
  "ProDrive Service",
  "AllStar Auto Works",
  "SpeedMaster Garage",
  "RoadReady Repair",
  "CityAuto Clinic",
];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export async function seedMechanics(baseLat: number = 37.7749, baseLng: number = -122.4194) {
  const count = await storage.getMechanicCount();
  if (count > 0) return;

  console.log("Seeding mechanic data...");

  for (let i = 0; i < 12; i++) {
    const offset = (i + 1) * 0.008;
    const latOffset = randomBetween(-offset, offset);
    const lngOffset = randomBetween(-offset, offset);
    const lat = baseLat + latOffset;
    const lng = baseLng + lngOffset;
    const rating = randomBetween(3.5, 4.9).toFixed(1);
    const jobs = Math.floor(randomBetween(50, 400));
    const isOpen = Math.random() > 0.3;

    await storage.createMechanic({
      userId: null,
      shopName: SHOP_NAMES[i % SHOP_NAMES.length],
      specialty: SPECIALTIES[i % SPECIALTIES.length],
      phone: `+1 (555) ${String(100 + i * 11).padStart(3, "0")}-${String(1000 + i * 111).padStart(4, "0")}`,
      status: isOpen ? "available" : "offline",
      rating,
      totalJobs: jobs,
      workingHours: isOpen ? "8:00 AM - 6:00 PM" : "Closed today",
      latitude: String(lat),
      longitude: String(lng),
      address: `${100 + i * 23} Main Street, San Francisco, CA`,
      isSeeded: true,
    });
  }

  console.log("Seed complete: 12 mechanics added");
}
