import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import fs from "fs";
import path from "path";
import https from "https";

import employeesRouter from "./routes/employees";
import reflectionsRouter from "./routes/reflections";
import votesRouter from "./routes/votes";
import resultsRouter from "./routes/results";
import resultsFinalRouter from "./routes/results-final";
import adminRouter from "./routes/admin";
import adjudicationRouter from "./routes/adjudication";
import authRouter from "./routes/auth";

// ⭐ NEW — multi‑question voting engine
import votingRouter from "./routes/voting";

import db from "./db";

dotenv.config();

const app = express();

// -----------------------------------------------------
// HTTPS CERTIFICATES FOR LOCAL DEVELOPMENT
// -----------------------------------------------------
const key = fs.readFileSync(path.join(process.cwd(), "certs", "localhost-key.pem"));
const cert = fs.readFileSync(path.join(process.cwd(), "certs", "localhost.pem"));

// -----------------------------------------------------
// SESSION STORE
// -----------------------------------------------------
const SQLiteStore: any = require("connect-sqlite3")(session);

/* -----------------------------------------------------
   Ensure session directory exists
----------------------------------------------------- */
const sessionDir = path.resolve(process.cwd(), "var");
try {
  fs.mkdirSync(sessionDir, { recursive: true });
} catch (err) {
  console.error("Could not create session directory:", err);
}

/* -----------------------------------------------------
   RATE LIMITER
----------------------------------------------------- */
let createRateLimit: any = null;
try {
  createRateLimit = require("express-rate-limit");
} catch (err) {
  createRateLimit = null;
  console.warn("express-rate-limit not installed; login rate limiting disabled.");
}

const loginLimiter =
  createRateLimit
    ? createRateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
      })
    : ((req: express.Request, res: express.Response, next: express.NextFunction) => next());

/* -----------------------------------------------------
   LOGGER
----------------------------------------------------- */
let morganMiddleware: any = null;
try {
  const morgan = require("morgan");
  morganMiddleware = morgan("dev");
} catch (err) {
  morganMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  };
  console.warn("morgan not installed; using simple console logger.");
}

/* -----------------------------------------------------
   SESSION SECRET
----------------------------------------------------- */
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
  console.error("SESSION_SECRET is not set. Exiting.");
  process.exit(1);
}
if (!SESSION_SECRET) {
  console.warn("SESSION_SECRET not set — using dev fallback.");
}

/* -----------------------------------------------------
   CORE MIDDLEWARE
----------------------------------------------------- */

// ⭐ IMPORTANT: Frontend will run on HTTPS now
app.use(
  cors({
    origin: "https://localhost:5175",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morganMiddleware);

// Mount the limiter specifically on the login endpoint
app.use("/auth/login", loginLimiter);

/* -----------------------------------------------------
   SESSION MIDDLEWARE — NOW HTTPS‑COMPATIBLE
----------------------------------------------------- */

app.set("trust proxy", 1); // ⭐ REQUIRED for Secure + SameSite=None cookies

app.use(
  session({
    store: new SQLiteStore({ db: "sessions.sqlite", dir: sessionDir }),
    secret: SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,      // ⭐ REQUIRED for SameSite=None
      sameSite: "none",  // ⭐ REQUIRED for cross-origin cookies
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

/* -----------------------------------------------------
   SIMPLE REQUEST LOGGER
----------------------------------------------------- */
app.use((req, _res, next) => {
  console.debug(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

/* -----------------------------------------------------
   GLOBAL ADJUDICATION MODE FLAG
----------------------------------------------------- */
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

/* -----------------------------------------------------
   HEALTH CHECK
----------------------------------------------------- */
app.get("/", (_req, res) => {
  res.json({ status: "EOM backend running" });
});

/* -----------------------------------------------------
   REFLECTIONS UNIQUE‑PER‑MONTH MIDDLEWARE
----------------------------------------------------- */
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
    return res
      .status(500)
      .json({ error: "Failed to validate reflection uniqueness." });
  }
}

/* -----------------------------------------------------
   ROUTE MOUNTING
----------------------------------------------------- */
const mountedRoutes: string[] = [];

app.use("/auth", authRouter);
mountedRoutes.push("POST/GET /auth/*");

app.use("/employees", employeesRouter);
mountedRoutes.push("GET/POST/PUT/DELETE /employees");

app.use("/reflections", reflectionsUniquePerMonthMiddleware, reflectionsRouter);
mountedRoutes.push("GET/POST /reflections");

// ⭐ NEW — multi‑question voting engine
app.use("/voting", votingRouter);
mountedRoutes.push("GET/POST /voting/*");

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

/* -----------------------------------------------------
   JSON 404 FOR API ROUTES
----------------------------------------------------- */
app.use((req, res, next) => {
  const accepts = String(req.headers.accept || "");

  const apiPrefixes = [
    "/auth",
    "/employees",
    "/reflections",
    "/voting",
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

/* -----------------------------------------------------
   GENERIC 404
----------------------------------------------------- */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

/* -----------------------------------------------------
   CENTRAL ERROR HANDLER
----------------------------------------------------- */
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

/* -----------------------------------------------------
   ENSURE UNIQUE INDEX ON REFLECTIONS
----------------------------------------------------- */
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

/* -----------------------------------------------------
   START HTTPS SERVER
----------------------------------------------------- */
const PORT = Number(process.env.PORT || 3000);

(async () => {
  try {
    await ensureUniqueIndex();
  } catch (err) {
    console.warn("ensureUniqueIndex error:", err);
  }

  https.createServer({ key, cert }, app).listen(PORT, () => {
    console.log(`HTTPS backend running on https://localhost:${PORT}`);
    console.log("Mounted API prefixes:");
    mountedRoutes.forEach((r) => console.log("  " + r));
  });
})();

export default app;