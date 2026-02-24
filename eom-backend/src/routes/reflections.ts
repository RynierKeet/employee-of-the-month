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
// Auto-creates a draft if none exists.
// -----------------------------------------------------
router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const employee_id = Number(req.query.employee_id || user.id);
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(month);

  if (!month_key) {
    return res.status(400).json({ error: "Missing month query parameter" });
  }

  try {
    // Check if reflection exists
    const existing = await db.get(
      `SELECT *
       FROM reflections
       WHERE employee_id = ? AND month_key = ?
       LIMIT 1`,
      [employee_id, month_key]
    );

    if (existing) {
      return res.json(existing);
    }

    // Auto-create draft
    const result = await db.run(
      `INSERT INTO reflections
        (employee_id, month_key,
         achievements_text, impact_text, values_text,
         growth_text, beyond_text, nomination_text,
         is_final)
       VALUES (?, ?, '', '', '', '', '', '', 0)`,
      [employee_id, month_key]
    );

    const created = await db.get(
      `SELECT * FROM reflections WHERE id = ?`,
      [result.lastID]
    );

    return res.json(created);
  } catch (err) {
    console.error("Error fetching reflections:", err);
    return res.status(500).json({ error: "Failed to fetch reflections" });
  }
});

// -----------------------------------------------------
// PUT /reflections/:id
// Auto-save or Save Draft.
// Only allowed if is_final = 0.
// -----------------------------------------------------
router.put("/:id", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const id = Number(req.params.id);

  const {
    achievements_text = "",
    impact_text = "",
    values_text = "",
    growth_text = "",
    beyond_text = "",
    nomination_text = "",
  } = req.body || {};

  try {
    const existing = await db.get(
      `SELECT * FROM reflections WHERE id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: "Reflection not found" });
    }

    if (existing.employee_id !== user.id) {
      return res.status(403).json({ error: "Not your reflection" });
    }

    if (existing.is_final === 1) {
      return res.status(403).json({ error: "Reflection is final and cannot be edited" });
    }

    await db.run(
      `UPDATE reflections SET
        achievements_text = ?,
        impact_text = ?,
        values_text = ?,
        growth_text = ?,
        beyond_text = ?,
        nomination_text = ?
       WHERE id = ?`,
      [
        achievements_text,
        impact_text,
        values_text,
        growth_text,
        beyond_text,
        nomination_text,
        id,
      ]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Error updating reflection:", err);
    return res.status(500).json({ error: "Failed to update reflection" });
  }
});

// -----------------------------------------------------
// POST /reflections/:id/finalize
// Locks the reflection permanently.
// -----------------------------------------------------
router.post("/:id/finalize", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const id = Number(req.params.id);

  try {
    const existing = await db.get(
      `SELECT * FROM reflections WHERE id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: "Reflection not found" });
    }

    if (existing.employee_id !== user.id) {
      return res.status(403).json({ error: "Not your reflection" });
    }

    if (existing.is_final === 1) {
      return res.status(400).json({ error: "Reflection already final" });
    }

    // Validate all fields
    const requiredFields = [
      "achievements_text",
      "impact_text",
      "values_text",
      "growth_text",
      "beyond_text",
      "nomination_text",
    ];

    for (const field of requiredFields) {
      if (!existing[field] || existing[field].trim() === "") {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    await db.run(
      `UPDATE reflections SET is_final = 1 WHERE id = ?`,
      [id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Error finalizing reflection:", err);
    return res.status(500).json({ error: "Failed to finalize reflection" });
  }
});

export default router;