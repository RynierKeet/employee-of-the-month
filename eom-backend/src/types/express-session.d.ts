import "express-session";

declare module "express-session" {
  interface SessionData {
    employee_id?: number;
  }
}