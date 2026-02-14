import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    session?: {
      employee_id?: number;
      // add other session fields here if needed
    };

    user?: {
      id: number;
      name?: string;
      email?: string;
      is_admin?: number;
      is_adjudicator?: number;
    };

    identity?: "Employee" | "Adjudicator";
  }
}