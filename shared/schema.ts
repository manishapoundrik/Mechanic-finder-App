import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("customer"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mechanics = pgTable("mechanics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  shopName: text("shop_name").notNull(),
  specialty: text("specialty").notNull().default("General Repair"),
  phone: text("phone").notNull(),
  status: text("status").notNull().default("available"),
  rating: numeric("rating").notNull().default("5.0"),
  totalJobs: integer("total_jobs").notNull().default(0),
  workingHours: text("working_hours").notNull().default("8:00 AM - 6:00 PM"),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  address: text("address").notNull(),
  isSeeded: boolean("is_seeded").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceRequests = pgTable("service_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => users.id).notNull(),
  mechanicId: varchar("mechanic_id").references(() => mechanics.id),
  status: text("status").notNull().default("pending"),
  vehicleType: text("vehicle_type").default("car"),
  shopPlaceId: text("shop_place_id"),
  shopName: text("shop_name"),
  customerLatitude: numeric("customer_latitude").notNull(),
  customerLongitude: numeric("customer_longitude").notNull(),
  mechanicLatitude: numeric("mechanic_latitude"),
  mechanicLongitude: numeric("mechanic_longitude"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").references(() => serviceRequests.id).notNull(),
  customerId: varchar("customer_id").references(() => users.id).notNull(),
  mechanicId: varchar("mechanic_id").references(() => mechanics.id).notNull(),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  fullName: true,
  phone: true,
  role: true,
});

export const insertMechanicSchema = createInsertSchema(mechanics).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name required"),
  phone: z.string().optional(),
  role: z.enum(["customer", "mechanic"]).default("customer"),
  shopName: z.string().optional(),
  specialty: z.string().optional(),
  address: z.string().optional(),
  workingHours: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type Mechanic = typeof mechanics.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
