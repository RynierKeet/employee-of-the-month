import { Router } from "express";
import db from "../db";
import { getCurrentUser, getIdentity } from "../utils/auth";

const router = Router();

// Normalize YYYY-MM or YYYY-MM-DD → YYYY-MM
function normalizeMonthKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().slice(0, 7);
}

// -----------------------------------------------------
// GET /reflections?employee_id=1&month=2026-02
// GET /reflections?month=2026-02
// - If employee_id + month provided: return that employee's reflection(s)
// - If only month provided: return all reflections for that month
// -----------------------------------------------------
router.get("/", async (req, res) => {
  const employee_id = Number(req.query.employee_id || 0);
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(month);

  if (!month_key) {
    return res.status(400).json({ error: "Missing month query parameter" });
  }

  try {
    if (employee_id) {
      const rows = await db.all(
        `SELECT id, employee_id, month_key, reflection_text, created_at
         FROM reflections
         WHERE employee_id = ? AND month_key LIKE ?
         ORDER BY created_at DESC`,
        [employee_id, `${month_key}%`]
      );
      return res.json(rows || []);
    }

    const rows = await db.all(
      `SELECT id, employee_id, month_key, reflection_text, created_at
       FROM reflections
       WHERE month_key LIKE ?
       ORDER BY created_at DESC`,
      [`${month_key}%`]
    );

    return res.json(rows || []);
  } catch (err) {
    console.error("Error fetching reflections:", err);
    return res.status(500).json({ error: "Failed to fetch reflections" });
  }
});

// -----------------------------------------------------
// POST /reflections
// Employees submit reflections (Adjudicators cannot)
// -----------------------------------------------------
router.post("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  // Employees only
  const identity = getIdentity(user);
  if (identity !== "Employee") {
    return res.status(403).json({ error: "Adjudicators cannot submit reflections" });
  }

  // IMPORTANT:
  // We IGNORE employee_id from the body to prevent spoofing.
  const employee_id = user.id;

  const body = req.body ?? {};
  const raw_month_key = typeof body.month_key === "string" ? body.month_key : "";
  const month_key = normalizeMonthKey(raw_month_key);
  const reflection_text =
    typeof body.reflection_text === "string" ? body.reflection_text.trim() : "";

  if (!month_key || !reflection_text) {
    return res.status(400).json({
      error: "Missing month_key or reflection_text",
    });
  }

  try {
    // Check for existing reflection
    const existing = await db.get(
      `SELECT id, employee_id, month_key, reflection_text, created_at
       FROM reflections
       WHERE employee_id = ? AND month_key = ?`,
      [employee_id, month_key]
    );

    if (existing) {
      return res.status(409).json({
        error: "Reflection already submitted for this month",
        existing,
      });
    }

    // Insert new reflection
    const result = await db.run(
      "INSERT INTO reflections (employee_id, month_key, reflection_text) VALUES (?, ?, ?)",
      [employee_id, month_key, reflection_text]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      employee_id,
      month_key,
      reflection_text,
    });
  } catch (err: any) {
    console.error("Error saving reflection:", err);

    const msg = String(err?.message || "");
    if (/unique|constraint|duplicate/i.test(msg)) {
      return res.status(409).json({
        error: "Reflection already submitted for this month",
      });
    }

    return res.status(500).json({ error: "Failed to save reflection" });
  }
});

export default router;