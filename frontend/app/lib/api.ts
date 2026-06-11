export const API_URLS = {
  auth: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3001",
  perfiles: process.env.NEXT_PUBLIC_PERFILES_URL || "http://localhost:3002",
  vacantes: process.env.NEXT_PUBLIC_VACANTES_URL || "http://localhost:3003",
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function authHeaders(token = getToken()): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function parseApiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.message || fallback;
  } catch {
    return fallback;
  }
}
