# Mechanic Finder — replit.md

## Overview

Mechanic Finder is a full-stack, production-ready mobile application modeled after Uber/Rapido-style real-time service matching. It connects customers who need vehicle repair with nearby mechanics in real time.

**Core user flows:**
- **Customers** search for nearby mechanics by GPS location, submit service requests, track request status live, and review job history.
- **Mechanics** receive incoming job requests via push notification (Socket.io), manage availability status, accept/reject jobs, and view earnings history.
- **Auth** is role-based (customer vs mechanic) with separate tab layouts and screens for each role.

The app runs as an Expo React Native frontend served alongside a Node.js/Express backend within the same Replit project.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework:** Expo SDK 54 with Expo Router v6 (file-based routing).
- **Language:** TypeScript throughout.
- **Routing structure:**
  - `app/(auth)/` — Login and signup screens.
  - `app/(customer)/` — Customer tab group: home (mechanic list), request tracking, history, profile.
  - `app/(mechanic)/` — Mechanic tab group: dashboard, jobs list, profile.
  - `app/(main)/` — Generic tab group (legacy/fallback).
  - `app/index.tsx` — Entry point that redirects based on auth state and user role.
- **State management:**
  - `AuthProvider` (`lib/auth-context.tsx`) — Stores user session, JWT token, and exposes login/register/logout/updateProfile methods. Persists token using `expo-secure-store` (native) or `AsyncStorage` (web).
  - `SocketProvider` (`lib/socket-context.tsx`) — Manages a single Socket.io client connection, auto-connects on auth, registers the socket with the server by role.
  - `QueryClientProvider` wraps the app with TanStack React Query for server-state caching.
- **API calls:** `lib/query-client.ts` — Central `apiRequest()` helper that builds URLs from `EXPO_PUBLIC_DOMAIN`, attaches JWT Bearer tokens, and throws on non-OK responses.
- **Tab navigation:** Adapts between native iOS tabs (using `expo-router/unstable-native-tabs` + SF Symbols) and classic cross-platform tabs (BlurView background on iOS, flat background on Android/web).
- **Animations:** `react-native-reanimated` used throughout for fade/slide/zoom entry animations.
- **Fonts:** Inter (400/500/600/700) loaded via `@expo-google-fonts/inter`.

### Backend (Express + Node.js)

- **Framework:** Express 5 with TypeScript, compiled via `tsx` for development and `esbuild` for production.
- **Entry:** `server/index.ts` → sets up CORS (Replit domain + localhost origins), body parsing, then calls `registerRoutes`.
- **Route organization:**
  - `POST/GET /api/auth/*` — Register, login, get/update profile.
  - `GET/PUT /api/mechanics/*` — Nearby mechanics (geospatial query), mechanic profile, status updates.
  - `POST/GET/DELETE /api/requests/*` — Create, fetch, cancel service requests; job history; ratings.
- **Controllers:** Thin — all DB logic delegated to `server/storage.ts`.
- **Middleware:** JWT authentication (`server/middleware/auth.ts`) using `jsonwebtoken`. Tokens expire in 7 days. `SESSION_SECRET` env var configures the signing key.
- **Real-time (Socket.io):** `server/sockets/socket.handler.ts` — Manages mechanic and customer socket registrations via in-memory Maps. Handles `request_mechanic`, `accept_request`, `decline_request`, `update_location`, `complete_request` events. Broadcasts job notifications to targeted mechanic sockets and status updates back to customers.

### Storage Layer

- **Database:** PostgreSQL via Drizzle ORM (`drizzle-orm/node-postgres`, pg pool).
- **Schema** (`shared/schema.ts`):
  - `users` — id, username, email, hashed password, fullName, phone, role (customer|mechanic), lat/lng, createdAt.
  - `mechanics` — id, userId (FK), shopName, specialty, phone, status, rating, totalJobs, workingHours, lat/lng, address, isSeeded, createdAt.
  - `serviceRequests` — id, customerId (FK), mechanicId (FK), status, customer lat/lng, mechanic lat/lng, description, timestamps.
  - `ratings` — links requests to star ratings.
- **Zod validation schemas** generated from Drizzle tables via `drizzle-zod` and extended with custom fields (e.g., `registerSchema`).
- **Storage abstraction** (`server/storage.ts`) — All ORM calls are isolated here. The file includes migration instructions for swapping to MongoDB/Mongoose without touching controllers or routes.
- **Geospatial:** Haversine formula implemented in-process (`server/services/geo.service.ts` and inside `storage.ts`) for proximity filtering. Radius default: 5 km.
- **Seeding:** `server/seed.ts` auto-seeds 12 demo mechanics around a base coordinate on first startup if the table is empty.

### Authentication & Authorization

- JWT Bearer tokens issued at login/register, stored securely on device.
- Every protected route uses the `authenticateToken` middleware that extracts `userId` from the token and attaches it to `req`.
- Role-based routing enforced on the frontend: mechanics land on `/(mechanic)/dashboard`, customers on `/(customer)/home`.

### Build & Deployment

- **Dev:** `server:dev` (tsx) + `expo:dev` (Metro with Replit proxy env vars) run concurrently.
- **Prod:** `expo:static:build` (Metro static export via `scripts/build.js`) + `server:build` (esbuild bundle) + `server:prod`.
- The Express server serves the static Expo web build in production and proxies Metro in development.
- `EXPO_PUBLIC_DOMAIN` env var tells the frontend where to point API calls. Must be set to `REPLIT_DEV_DOMAIN:5000` in dev.

---

## External Dependencies

| Dependency | Purpose |
|---|---|
| **PostgreSQL** (via `DATABASE_URL` env var) | Primary data store; provisioned as a Replit database |
| **Drizzle ORM** | Type-safe PostgreSQL query builder; migrations via `drizzle-kit push` |
| **Socket.io** | Bidirectional real-time communication for job dispatch and status updates |
| **jsonwebtoken** | JWT generation and verification for auth |
| **bcryptjs** | Password hashing at registration |
| **expo-location** | Device GPS for customer location and mechanic proximity queries |
| **expo-secure-store** | Secure JWT token storage on native devices |
| **AsyncStorage** | Token storage fallback for web platform |
| **TanStack React Query** | Server-state caching and refetching on the frontend |
| **expo-haptics** | Haptic feedback on interactions (native only) |
| **expo-blur** | Frosted glass tab bar background on iOS |
| **react-native-reanimated** | Smooth entry/exit animations |
| **react-native-gesture-handler** | Touch gesture support |
| **react-native-keyboard-controller** | Keyboard-aware scroll behavior |
| **@expo-google-fonts/inter** | Inter typeface |
| **esbuild** | Production server bundling |
| **patch-package** | Post-install patches for dependencies |

**Required environment variables:**
- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — JWT signing secret (falls back to a hardcoded default; set explicitly in production).
- `EXPO_PUBLIC_DOMAIN` — Public domain used by the frontend to construct API URLs (auto-set in dev via Replit env vars).
- `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` / `REPLIT_INTERNAL_APP_DOMAIN` — Used for CORS allowlist and build domain detection.