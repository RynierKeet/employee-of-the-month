import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../db";

import {
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  setOverrideRole,
  CurrentUser,
} from "../utils/auth";

const router = Router();

/* -----------------------------------------
   Helper: Normalize role from DB flags
----------------------------------------- */
function deriveRole(row: any): "Admin" | "Adjudicator" | "Employee" {
  if (row.is_adjudicator) return "Adjudicator"; // 👈 prefer adjudicator if both
  if (row.is_admin) return "Admin";
  return "Employee";
}

/* -----------------------------------------
   GET /auth/me
----------------------------------------- */
router.get("/me", (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    const user = session?.user;

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    return res.json(user);
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------------------
   POST /auth/login
----------------------------------------- */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const normalizedEmail = (String(email) || "").trim().toLowerCase();

    // ⭐ FIXED: removed is_employee (column does not exist)
    const query = `
      SELECT id, name, email,
             password_hash,
             is_admin, is_adjudicator,
             must_change_password
      FROM employees
      WHERE LOWER(TRIM(email)) = ?
      LIMIT 1
    `;

    const raw = await db.pool.query(query, [normalizedEmail]);
    const rows = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : (raw as any[]);
    if (!rows || rows.length === 0) {
      console.warn("/auth/login: user not found for email", normalizedEmail);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const userRow = rows[0];

    // Allow login via TEMP password when password_hash is NULL, otherwise verify bcrypt hash
    const hash: string | null = userRow.password_hash ?? null;

    let valid = false;
    let tempLoginUsed = false;
    if (!hash) {
      const tempPassword = process.env.TEMP_LOGIN_PASSWORD || "Temp1234!";
      if (String(password) === String(tempPassword)) {
        valid = true;
        tempLoginUsed = true;
        try {
          // Force user to change password after temp login
          await db.pool.query(`UPDATE employees SET must_change_password = 1 WHERE id = ?`, [userRow.id]);
        } catch (e) {
          console.error("/auth/login: failed to set must_change_password for id", userRow.id, e);
        }
      } else {
        console.warn("/auth/login: user has no password_hash set and temp password mismatch, id", userRow.id);
        return res.status(401).json({ error: "Invalid email or password" });
      }
    } else {
      valid = await bcrypt.compare(String(password), hash);
      if (!valid) {
        console.warn("/auth/login: password mismatch for user id", userRow.id);
        return res.status(401).json({ error: "Invalid email or password" });
      }
    }

    const baseRole = deriveRole(userRow);

    const session = req.session as any;
    if (!session) {
      return res.status(500).json({ error: "Session not initialized" });
    }

    const sessionUser: CurrentUser = {
      id: userRow.id,
      name: userRow.name || undefined,
      email: userRow.email,
      role: baseRole,
    };

    // Store minimal user in session
    setCurrentUser(req, sessionUser);

    // Build available roles based on DB flags
    const availableRoles: Array<"Admin" | "Adjudicator" | "Employee"> = [];
    if (userRow.is_admin) {
      availableRoles.push("Admin", "Adjudicator", "Employee");
    } else if (userRow.is_adjudicator) {
      availableRoles.push("Adjudicator", "Employee");
    } else {
      availableRoles.push("Employee");
    }

    session.save((err: any) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Failed to save session" });
      }

      if (tempLoginUsed || userRow.must_change_password) {
        return res.json({
          success: true,
          mustChangePassword: true,
          user: sessionUser,
          availableRoles,
        });
      }

      return res.json({
        success: true,
        user: sessionUser,
        availableRoles,
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/* -----------------------------------------
   POST /auth/change-password
----------------------------------------- */
router.post("/change-password", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    const sessionUser = session?.user;

    if (!sessionUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New password and confirmation do not match" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const q = `SELECT password_hash, must_change_password FROM employees WHERE id = ? LIMIT 1`;
    const raw = await db.pool.query(q, [sessionUser.id]);
    const rows = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : (raw as any[]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRow = rows[0];

    if (userRow.must_change_password !== 1) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
      }

      const currentValid = await bcrypt.compare(String(currentPassword), userRow.password_hash);
      if (!currentValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    const newHash = await bcrypt.hash(String(newPassword), saltRounds);

    await db.pool.query(
      `UPDATE employees SET password_hash = ?, must_change_password = 0 WHERE id = ?`,
      [newHash, sessionUser.id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: "Failed to change password" });
  }
});

/* -----------------------------------------
   POST /auth/select-role
----------------------------------------- */
router.post("/select-role", async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const requestedRole = String(req.body?.role || "").trim() as CurrentUser["role"];

    // Determine allowed roles based on DB-derived role
    const allowedRoles: CurrentUser["role"][] = [];

    if (user.role === "Admin") {
      allowedRoles.push("Admin", "Adjudicator", "Employee");
    } else if (user.role === "Adjudicator") {
      allowedRoles.push("Adjudicator", "Employee");
    } else {
      allowedRoles.push("Employee");
    }

    if (!allowedRoles.includes(requestedRole)) {
      return res.status(403).json({ error: "Role not permitted for this user" });
    }

    setOverrideRole(req, requestedRole);

    return res.json({ success: true, role: requestedRole });
  } catch (err) {
    console.error("POST /auth/select-role error:", err);
    return res.status(500).json({ error: "Failed to select role" });
  }
});

/* -----------------------------------------
   POST /auth/logout
----------------------------------------- */
router.post("/logout", (req: Request, res: Response) => {
  try {
    (req.session as any)?.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Logout failed" });
  }
});

export default router;