import type { Request, Response } from "express";
import * as storage from "../storage";
import {
  getNearbyMechanicShops,
  getPlaceDetails,
  buildPhotoUrl,
} from "../services/google-places.service";

export async function getNearbyMechanics(req: Request, res: Response) {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);

    if (process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const places = await getNearbyMechanicShops(lat, lng, 5000);

        if (places.length > 0) {
          const haversineKm = (
            lat1: number,
            lon1: number,
            lat2: number,
            lon2: number
          ) => {
            const R = 6371;
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLon = ((lon2 - lon1) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          };

          const formatted = places.map((p) => ({
            id: p.placeId,
            placeId: p.placeId,
            shopName: p.shopName,
            specialty: "Auto Repair",
            phone: p.phone || "",
            status: p.status,
            rating: String(p.rating),
            totalJobs: 0,
            workingHours: p.isOpen === null ? "Hours unavailable" : p.isOpen ? "Open now" : "Closed",
            latitude: p.latitude,
            longitude: p.longitude,
            address: p.address,
            photoReference: p.photoReference,
            distance: haversineKm(lat, lng, p.latitude, p.longitude).toFixed(1),
            source: "google",
          }));

          return res.json({ mechanics: formatted });
        }
      } catch (googleErr) {
        console.warn("Google Places failed, falling back to seeded:", googleErr);
      }
    }

    const nearbyMechanics = await storage.getNearbyMechanics(lat, lng, 5);

    const formatted = nearbyMechanics.map((m) => ({
      id: m.id,
      placeId: null,
      userId: m.userId,
      shopName: m.shopName,
      specialty: m.specialty,
      phone: m.phone,
      status: m.status,
      rating: m.rating,
      totalJobs: m.totalJobs,
      workingHours: m.workingHours,
      latitude: parseFloat(String(m.latitude)),
      longitude: parseFloat(String(m.longitude)),
      address: m.address,
      photoReference: null,
      distance: m.distance.toFixed(1),
      source: "seeded",
    }));

    return res.json({ mechanics: formatted });
  } catch (error) {
    console.error("Nearby mechanics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMechanicDetails(req: Request, res: Response) {
  try {
    const { placeId } = req.query;
    if (!placeId) {
      return res.status(400).json({ message: "placeId required" });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return res.status(503).json({ message: "Google Places not configured" });
    }

    const details = await getPlaceDetails(placeId as string);
    return res.json(details);
  } catch (error) {
    console.error("Place details error:", error);
    return res.status(500).json({ message: "Failed to fetch place details" });
  }
}

export async function getMechanicPhoto(req: Request, res: Response) {
  try {
    const { ref, maxwidth = "400" } = req.query;
    if (!ref) {
      return res.status(400).json({ message: "ref required" });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return res.status(503).json({ message: "Google Places not configured" });
    }

    const photoUrl = buildPhotoUrl(ref as string, parseInt(maxwidth as string));

    const photoRes = await fetch(photoUrl, { redirect: "follow" });

    if (!photoRes.ok) {
      return res.status(photoRes.status).json({ message: "Photo fetch failed" });
    }

    const contentType = photoRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buffer = await photoRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Mechanic photo error:", error);
    return res.status(500).json({ message: "Failed to fetch photo" });
  }
}

export async function getMechanicProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const mechanic = await storage.getMechanicByUserId(userId);

    if (!mechanic) {
      return res.status(404).json({ message: "Mechanic profile not found" });
    }

    return res.json(mechanic);
  } catch (error) {
    console.error("Mechanic profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateMechanicStatus(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { status, latitude, longitude } = req.body;

    const mechanic = await storage.getMechanicByUserId(userId);
    if (!mechanic) {
      return res.status(404).json({ message: "Mechanic profile not found" });
    }

    const updateData: any = { status };
    if (latitude !== undefined) updateData.latitude = String(latitude);
    if (longitude !== undefined) updateData.longitude = String(longitude);

    const updated = await storage.updateMechanic(mechanic.id, updateData);
    return res.json(updated);
  } catch (error) {
    console.error("Update mechanic status error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateMechanicProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { shopName, specialty, phone, workingHours, address } = req.body;

    const mechanic = await storage.getMechanicByUserId(userId);
    if (!mechanic) {
      return res.status(404).json({ message: "Mechanic profile not found" });
    }

    const updated = await storage.updateMechanic(mechanic.id, {
      shopName,
      specialty,
      phone,
      workingHours,
      address,
    });

    return res.json(updated);
  } catch (error) {
    console.error("Update mechanic profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
