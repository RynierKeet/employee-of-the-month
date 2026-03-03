import axios from "axios";

const baseURL = (import.meta as any)?.env?.VITE_API_URL || (import.meta as any)?.env?.VITE_API_BASE || "http://localhost:3000";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});