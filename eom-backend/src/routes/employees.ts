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

  if (!user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  // Debug: confirm session user identity
  console.log("SESSION USER (employees route):", user);

  const identity = getIdentity(user); // "Admin" | "Adjudicator" | "Employee"

  try {
    // Admins + adjudicators see all employees
    if (identity === "Admin" || identity === "Adjudicator") {
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

    // 🔥 CRITICAL FIX:
    // If the employee is not found, return an empty array instead of [null]
    if (!me) {
      console.warn(
        "WARNING: Session user ID does not match any employee row. ID:",
        user.id
      );
      return res.json([]);
    }

    return res.json([me]);
  } catch (err) {
    console.error("Error fetching employees:", err);
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
});

export default router;