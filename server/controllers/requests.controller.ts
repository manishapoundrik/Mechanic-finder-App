import type { Request, Response } from "express";
import * as storage from "../storage";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function createRequest(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { latitude, longitude, description, vehicleType, shopPlaceId, shopName } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Location required" });
    }

    const existing = await storage.getActiveRequestForCustomer(userId);
    if (existing) {
      return res.status(409).json({
        message: "You already have an active request",
        request: existing,
      });
    }

    const request = await storage.createServiceRequest({
      customerId: userId,
      customerLatitude: parseFloat(latitude),
      customerLongitude: parseFloat(longitude),
      description,
      vehicleType: vehicleType || "car",
      shopPlaceId: shopPlaceId || null,
      shopName: shopName || null,
    });

    return res.status(201).json(request);
  } catch (error) {
    console.error("Create request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getActiveRequest(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const request = await storage.getActiveRequestForCustomer(userId);

    if (!request) {
      return res.json({ request: null });
    }

    let mechanicData = null;
    if (request.mechanicId) {
      const mechanic = await storage.getMechanicById(request.mechanicId);
      mechanicData = mechanic
        ? {
            id: mechanic.id,
            shopName: mechanic.shopName,
            phone: mechanic.phone,
            rating: mechanic.rating,
            specialty: mechanic.specialty,
          }
        : null;
    }

    return res.json({ request, mechanic: mechanicData });
  } catch (error) {
    console.error("Get active request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getRequestStatus(req: Request, res: Response) {
  try {
    const { requestId } = req.params;
    const request = await storage.getServiceRequest(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    let mechanicLocation: { lat: number; lng: number } | null = null;
    let estimatedArrivalMinutes: number | null = null;
    let distanceKm: number | null = null;
    let mechanicInfo = null;

    if (request.mechanicLatitude && request.mechanicLongitude) {
      mechanicLocation = {
        lat: parseFloat(String(request.mechanicLatitude)),
        lng: parseFloat(String(request.mechanicLongitude)),
      };

      const customerLat = parseFloat(String(request.customerLatitude));
      const customerLng = parseFloat(String(request.customerLongitude));
      distanceKm = haversineKm(
        mechanicLocation.lat,
        mechanicLocation.lng,
        customerLat,
        customerLng
      );
      estimatedArrivalMinutes = Math.max(1, Math.round((distanceKm / 30) * 60));
    }

    if (request.mechanicId) {
      const mechanic = await storage.getMechanicById(request.mechanicId);
      if (mechanic) {
        mechanicInfo = {
          id: mechanic.id,
          shopName: mechanic.shopName,
          phone: mechanic.phone,
          rating: mechanic.rating,
          specialty: mechanic.specialty,
          latitude: parseFloat(String(mechanic.latitude)),
          longitude: parseFloat(String(mechanic.longitude)),
        };
      }
    }

    return res.json({
      requestId: request.id,
      status: request.status,
      vehicleType: request.vehicleType,
      shopName: request.shopName,
      customerLocation: {
        lat: parseFloat(String(request.customerLatitude)),
        lng: parseFloat(String(request.customerLongitude)),
      },
      mechanicLocation,
      estimatedArrivalMinutes,
      distanceKm: distanceKm ? parseFloat(distanceKm.toFixed(2)) : null,
      mechanic: mechanicInfo,
    });
  } catch (error) {
    console.error("Get request status error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function cancelRequest(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { requestId } = req.params;

    const request = await storage.getServiceRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.customerId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (request.status === "completed" || request.status === "cancelled") {
      return res.status(400).json({ message: "Request already ended" });
    }

    await storage.updateServiceRequest(requestId, { status: "cancelled" });

    if (request.mechanicId) {
      await storage.updateMechanic(request.mechanicId, { status: "available" });
    }

    return res.json({ message: "Request cancelled" });
  } catch (error) {
    console.error("Cancel request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getRequestHistory(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const history = await storage.getRequestHistory(userId);
    return res.json({ history });
  } catch (error) {
    console.error("Request history error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMechanicActiveRequest(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const mechanic = await storage.getMechanicByUserId(userId);
    if (!mechanic) {
      return res.status(404).json({ message: "Mechanic not found" });
    }

    const request = await storage.getActiveRequestForMechanic(mechanic.id);
    return res.json({ request: request || null });
  } catch (error) {
    console.error("Mechanic active request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMechanicJobHistory(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const mechanic = await storage.getMechanicByUserId(userId);
    if (!mechanic) {
      return res.status(404).json({ message: "Mechanic not found" });
    }

    const history = await storage.getMechanicJobHistory(mechanic.id);
    return res.json({ history });
  } catch (error) {
    console.error("Mechanic job history error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function submitRating(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { requestId, rating, review } = req.body;

    if (!requestId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Invalid rating data" });
    }

    const request = await storage.getServiceRequest(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.customerId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!request.mechanicId) {
      return res.status(400).json({ message: "No mechanic assigned" });
    }

    const newRating = await storage.createRating({
      requestId,
      customerId: userId,
      mechanicId: request.mechanicId,
      rating,
      review,
    });

    return res.status(201).json(newRating);
  } catch (error) {
    console.error("Submit rating error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
