import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { setupRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import { storage } from "./storage";
import dotenv from "dotenv";

// Load environment variables once at the entry point
dotenv.config();

export function createServer() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Request logging middleware (production-safe: no response body logging)
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      if (path.startsWith("/api")) {
        const duration = Date.now() - start;
        log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });

    next();
  });

  return app;
}

/** Shared boot sequence: init DB + storage, log status */
async function bootstrap() {
  const isDatabaseConnected = await initializeDatabase();

  if (
    "waitForConnectionCheck" in storage &&
    typeof storage.waitForConnectionCheck === "function"
  ) {
    await storage.waitForConnectionCheck();
  }

  const storageStatus =
    "getStorageStatus" in storage &&
    typeof storage.getStorageStatus === "function"
      ? storage.getStorageStatus()
      : { type: "database", available: true };

  log(
    `Database: ${isDatabaseConnected ? "connected" : "unavailable"} | Storage: ${storageStatus.type}`,
  );

  return isDatabaseConnected;
}

// Development server
if (process.env.NODE_ENV !== "production") {
  (async () => {
    await bootstrap();

    const app = createServer();
    setupAuth(app);
    setupRoutes(app);

    const port = 5000;
    const host = "0.0.0.0";

    const server = app.listen(
      {
        port,
        host,
        ...(process.platform !== "win32" ? { reusePort: true } : {}),
      },
      () => log(`serving on http://${host}:${port}`),
    );

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  })();
}

// Production server
export async function startProductionServer() {
  await bootstrap();

  const app = createServer();
  setupAuth(app);
  setupRoutes(app);
  serveStatic(app);

  const port = parseInt(process.env.PORT || "10000", 10);
  const host = "0.0.0.0";

  const server = app.listen(port, host, () => {
    log(`SolarSense AI running on port ${port}`);
  });

  return server;
}

if (
  process.env.NODE_ENV === "production" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  startProductionServer().catch((error) => {
    console.error("Failed to start production server:", error);
    process.exit(1);
  });
}
