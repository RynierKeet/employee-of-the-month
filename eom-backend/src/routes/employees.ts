import { Router } from "express";
import db from "../db";
import { getCurrentUser, getIdentity } from "../utils/auth";

const router = Router();

/* -----------------------------------------
   GET /employees
   Returns all employees (id, name, email, role)
----------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT id, name, email, role FROM employees ORDER BY name ASC"
    );
    return res.json(rows);
  } catch (err) {
    console.error("GET /employees error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/* -----------------------------------------
   POST /employees  (Admin-only)
----------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    const identity = getIdentity(user);
    if (identity !== "Admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, email, role } = req.body || {};

    if (!name && !email) {
      return res.status(400).json({ error: "name or email required" });
    }

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : null;

    console.log(">>> POST /employees body:", req.body);

    if (normalizedEmail) {
      const existing = await db.get(
        "SELECT id FROM employees WHERE LOWER(TRIM(email)) = ?",
        [normalizedEmail]
      );
      if (existing) return res.status(409).json({ error: "exists" });
    }

    const result = await db.run(
      "INSERT INTO employees (name, email, role, created_at) VALUES (?, ?, ?, datetime('now'))",
      [name || null, normalizedEmail || null, role || "Employee"]
    );

    const id = result.lastID;

    const created = await db.get(
      "SELECT id, name, email, role FROM employees WHERE id = ?",
      [id]
    );

    return res.status(201).json(created);
  } catch (err) {
    console.error("POST /employees error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;