// backend/auth.ts
import { Request, Response, NextFunction } from "express";

/**
 * Minimal CurrentUser shape stored in session.
 */
export interface CurrentUser {
  id: number;
  name?: string;
  email: string;
  role: "Admin" | "Adjudicator" | "Employee";
}

/**
 * Safely read the session user.
 */
export async function getCurrentUser(req: Request): Promise<CurrentUser | null> {
  const session = (req.session as any) ?? null;
  if (!session || !session.user) return null;
  return session.user as CurrentUser;
}

/**
 * Store a CurrentUser in the session. Use this after successful authentication.
 */
export function setCurrentUser(req: Request, user: CurrentUser): void {
  const session = (req.session as any);
  if (!session) return;
  session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  } as CurrentUser;
}

/**
 * Remove the user from session (logout).
 */
export function clearCurrentUser(req: Request): void {
  const session = (req.session as any);
  if (!session) return;
  delete session.user;
  delete session.overrideRole;
}

/**
 * Set an override role for this session.
 */
export function setOverrideRole(
  req: Request,
  role: CurrentUser["role"]
): void {
  const session = (req.session as any);
  if (!session) return;
  session.overrideRole = role;
}

/**
 * Get the effective identity for this request:
 * session override if present, else user's stored role, else Employee.
 */
export function getIdentity(
  user: CurrentUser | null,
  req?: Request
): CurrentUser["role"] {
  const session = (req?.session as any) ?? null;
  const override = session?.overrideRole as CurrentUser["role"] | undefined;
  if (override) return override;
  if (!user) return "Employee";
  return user.role;
}

/**
 * Convenience boolean check.
 */
export async function isAuthenticated(req: Request): Promise<boolean> {
  const user = await getCurrentUser(req);
  return !!user;
}

/**
 * Express middleware to require authentication.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

/**
 * Express middleware to require a specific role (simple exact match).
 */
export function requireRole(role: CurrentUser["role"]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const identity = getIdentity(user, req);
    if (identity !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}