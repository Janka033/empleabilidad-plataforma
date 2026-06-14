// ── URLs de microservicios ────────────────────────────────────────────────────
export const API_URLS = {
  auth:     process.env.NEXT_PUBLIC_AUTH_URL     || "http://localhost:3001",
  perfiles: process.env.NEXT_PUBLIC_PERFILES_URL || "http://localhost:3002",
  vacantes: process.env.NEXT_PUBLIC_VACANTES_URL || "http://localhost:3003",
} as const;

// ── Headers con JWT ───────────────────────────────────────────────────────────
export function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

// ── Extrae el mensaje de error de una respuesta no-OK ─────────────────────────
export async function parseApiError(res: Response, fallback = "Error del servidor"): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || body?.error || fallback;
  } catch {
    return fallback;
  }
}

// ── Decodifica el payload del JWT sin librería ────────────────────────────────
export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

// ── Obtiene el rol del token guardado en localStorage ────────────────────────
// Uso: solo en componentes cliente ("use client")
export function getRolFromStorage(): "estudiante" | "empresa" | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;
  const payload = decodeToken(token);
  const rol = payload?.rol as string | undefined;
  return rol === "empresa" ? "empresa" : rol === "estudiante" ? "estudiante" : null;
}
