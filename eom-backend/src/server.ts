import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import fs from "fs";
import path from "path";

import employeesRouter from "./routes/employees";
import reflectionsRouter from "./routes/reflections";
import votesRouter from "./routes/votes";
import resultsRouter from "./routes/results";
import resultsFinalRouter from "./routes/results-final";
import adminRouter from "./routes/admin";
import adjudicationRouter from "./routes/adjudication";
import authRouter from "./routes/auth";

import db from "./db";

dotenv.config();

const app = express();

// Use require for connect-sqlite3 to avoid missing type declarations in TS.
// Treat the store as `any` for middleware wiring.
const SQLiteStore: any = require("connect-sqlite3")(session);

// -----------------------------------------------------
// Ensure session directory exists (before session store is created)
// -----------------------------------------------------
const sessionDir = path.resolve(process.cwd(), "var");
try {
  fs.mkdirSync(sessionDir, { recursive: true });
} catch (err) {
  console.error("Could not create session directory:", err);
  // continue so the error is visible in logs; session store will fail loudly if unusable
}

// -----------------------------------------------------
// RATE LIMITER: require dynamically so TS/Node won't fail if package isn't installed
// If express-rate-limit is not installed, we fall back to a no-op middleware.
// -----------------------------------------------------
let createRateLimit: any = null;
try {
  createRateLimit = require("express-rate-limit");
} catch (err) {
  createRateLimit = null;
  console.warn(
    "express-rate-limit not installed; login rate limiting disabled. Install with: npm install express-rate-limit"
  );
}

const loginLimiter =
  createRateLimit
    ? createRateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // limit each IP to 10 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
      })
    : ((req: express.Request, res: express.Response, next: express.NextFunction) => next());

// -----------------------------------------------------
// LOGGER: require morgan dynamically; fallback to simple logger if missing
// -----------------------------------------------------
let morganMiddleware: any = null;
try {
  // require so missing types won't break compilation/runtime if not installed
  const morgan = require("morgan");
  morganMiddleware = morgan("dev");
} catch (err) {
  morganMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // minimal structured log fallback
    // eslint-disable-next-line no-console
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  };
  console.warn("morgan not installed; using simple console logger. Install with: npm install morgan");
}

// -----------------------------------------------------
// Require SESSION_SECRET (fail fast in production)
// -----------------------------------------------------
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
  console.error("SESSION_SECRET is not set. Exiting.");
  process.exit(1);
}
if (!SESSION_SECRET) {
  console.warn("SESSION_SECRET not set — using dev fallback. Set SESSION_SECRET in production.");
}

// -----------------------------------------------------
// CORE MIDDLEWARE
// -----------------------------------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morganMiddleware);

// Mount the limiter specifically on the login endpoint before authRouter is mounted
app.use("/auth/login", loginLimiter);

// -----------------------------------------------------
// SESSION MIDDLEWARE (CRITICAL)
// -----------------------------------------------------
// Lightweight SQLite-backed store for local development so sessions survive restarts.
// Replace with Redis or another shared store in production and set cookie.secure = true.
const isProd = process.env.NODE_ENV === "production";

app.use(
  session({
    store: new SQLiteStore({ db: "sessions.sqlite", dir: sessionDir }),
    secret: SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd, // set true only behind HTTPS in production
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// -----------------------------------------------------
// SIMPLE REQUEST LOGGER (additional to morgan for structured logs if desired)
// -----------------------------------------------------
app.use((req, _res, next) => {
  // keep this lightweight; morgan or fallback already logs basic info
  // eslint-disable-next-line no-console
  console.debug(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// -----------------------------------------------------
// GLOBAL ADJUDICATION MODE FLAG
// -----------------------------------------------------
let adjudicationMode = false;

app.get("/admin/adjudication/status", (_req, res) => {
  res.json({ adjudicationMode });
});

app.post("/admin/adjudication/start", (_req, res) => {
  adjudicationMode = true;
  res.json({ success: true, adjudicationMode });
});

app.post("/admin/adjudication/end", (_req, res) => {
  adjudicationMode = false;
  res.json({ success: true, adjudicationMode });
});

// -----------------------------------------------------
// HEALTH CHECK
// -----------------------------------------------------
app.get("/", (_req, res) => {
  res.json({ status: "EOM backend running" });
});

// -----------------------------------------------------
// REFLECTIONS UNIQUE‑PER‑MONTH MIDDLEWARE
// -----------------------------------------------------
async function reflectionsUniquePerMonthMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (req.method !== "POST") return next();

  const body = req.body || {};
  const employee_id = Number(body.employee_id || 0);
  let month_key = String(body.month_key || "").trim();

  if (!employee_id || !month_key) return next();

  // Normalize to YYYY-MM
  month_key = month_key.slice(0, 7);

  try {
    const existing = await db.get(
      "SELECT id FROM reflections WHERE employee_id = ? AND month_key = ? LIMIT 1",
      [employee_id, month_key]
    );

    if (existing) {
      return res.status(409).json({
        error: "You have already submitted a reflection for this month.",
        existing,
      });
    }

    next();
  } catch (err) {
    console.error("Error checking existing reflection:", err);
    return res.status(500).json({ error: "Failed to validate reflection uniqueness." });
  }
}

// -----------------------------------------------------
// ROUTE MOUNTING
// -----------------------------------------------------
const mountedRoutes: string[] = [];

app.use("/auth", authRouter);
mountedRoutes.push("POST/GET /auth/*");

app.use("/employees", employeesRouter);
mountedRoutes.push("GET/POST/PUT/DELETE /employees");

app.use("/reflections", reflectionsUniquePerMonthMiddleware, reflectionsRouter);
mountedRoutes.push("GET/POST /reflections");

app.use("/votes", votesRouter);
mountedRoutes.push("GET/POST /votes");

app.use("/results", resultsRouter);
mountedRoutes.push("GET /results");

app.use("/results-final", resultsFinalRouter);
mountedRoutes.push("GET /results-final");

app.use("/admin", adminRouter);
mountedRoutes.push("GET/POST/PUT/DELETE /admin/*");

app.use("/adjudication", adjudicationRouter);
mountedRoutes.push("GET/POST /adjudication");

// -----------------------------------------------------
// JSON 404 FOR API ROUTES
// -----------------------------------------------------
app.use((req, res, next) => {
  const accepts = String(req.headers.accept || "");
  const apiPrefixes = [
    "/auth",
    "/employees",
    "/reflections",
    "/votes",
    "/results",
    "/results-final",
    "/admin",
    "/adjudication",
  ];

  const isApi = apiPrefixes.some((p) => req.originalUrl.startsWith(p));

  if (accepts.includes("application/json") || isApi) {
    return res.status(404).json({ error: "API route not found" });
  }

  next();
});

// -----------------------------------------------------
// GENERIC 404
// -----------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// -----------------------------------------------------
// CENTRAL ERROR HANDLER
// -----------------------------------------------------
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);

    const msg = String(err?.message || "");
    if (/unique|constraint|UNIQUE constraint failed/i.test(msg)) {
      return res.status(409).json({ error: "Duplicate entry detected." });
    }

    const status = err?.status || 500;
    const message = err?.message || "Internal server error";
    res.status(status).json({ error: message });
  }
);

// -----------------------------------------------------
// ENSURE UNIQUE INDEX ON REFLECTIONS
// -----------------------------------------------------
async function ensureUniqueIndex() {
  try {
    await db.run(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_reflections_employee_month ON reflections(employee_id, month_key)"
    );
    console.log("Ensured unique index on reflections(employee_id, month_key)");
  } catch (err) {
    console.warn("Could not create unique index for reflections:", err);
  }
}

// -----------------------------------------------------
// START SERVER
// -----------------------------------------------------
const PORT = Number(process.env.PORT || 3000);

(async () => {
  try {
    await ensureUniqueIndex();
  } catch (err) {
    console.warn("ensureUniqueIndex error:", err);
  }

  app.listen(PORT, () => {
    console.log(`EOM backend running on http://localhost:${PORT}`);
    console.log("Mounted API prefixes:");
    mountedRoutes.forEach((r) => console.log("  " + r));
  });
})();

export default app;