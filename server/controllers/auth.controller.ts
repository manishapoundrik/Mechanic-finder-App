import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "@shared/schema";
import { generateToken } from "../middleware/auth";
import * as storage from "../storage";

export async function register(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const {
      email,
      username,
      password,
      fullName,
      phone,
      role,
      shopName,
      specialty,
      address,
      workingHours,
    } = parsed.data;

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ message: "Username already taken" });
    }

    if (role === "mechanic" && (!shopName || !phone || !address)) {
      return res.status(400).json({
        message: "Shop name, phone, and address are required for mechanics",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user: any = await storage.createUser({
      email,
      username,
      password: hashedPassword,
      fullName,
      phone: phone || null,
      role,
    });

    if (role === "mechanic") {
      await storage.createMechanic({
        userId: user._id.toString(),
        shopName: shopName!,
        specialty: specialty || "General Repair",
        phone: phone || "",
        status: "available",
        rating: "5.0",
        totalJobs: 0,
        workingHours: workingHours || "8:00 AM - 6:00 PM",
        latitude: 0,
        longitude: 0,
        address: address!,
      });
    }

    const token = generateToken(user._id.toString());

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, password } = parsed.data;

    const user: any = await storage.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id.toString());

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────

export async function getProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

    const user: any = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let mechanicProfile = null;
    if (user.role === "mechanic") {
      mechanicProfile = await storage.getMechanicByUserId(userId);
    }

    return res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt || null,
      mechanic: mechanicProfile,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────

export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { fullName, phone, username } = req.body;

    const updated: any = await storage.updateUser(userId, {
      fullName,
      phone,
      username,
    });

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: updated._id,
      username: updated.username,
      email: updated.email,
      fullName: updated.fullName,
      phone: updated.phone,
      role: updated.role,
      createdAt: updated.createdAt || null,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}