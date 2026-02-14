import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../db";
import { getCurrentUser } from "../utils/auth";

const router = Router();

/* -----------------------------------------
   POST /auth/login
----------------------------------------- */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const [rows] = await db.pool.query(
      `SELECT id, name, email, password_hash, is_admin, is_adjudicator
       FROM employees
       WHERE email = ?`,
      [email]
    );

    const list = rows as any[];
    if (list.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = list[0] as {
      id: number;
      name: string;
      email: string;
      password_hash: string | null;
      is_admin: number;
      is_adjudicator: number;
    };

    const valid = await bcrypt.compare(password, user.password_hash || "");
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Use a safe cast to avoid TS complaining about possibly undefined session
    const session = req.session as any;
    if (!session) {
      return res.status(500).json({ error: "Session not initialized" });
    }

    session.employee_id = user.id;

    return res.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/* -----------------------------------------
   GET /auth/me
----------------------------------------- */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    return res.json(user);
  } catch (err) {
    console.error("Auth me error:", err);
    return res.status(500).json({ error: "Failed to load user" });
  }
});

/* -----------------------------------------
   POST /auth/logout
----------------------------------------- */
router.post("/logout", (req: Request, res: Response) => {
  const session = req.session as any;
  if (!session || typeof session.destroy !== "function") {
    // If for some reason there is no session, just respond success
    return res.json({ success: true });
  }

  session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;