import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { initSocketServer } from "./sockets/socket.handler";
// import { seedMechanics } from "./seed";
import authRoutes from "./routes/auth.routes";
import mechanicsRoutes from "./routes/mechanics.routes";
import requestsRoutes from "./routes/requests.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRoutes);
  app.use("/api/mechanics", mechanicsRoutes);
  app.use("/api/requests", requestsRoutes);

  const httpServer = createServer(app);
  initSocketServer(httpServer);

  // await seedMechanics();

  return httpServer;
}
