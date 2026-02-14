import { Router } from "express";
import db from "../db";
import { getCurrentUser, getIdentity } from "../utils/auth";

const router = Router();

// -----------------------------------------------------
// GET /employees
// Employees → only themselves
// Admins → everyone
// Adjudicators → everyone
// -----------------------------------------------------
router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const identity = getIdentity(user);

  try {
    // Admins + adjudicators see all employees
    if (user.is_admin || identity === "Adjudicator") {
      const rows = await db.all(
        "SELECT id, name, email, is_admin, is_adjudicator FROM employees ORDER BY name"
      );
      return res.json(rows);
    }

    // Employees see only themselves
    const me = await db.get(
      "SELECT id, name, email, is_admin, is_adjudicator FROM employees WHERE id = ?",
      [user.id]
    );

    return res.json([me]);
  } catch (err) {
    console.error("Error fetching employees:", err);
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
});

export default router;