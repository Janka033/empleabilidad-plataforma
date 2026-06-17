import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Rutas que requieren autenticación ────────────────────────────────────────
const PROTECTED = ["/vacantes", "/perfil", "/postular", "/empresa", "/admin", "/practica"];

// ── Rutas exclusivas de empresa ───────────────────────────────────────────────
const EMPRESA_ONLY = ["/empresa/dashboard"];

// ── Rutas exclusivas de estudiante ───────────────────────────────────────────
const ESTUDIANTE_ONLY = ["/vacantes", "/perfil", "/postular"];

// ── Rutas exclusivas de administrador ─────────────────────────────────────────
const ADMIN_ONLY = ["/admin"];

function homeFor(rol?: string) {
    if (rol === "admin")   return "/admin/dashboard";
    if (rol === "empresa") return "/empresa/dashboard";
    return "/vacantes";
}

// ── Rutas públicas (login, register) ─────────────────────────────────────────
const PUBLIC = ["/login", "/register", "/forgot-password"];

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        // Edge runtime: atob está disponible
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const json    = atob(base64);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Saltear assets y API routes de Next
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api")   ||
        pathname.includes(".")
    ) return NextResponse.next();

    const token = request.cookies.get("token")?.value;

    // ── Sin token: redirigir a login si la ruta es protegida ──────────────
    const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
    if (isProtected && !token) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
    }

    // ── Con token: verificar rol ───────────────────────────────────────────
    if (token) {
        const payload = decodeJwtPayload(token);
        const rol     = payload?.rol as string | undefined;

        // Redirigir si ya tiene sesión y va a login/register
        if (PUBLIC.some((p) => pathname.startsWith(p))) {
            const url = request.nextUrl.clone();
            url.pathname = homeFor(rol);
            return NextResponse.redirect(url);
        }

        // Solo el administrador puede entrar a rutas /admin
        if (rol !== "admin" && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
            const url = request.nextUrl.clone();
            url.pathname = homeFor(rol);
            return NextResponse.redirect(url);
        }

        // El administrador no usa las vistas de estudiante/empresa
        if (rol === "admin" && (EMPRESA_ONLY.some((p) => pathname.startsWith(p)) || ESTUDIANTE_ONLY.some((p) => pathname.startsWith(p)))) {
            const url = request.nextUrl.clone();
            url.pathname = "/admin/dashboard";
            return NextResponse.redirect(url);
        }

        // Estudiante intenta entrar a ruta de empresa → redirigir a vacantes
        if (rol === "estudiante" && EMPRESA_ONLY.some((p) => pathname.startsWith(p))) {
            const url = request.nextUrl.clone();
            url.pathname = "/vacantes";
            return NextResponse.redirect(url);
        }

        // Empresa intenta entrar a ruta de estudiante → redirigir a dashboard
        if (rol === "empresa" && ESTUDIANTE_ONLY.some((p) => pathname.startsWith(p))) {
            const url = request.nextUrl.clone();
            url.pathname = "/empresa/dashboard";
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
