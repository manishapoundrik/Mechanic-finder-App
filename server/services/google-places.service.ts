import dotenv from "dotenv";
dotenv.config();

console.log("KEY LOADED:", process.env.GOOGLE_PLACES_API_KEY);
const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const BASE_URL = "https://maps.googleapis.com/maps/api/place";

export interface PlaceResult {
  placeId: string;
  shopName: string;
  rating: number;
  address: string;
  latitude: number;
  longitude: number;
  isOpen: boolean | null;
  photoReference: string | null;
  phone: string | null;
  status: "available" | "busy" | "offline";
}

export async function getNearbyMechanicShops(
  lat: number,
  lng: number,
  radiusMeters = 5000
): Promise<PlaceResult[]> {
  if (!PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not configured");

  const url =
    `${BASE_URL}/nearbysearch/json` +
    `?location=${lat},${lng}` +
    `&radius=${radiusMeters}` +
    `&type=car_repair` +
    `&key=${PLACES_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places API error: ${res.status}`);

  const data = (await res.json()) as any;

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API returned status: ${data.status}`);
  }

  const results: PlaceResult[] = (data.results || []).map((p: any) => ({
    placeId: p.place_id,
    shopName: p.name,
    rating: p.rating ?? 4.0,
    address: p.vicinity || p.formatted_address || "",
    latitude: p.geometry.location.lat,
    longitude: p.geometry.location.lng,
    isOpen: p.opening_hours?.open_now ?? null,
    photoReference: p.photos?.[0]?.photo_reference ?? null,
    phone: null,
    status: (p.opening_hours?.open_now === false ? "offline" : "available") as
      | "available"
      | "busy"
      | "offline",
  }));

  return results;
}

export interface PlaceDetails extends PlaceResult {
  phone: string | null;
  website: string | null;
  openNow: boolean | null;
  weekdayText: string[];
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  if (!PLACES_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY not configured");

  const fields = [
    "name",
    "rating",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "opening_hours",
    "geometry",
    "photos",
    "place_id",
  ].join(",");

  const url =
    `${BASE_URL}/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=${fields}` +
    `&key=${PLACES_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places Details error: ${res.status}`);

  const data = (await res.json()) as any;
  if (data.status !== "OK") throw new Error(`Places Details status: ${data.status}`);

  const p = data.result;
  return {
    placeId: p.place_id,
    shopName: p.name,
    rating: p.rating ?? 4.0,
    address: p.formatted_address || "",
    latitude: p.geometry.location.lat,
    longitude: p.geometry.location.lng,
    isOpen: p.opening_hours?.open_now ?? null,
    photoReference: p.photos?.[0]?.photo_reference ?? null,
    phone: p.formatted_phone_number || null,
    website: p.website || null,
    openNow: p.opening_hours?.open_now ?? null,
    weekdayText: p.opening_hours?.weekday_text || [],
    status: (p.opening_hours?.open_now === false ? "offline" : "available") as
      | "available"
      | "busy"
      | "offline",
  };
}

export function buildPhotoUrl(
  photoReference: string,
  maxwidth = 400
): string {
  return (
    `${BASE_URL}/photo` +
    `?maxwidth=${maxwidth}` +
    `&photoreference=${encodeURIComponent(photoReference)}` +
    `&key=${PLACES_API_KEY}`
  );
}
