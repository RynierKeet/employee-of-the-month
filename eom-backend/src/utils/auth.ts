import db from "../db";

export async function getCurrentUser(req: any) {
  if (!req.session.employee_id) return null;

  const [rows] = await db.pool.query(
    "SELECT id, name, email, is_admin, is_adjudicator FROM employees WHERE id = ?",
    [req.session.employee_id]
  );

  if ((rows as any[]).length === 0) return null;
  return (rows as any[])[0];
}

export function getIdentity(user: any): "Employee" | "Adjudicator" {
  return user.is_adjudicator ? "Adjudicator" : "Employee";
}