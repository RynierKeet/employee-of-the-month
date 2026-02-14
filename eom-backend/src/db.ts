// src/db.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "employee_of_month",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default {
  async get(sql: string, params: any[] = []) {
    const [rows] = await pool.query(sql, params);
    return Array.isArray(rows) && (rows as any[]).length ? (rows as any[])[0] : null;
  },

  async all(sql: string, params: any[] = []) {
    const [rows] = await pool.query(sql, params);
    return rows as any[];
  },

  // run executes statements (INSERT/UPDATE/DELETE). Returns the result object from mysql2.
  async run(sql: string, params: any[] = []) {
    const [result] = await pool.execute(sql, params);
    return result as any;
  },

  // expose pool if you need transactions or raw access
  pool,
};