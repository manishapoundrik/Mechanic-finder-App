import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import * as storage from "../storage";

let io: SocketServer;

const mechanicSockets = new Map<string, string>();
const customerSockets = new Map<string, string>();
const requestTimeouts = new Map<string, NodeJS.Timeout>();

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("register_mechanic", ({ mechanicId }: { mechanicId: string }) => {
      mechanicSockets.set(mechanicId, socket.id);
      socket.join(`mechanic:${mechanicId}`);
    });

    socket.on("register_customer", ({ customerId }: { customerId: string }) => {
      customerSockets.set(customerId, socket.id);
      socket.join(`customer:${customerId}`);
    });

    socket.on(
      "request_mechanic",
      async ({
        requestId,
        customerId,
        customerLat,
        customerLng,
      }: {
        requestId: string;
        customerId: string;
        customerLat: number;
        customerLng: number;
      }) => {
        try {
          const nearbyMechanics = await storage.getNearbyMechanics(customerLat, customerLng, 5);

          if (nearbyMechanics.length === 0) {
            socket.emit("no_mechanics_available");
            await storage.updateServiceRequest(requestId, { status: "cancelled" });
            return;
          }

          for (const mechanic of nearbyMechanics) {
            const mSocketId = mechanicSockets.get(mechanic.id);
            if (mSocketId) {
              io.to(`mechanic:${mechanic.id}`).emit("new_request", {
                requestId,
                customerId,
                customerLat,
                customerLng,
                distance: mechanic.distance.toFixed(1),
              });
            }
          }

          const timeout = setTimeout(async () => {
            const req = await storage.getServiceRequest(requestId);
            if (req && req.status === "pending") {
              await storage.updateServiceRequest(requestId, { status: "cancelled" });
              io.to(`customer:${customerId}`).emit("request_timeout");
            }
            requestTimeouts.delete(requestId);
          }, 30000);

          requestTimeouts.set(requestId, timeout);
        } catch (err) {
          console.error("request_mechanic socket error:", err);
        }
      }
    );

    socket.on(
      "accept_request",
      async ({
        requestId,
        mechanicId,
        mechanicLat,
        mechanicLng,
      }: {
        requestId: string;
        mechanicId: string;
        mechanicLat: number;
        mechanicLng: number;
      }) => {
        try {
          const req = await storage.getServiceRequest(requestId);
          if (!req || req.status !== "pending") {
            socket.emit("request_already_taken");
            return;
          }

          const timeout = requestTimeouts.get(requestId);
          if (timeout) {
            clearTimeout(timeout);
            requestTimeouts.delete(requestId);
          }

          await storage.updateServiceRequest(requestId, {
            status: "accepted",
            mechanicId,
            mechanicLatitude: String(mechanicLat),
            mechanicLongitude: String(mechanicLng),
          });

          await storage.updateMechanic(mechanicId, { status: "busy" });

          const mechanic = await storage.getMechanicById(mechanicId);
          const mechanicUser = mechanic?.userId
            ? await storage.getUser(mechanic.userId)
            : null;

          io.to(`customer:${req.customerId}`).emit("request_accepted", {
            requestId,
            mechanicId,
            mechanicName: mechanic?.shopName || "Mechanic",
            mechanicPhone: mechanic?.phone || "",
            mechanicRating: mechanic?.rating || "5.0",
            mechanicLat,
            mechanicLng,
          });

          io.to(`mechanic:${mechanicId}`).emit("request_confirmed", {
            requestId,
            customerLat: parseFloat(String(req.customerLatitude)),
            customerLng: parseFloat(String(req.customerLongitude)),
          });
        } catch (err) {
          console.error("accept_request socket error:", err);
        }
      }
    );

    socket.on(
      "reject_request",
      async ({ requestId, mechanicId }: { requestId: string; mechanicId: string }) => {
        socket.emit("request_rejected_ack", { requestId });
      }
    );

    socket.on(
      "update_mechanic_location",
      async ({
        requestId,
        mechanicId,
        lat,
        lng,
      }: {
        requestId: string;
        mechanicId: string;
        lat: number;
        lng: number;
      }) => {
        try {
          const req = await storage.getServiceRequest(requestId);
          if (req) {
            await storage.updateServiceRequest(requestId, {
              mechanicLatitude: String(lat),
              mechanicLongitude: String(lng),
            });
            io.to(`customer:${req.customerId}`).emit("mechanic_location_update", {
              lat,
              lng,
            });
          }
        } catch (err) {
          console.error("update_mechanic_location error:", err);
        }
      }
    );

    socket.on(
      "complete_request",
      async ({ requestId, mechanicId }: { requestId: string; mechanicId: string }) => {
        try {
          const req = await storage.getServiceRequest(requestId);
          if (!req) return;

          await storage.updateServiceRequest(requestId, { status: "completed" });
          await storage.updateMechanic(mechanicId, { status: "available" });

          io.to(`customer:${req.customerId}`).emit("request_completed", { requestId });
        } catch (err) {
          console.error("complete_request error:", err);
        }
      }
    );

    socket.on(
      "cancel_request",
      async ({
        requestId,
        customerId,
      }: {
        requestId: string;
        customerId: string;
      }) => {
        try {
          const req = await storage.getServiceRequest(requestId);
          if (!req) return;

          const timeout = requestTimeouts.get(requestId);
          if (timeout) {
            clearTimeout(timeout);
            requestTimeouts.delete(requestId);
          }

          await storage.updateServiceRequest(requestId, { status: "cancelled" });

          if (req.mechanicId) {
            await storage.updateMechanic(req.mechanicId, { status: "available" });
            io.to(`mechanic:${req.mechanicId}`).emit("request_cancelled_by_customer", { requestId });
          }
        } catch (err) {
          console.error("cancel_request error:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      for (const [mechId, sId] of mechanicSockets.entries()) {
        if (sId === socket.id) mechanicSockets.delete(mechId);
      }
      for (const [custId, sId] of customerSockets.entries()) {
        if (sId === socket.id) customerSockets.delete(custId);
      }
    });
  });

  return io;
}

export function getSocketServer() {
  return io;
}
