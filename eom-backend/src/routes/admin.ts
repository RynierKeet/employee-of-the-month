import { Router } from "express";
import db from "../db";
import { getCurrentUser } from "../utils/auth";

const router = Router();

// Normalize YYYY-MM or YYYY-MM-DD → YYYY-MM
function normalizeMonthKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().slice(0, 7);
}

// -----------------------------------------------------
// ADMIN-ONLY GUARD
// -----------------------------------------------------
router.use(async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    if (user.role !== "Admin") {
      return res.status(403).json({ error: "Admin access only" });
    }

    // attach user to request for downstream handlers (cast to any to avoid TS errors)
    (req as any).user = user;
    next();
  } catch (err) {
    console.error("Admin guard error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------------------------------
// GET /admin/employees
// List all employees
// -----------------------------------------------------
router.get("/employees", async (_req, res) => {
  try {
    const rows = await db.all(
      "SELECT id, name, email, is_admin, is_adjudicator FROM employees ORDER BY name"
    );
    return res.json(rows);
  } catch (err) {
    console.error("Error listing employees:", err);
    return res.status(500).json({ error: "Failed to list employees" });
  }
});

// -----------------------------------------------------
// POST /admin/employees
// Create a new employee
// Body: { name: string, is_adjudicator?: boolean, is_admin?: boolean }
// -----------------------------------------------------
router.post("/employees", async (req, res) => {
  const { name, is_adjudicator, is_admin } = req.body ?? {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Missing or invalid name" });
  }

  const adj = is_adjudicator ? 1 : 0;
  const adm = is_admin ? 1 : 0;

  try {
    const result = await db.run(
      "INSERT INTO employees (name, email, is_admin, is_adjudicator) VALUES (?, '', ?, ?)",
      [name.trim(), adm, adj]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      name: name.trim(),
      is_admin: adm,
      is_adjudicator: adj,
    });
  } catch (err) {
    console.error("Error creating employee:", err);
    return res.status(500).json({ error: "Failed to create employee" });
  }
});

// -----------------------------------------------------
// PUT /admin/employees/:id
// Update employee name or role flags
// Body: { name?: string, is_admin?: boolean, is_adjudicator?: boolean }
// -----------------------------------------------------
router.put("/employees/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid employee id" });

  const { name, is_admin, is_adjudicator } = req.body ?? {};

  const updates: string[] = [];
  const params: any[] = [];

  if (name && typeof name === "string") {
    updates.push("name = ?");
    params.push(name.trim());
  }

  if (typeof is_admin === "boolean") {
    updates.push("is_admin = ?");
    params.push(is_admin ? 1 : 0);
  }

  if (typeof is_adjudicator === "boolean") {
    updates.push("is_adjudicator = ?");
    params.push(is_adjudicator ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  params.push(id);

  try {
    await db.run(`UPDATE employees SET ${updates.join(", ")} WHERE id = ?`, params);
    const updated = await db.get(
      "SELECT id, name, email, is_admin, is_adjudicator FROM employees WHERE id = ?",
      [id]
    );
    return res.json({ success: true, updated });
  } catch (err) {
    console.error("Error updating employee:", err);
    return res.status(500).json({ error: "Failed to update employee" });
  }
});

// -----------------------------------------------------
// DELETE /admin/employees/:id
// Delete an employee + cascade cleanup
// -----------------------------------------------------
router.delete("/employees/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid employee id" });

  try {
    await db.run("DELETE FROM votes WHERE vote_for_id = ? OR voter_id = ?", [id, id]);
    await db.run("DELETE FROM reflections WHERE employee_id = ?", [id]);
    await db.run("DELETE FROM employees WHERE id = ?", [id]);

    return res.json({ success: true, deleted_employee_id: id });
  } catch (err) {
    console.error("Error deleting employee:", err);
    return res.status(500).json({ error: "Failed to delete employee" });
  }
});

// -----------------------------------------------------
// POST /admin/set-role
// Body: { employee_id: number, is_admin?: boolean, is_adjudicator?: boolean }
// -----------------------------------------------------
router.post("/set-role", async (req, res) => {
  const { employee_id, is_admin, is_adjudicator } = req.body ?? {};
  const id = Number(employee_id);

  if (!id) {
    return res.status(400).json({ error: "Invalid employee_id" });
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (typeof is_admin === "boolean") {
    updates.push("is_admin = ?");
    params.push(is_admin ? 1 : 0);
  }

  if (typeof is_adjudicator === "boolean") {
    updates.push("is_adjudicator = ?");
    params.push(is_adjudicator ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  params.push(id);

  try {
    await db.run(`UPDATE employees SET ${updates.join(", ")} WHERE id = ?`, params);
    const updated = await db.get(
      "SELECT id, name, email, is_admin, is_adjudicator FROM employees WHERE id = ?",
      [id]
    );
    return res.json({ success: true, updated });
  } catch (err) {
    console.error("Error setting role:", err);
    return res.status(500).json({ error: "Failed to set role" });
  }
});

// -----------------------------------------------------
// POST /admin/reset
// Deletes all votes + reflections for a given month_key
// -----------------------------------------------------
router.post("/reset", async (req, res) => {
  const { month_key } = req.body ?? {};
  if (!month_key || typeof month_key !== "string") {
    return res.status(400).json({ error: "Missing or invalid month_key" });
  }

  const normalized = normalizeMonthKey(month_key);

  try {
    await db.run("DELETE FROM votes WHERE month_key = ?", [normalized]);
    await db.run("DELETE FROM reflections WHERE month_key = ?", [normalized]);
    return res.json({ success: true, month_key: normalized });
  } catch (err) {
    console.error("Error resetting month:", err);
    return res.status(500).json({ error: "Failed to reset month" });
  }
});

// -----------------------------------------------------
// GET /admin/reflections?month=YYYY-MM
// Inspect reflections for a month
// -----------------------------------------------------
router.get("/reflections", async (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(month);

  if (!month_key) {
    return res.status(400).json({ error: "Missing month" });
  }

  try {
    const rows = await db.all(
      `SELECT r.id, r.employee_id, e.name, r.month_key, r.reflection_text, r.created_at
       FROM reflections r
       LEFT JOIN employees e ON e.id = r.employee_id
       WHERE r.month_key = ?
       ORDER BY e.name`,
      [month_key]
    );

    return res.json(rows);
  } catch (err) {
    console.error("Error fetching reflections for admin:", err);
    return res.status(500).json({ error: "Failed to fetch reflections" });
  }
});

// -----------------------------------------------------
// GET /admin/votes?month=YYYY-MM
// Inspect votes for a month
// -----------------------------------------------------
router.get("/votes", async (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(month);

  if (!month_key) {
    return res.status(400).json({ error: "Missing month" });
  }

  try {
    const rows = await db.all(
      `SELECT v.id, v.voter_id, v.vote_for_id, ve.name AS voter_name, vf.name AS voted_name,
              v.is_adjudication, v.month_key, v.created_at
       FROM votes v
       LEFT JOIN employees ve ON ve.id = v.voter_id
       LEFT JOIN employees vf ON vf.id = v.vote_for_id
       WHERE v.month_key = ?
       ORDER BY v.created_at DESC`,
      [month_key]
    );

    return res.json(rows);
  } catch (err) {
    console.error("Error fetching votes for admin:", err);
    return res.status(500).json({ error: "Failed to fetch votes" });
  }
});

export default router;