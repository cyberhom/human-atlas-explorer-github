export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:5000").replace(/\/$/, "");

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { method: "GET", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `خطای HTTP ${response.status}`);
  }
  return body as T;
}
