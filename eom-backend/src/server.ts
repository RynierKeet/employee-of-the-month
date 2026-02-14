import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

import employeesRouter from "./routes/employees";
import reflectionsRouter from "./routes/reflections";
import votesRouter from "./routes/votes";
import resultsRouter from "./routes/results";
import resultsFinalRouter from "./routes/results-final";
import adminRouter from "./routes/admin";
import adjudicationRouter from "./routes/adjudication";

import db from "./db";

dotenv.config();

const app = express();

// -----------------------------------------------------
// CORE MIDDLEWARE
// -----------------------------------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// -----------------------------------------------------
// SESSION MIDDLEWARE (CRITICAL)
// -----------------------------------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set true only behind HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  })
);

// -----------------------------------------------------
// SIMPLE REQUEST LOGGER
// -----------------------------------------------------
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
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

  month_key = month_key.slice(0, 7);

  try {
    const existing = await db.get(
      "SELECT id FROM reflections WHERE employee_id = ? AND month_key = ? LIMIT 1",
      [employee_id, month_key]
    );

    if (existing) {
      return res.status(409).json({
        error: "You have already submitted a reflection for this month.",
        existing
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
    "/employees",
    "/reflections",
    "/votes",
    "/results",
    "/results-final",
    "/admin",
    "/adjudication"
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
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);

  const msg = String(err?.message || "");
  if (/unique|constraint|UNIQUE constraint failed/i.test(msg)) {
    return res.status(409).json({ error: "Duplicate entry detected." });
  }

  const status = err?.status || 500;
  const message = err?.message || "Internal server error";
  res.status(status).json({ error: message });
});

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
const PORT = process.env.PORT || 3000;

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