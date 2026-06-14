/**
 * Guarda el token en localStorage Y en una cookie `token`
 * para que el middleware de Next.js pueda leerlo en el edge.
 */
export function saveSession(token: string, role: string, user: unknown) {
    // localStorage — para componentes cliente
    localStorage.setItem("token", token);
    localStorage.setItem("role",  role);
    localStorage.setItem("user",  JSON.stringify(user));

    // Cookie — para el middleware (edge runtime no tiene localStorage)
    // SameSite=Strict evita CSRF; sin HttpOnly para que JS pueda borrarlo al logout
    const maxAge = 60 * 60 * 24 * 7; // 7 días
    document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

/**
 * Elimina la sesión de localStorage y borra la cookie.
 */
export function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; max-age=0";
}
