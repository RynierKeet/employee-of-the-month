import { Request, Response, NextFunction } from "express";

/**
 * Minimal CurrentUser shape stored in session.
 * Keep this small and avoid sensitive fields (no password_hash).
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
 * Store a CurrentUser in the session.
 * Use this after successful authentication.
 */
export function setCurrentUser(req: Request, user: CurrentUser): void {
  const session = (req.session as any);
  if (!session) return;
  // store a minimal user object only
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
}

/**
 * Returns the user's role. Defaults to Employee for unauthenticated requests.
 */
export function getIdentity(user: CurrentUser | null): CurrentUser["role"] {
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
 * If not authenticated, responds with 401.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

/**
 * Express middleware to require a specific role (or higher).
 * Example: requireRole("Admin")
 */
export function requireRole(role: CurrentUser["role"]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== role && role === "Admin") {
      // simple example: only exact match for now
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}