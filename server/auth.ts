import { Express } from "express";
import { storage } from "./storage";
import { User as SelectUser, signupSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      user?: SelectUser;
      isAuthenticated(): boolean;
      sessionId?: string;
    }
  }
}

const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

const COOKIE_OPTIONS: import("express").CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: SESSION_MAX_AGE,
};

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePasswords(
  supplied: string,
  stored: string,
): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

/** Strips sensitive fields from a user object for API responses */
function safeUser(user: SelectUser) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    state: user.state,
    district: user.district,
  };
}

export function setupAuth(app: Express) {
  // Session middleware – resolves user from cookie or x-session-id header
  app.use(async (req, res, next) => {
    let sessionId =
      req.cookies?.sessionId || (req.headers["x-session-id"] as string);

    if (!sessionId) {
      sessionId = generateSessionId();
    }

    const user = await storage.getSessionUser(sessionId);
    if (user) {
      req.user = user;
      res.cookie("sessionId", sessionId, COOKIE_OPTIONS);
    }

    req.isAuthenticated = () => !!req.user;
    req.sessionId = sessionId;
    next();
  });

  // Login
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const sessionId = generateSessionId();
      await storage.createSession(sessionId, user.id);
      res.cookie("sessionId", sessionId, COOKIE_OPTIONS);

      res.json({ user: safeUser(user), sessionId });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/logout", async (req, res) => {
    try {
      if (req.sessionId) {
        await storage.deleteSession(req.sessionId);
      }
      res.clearCookie("sessionId");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.clearCookie("sessionId");
      res.json({ message: "Logged out successfully" });
    }
  });

  // Current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(safeUser(req.user!));
  });

  // Register
  app.post("/api/register", async (req, res) => {
    try {
      const validationResult = signupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res
          .status(400)
          .json({
            error:
              validationResult.error.errors[0]?.message || "Invalid input data",
          });
      }

      const {
        username,
        email,
        password,
        phone,
        state,
        district,
        householdName,
        address,
        solarCapacity,
        batteryCapacity,
      } = validationResult.data;

      const sanitized = {
        username: username.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        state: state.trim(),
        district: district.trim(),
        householdName: householdName.trim(),
        address: address.trim(),
      };

      // Parallel uniqueness checks
      const [existingEmail, existingUsername] = await Promise.all([
        storage.getUserByEmail(sanitized.email),
        storage.getUserByUsername(sanitized.username),
      ]);

      if (existingEmail)
        return res.status(400).json({ error: "Email already registered" });
      if (existingUsername)
        return res.status(400).json({ error: "Username already taken" });

      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username: sanitized.username,
        email: sanitized.email,
        password: hashedPassword,
        phone: sanitized.phone || null,
        state: sanitized.state || null,
        district: sanitized.district || null,
        householdName: sanitized.householdName,
      });

      await storage.createHousehold({
        userId: newUser.id,
        name: sanitized.householdName,
        address: sanitized.address,
        solarCapacity,
        batteryCapacity,
        currentBatteryLevel: 50,
      });

      // Auto-login
      const sessionId = generateSessionId();
      await storage.createSession(sessionId, newUser.id);
      res.cookie("sessionId", sessionId, COOKIE_OPTIONS);

      res.json({ user: safeUser(newUser), sessionId });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
}
