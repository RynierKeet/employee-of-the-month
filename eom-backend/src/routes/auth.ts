import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../db";

const router = Router();

/* -----------------------------------------
   Helper: Normalize role
----------------------------------------- */
function deriveRole(row: any): "Admin" | "Adjudicator" | "Employee" {
  if (row.is_admin) return "Admin";
  if (row.is_adjudicator) return "Adjudicator";
  return "Employee";
}

/* -----------------------------------------
   Utility: minimal session user shape
----------------------------------------- */
export interface SessionUser {
  id: number;
  name?: string;
  email: string;
  role: "Admin" | "Adjudicator" | "Employee";
}

/* -----------------------------------------
   GET /auth/me
   - Returns the current session user if authenticated
----------------------------------------- */
router.get("/me", (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    const user: SessionUser | undefined = session?.user;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------------------
   POST /auth/login
   - Accepts { email, password }
   - Normalizes email, looks up user, compares bcrypt hash
   - Sets minimal session.user on success
----------------------------------------- */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const normalizedEmail = (String(email) || "").trim().toLowerCase();

    const query = `
      SELECT id, name, email, password_hash, is_admin, is_adjudicator, must_change_password
      FROM employees
      WHERE LOWER(TRIM(email)) = ?
      LIMIT 1
    `;
    const raw = await db.pool.query(query, [normalizedEmail]);
    const rows = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : (raw as any[]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const userRow = rows[0];

    if (!userRow.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(String(password), userRow.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const role = deriveRole(userRow);

    // Cast session once so TS stops complaining
    const session = req.session as any;
    if (!session) {
      return res.status(500).json({ error: "Session not initialized" });
    }

    const sessionUser: SessionUser = {
      id: userRow.id,
      name: userRow.name || undefined,
      email: userRow.email,
      role,
    };

    session.user = sessionUser;

    // 🔥 CRITICAL FIX: Save session before responding
    session.save((err: any) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Failed to save session" });
      }

      if (userRow.must_change_password) {
        return res.json({ success: true, mustChangePassword: true, user: sessionUser });
      }

      return res.json({ success: true, user: sessionUser });
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
    const sessionUser: SessionUser | undefined = session?.user;

    if (!sessionUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New password and confirmation do not match" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const q = `SELECT password_hash FROM employees WHERE id = ? LIMIT 1`;
    const raw = await db.pool.query(q, [sessionUser.id]);
    const rows = Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : (raw as any[]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRow = rows[0];
    if (!userRow.password_hash) {
      return res.status(400).json({ error: "No password set for this account" });
    }

    const currentValid = await bcrypt.compare(String(currentPassword), userRow.password_hash);
    if (!currentValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
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