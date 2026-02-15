/**
 * dd-trace MUST be required before any other module so that its
 * monkey-patching hooks intercept all downstream imports (express,
 * pg, ioredis, etc.).  Moving this import below other modules will
 * cause traces to be silently dropped.
 */
import "dd-trace/init";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { defaultLimiter } from "./middleware/rate-limiter";
import { globalErrorHandler } from "./middleware/error-handler";
import { logger } from "./lib/logger";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import tenantRoutes from "./routes/tenant";
import complianceRoutes from "./routes/compliance";
import flagsRoutes from "./routes/flags";

// ------------------------------------------------------------------ //
//  App setup                                                          //
// ------------------------------------------------------------------ //

const app = express();

// ---- Middleware (order matters) --------------------------------- //

// 1. CORS - must come first so pre-flight OPTIONS requests are handled
//    before any other middleware rejects them.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  }),
);

// 2. Helmet - sets security-related HTTP headers.
app.use(helmet());

// 3. Compression - compress response bodies for all requests.
app.use(compression());

// 4. Rate limiter - applied globally; auth routes add a stricter limiter.
app.use(defaultLimiter);

// 5. JSON body parser.
app.use(express.json({ limit: "1mb" }));

// ---- Health check (unauthenticated) ----------------------------- //

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "gateway", timestamp: new Date().toISOString() });
});

// ---- Route groups ----------------------------------------------- //

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/tenant", tenantRoutes);
app.use("/api/v1/compliance", complianceRoutes);
app.use("/api/v1/flags", flagsRoutes);

// ---- Global error handler (must be registered last) ------------- //

app.use(globalErrorHandler);

// ------------------------------------------------------------------ //
//  Start server                                                       //
// ------------------------------------------------------------------ //

const PORT = parseInt(process.env.GATEWAY_PORT ?? "4000", 10);

app.listen(PORT, () => {
  logger.info({ port: PORT }, "CrestDesk Gateway listening");
});

export default app;
