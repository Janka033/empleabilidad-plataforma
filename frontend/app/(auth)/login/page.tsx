"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URLS } from "../../lib/api";
import { saveSession } from "../../lib/auth";

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_URLS.auth}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || "Credenciales inválidas");
                return;
            }

            // Guarda en localStorage + cookie (para el middleware edge)
            saveSession(data.token, data.role, data.user);

            // ── Redirección según rol ─────────────────────────────────────
            if (data.role === "empresa") {
                router.push("/empresa/dashboard");
            } else {
                router.push("/vacantes");
            }
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* Panel izquierdo — navy */}
            <div
                style={{ width: "50%", backgroundColor: "#0d1c32", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px", position: "relative", overflow: "hidden" }}
                className="hidden lg:flex"
            >
                <div style={{ position: "absolute", top: 0, right: 0, width: "384px", height: "384px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "9999px", transform: "translate(50%, -50%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "256px", height: "256px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "9999px", transform: "translate(-50%, 50%)" }} />
                <div style={{ position: "absolute", top: "50%", right: "32px", width: "128px", height: "128px", backgroundColor: "rgba(249,115,22,0.1)", borderRadius: "9999px", transform: "translateY(-50%)" }} />

                <div style={{ position: "relative", zIndex: 10 }}>
                    <span style={{ color: "white", fontSize: "24px", fontWeight: "700", letterSpacing: "-0.025em" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
                    <p style={{ color: "#b9c7e4", fontSize: "14px", marginTop: "4px" }}>
                        Plataforma de empleabilidad universitaria
                    </p>
                </div>

                <div style={{ position: "relative", zIndex: 10 }}>
                    <h2 style={{ color: "white", fontSize: "36px", fontWeight: "700", lineHeight: "1.2", marginBottom: "16px" }}>
                        Tu carrera<br />profesional<br />
                        <span style={{ color: "#f97316" }}>comienza aquí.</span>
                    </h2>
                    <p style={{ color: "#76849f", fontSize: "16px", lineHeight: "1.6", maxWidth: "384px" }}>
                        Conectamos estudiantes universitarios colombianos con empresas que buscan talento en formación.
                    </p>
                    <div style={{ display: "flex", gap: "32px", marginTop: "40px" }}>
                        {[["+ 1.200", "Vacantes activas"], ["+340", "Empresas aliadas"], ["+5k", "Estudiantes"]].map(([num, label]) => (
                            <div key={label}>
                                <p style={{ color: "white", fontSize: "24px", fontWeight: "700" }}>{num}</p>
                                <p style={{ color: "#76849f", fontSize: "14px" }}>{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p style={{ position: "relative", zIndex: 10, color: "#44474d", fontSize: "12px" }}>
                    © 2025 EmpleoUni — CUE Armenia, Quindío
                </p>
            </div>

            {/* Panel derecho — formulario */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "#fbf9fb", padding: "48px 24px" }}>
                <div className="lg:hidden" style={{ marginBottom: "32px", textAlign: "center" }}>
                    <span style={{ color: "#0d1c32", fontSize: "24px", fontWeight: "700" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
                </div>

                <div style={{ width: "100%", maxWidth: "448px" }}>
                    <div style={{ marginBottom: "32px" }}>
                        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1b1b1d", letterSpacing: "-0.025em" }}>
                            Iniciar sesión
                        </h1>
                        <p style={{ color: "#44474d", fontSize: "14px", marginTop: "4px" }}>
                            ¿No tienes cuenta?{" "}
                            <Link
                                href="/register"
                                style={{ color: "#0d1c32", fontWeight: "600", textDecoration: "none" }}
                                onMouseOver={(e) => (e.currentTarget.style.color = "#f97316")}
                                onMouseOut={(e)  => (e.currentTarget.style.color = "#0d1c32")}
                            >
                                Regístrate gratis
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div>
                            <label htmlFor="email" style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#1b1b1d", marginBottom: "6px" }}>
                                Correo electrónico
                            </label>
                            <input
                                id="email" name="email" type="email" autoComplete="email" required
                                value={formData.email} onChange={handleChange} placeholder="tu@correo.com"
                                style={{ width: "100%", padding: "12px 16px", backgroundColor: "white", border: "1px solid #c5c6cd", borderRadius: "8px", fontSize: "14px", color: "#1b1b1d", boxSizing: "border-box" }}
                            />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <label htmlFor="password" style={{ fontSize: "14px", fontWeight: "600", color: "#1b1b1d" }}>
                                    Contraseña
                                </label>
                                <Link href="/forgot-password" style={{ fontSize: "12px", color: "#44474d", textDecoration: "none" }}>
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <input
                                id="password" name="password" type="password" autoComplete="current-password" required
                                value={formData.password} onChange={handleChange} placeholder="••••••••"
                                style={{ width: "100%", padding: "12px 16px", backgroundColor: "white", border: "1px solid #c5c6cd", borderRadius: "8px", fontSize: "14px", color: "#1b1b1d", boxSizing: "border-box" }}
                            />
                        </div>

                        {error && (
                            <div style={{ backgroundColor: "#ffdad6", border: "1px solid rgba(186,26,26,0.3)", borderRadius: "8px", padding: "12px 16px" }}>
                                <p style={{ color: "#93000a", fontSize: "14px", margin: 0 }}>{error}</p>
                            </div>
                        )}

                        <button
                            type="submit" disabled={loading}
                            style={{ width: "100%", padding: "12px 16px", backgroundColor: loading ? "#44474d" : "#0d1c32", color: "white", fontWeight: "600", fontSize: "14px", borderRadius: "8px", border: "none", cursor: loading ? "not-allowed" : "pointer" }}
                        >
                            {loading ? "Ingresando..." : "Ingresar"}
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ flex: 1, height: "1px", backgroundColor: "#c5c6cd" }} />
                            <span style={{ fontSize: "12px", color: "#75777e" }}>o continúa con</span>
                            <div style={{ flex: 1, height: "1px", backgroundColor: "#c5c6cd" }} />
                        </div>

                        <button
                            type="button"
                            style={{ width: "100%", padding: "12px 16px", backgroundColor: "white", color: "#1b1b1d", fontWeight: "500", fontSize: "14px", borderRadius: "8px", border: "1px solid #c5c6cd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}
                        >
                            <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px" }} aria-hidden>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continuar con Google
                        </button>
                    </form>

                    <p style={{ textAlign: "center", fontSize: "12px", color: "#75777e", marginTop: "32px" }}>
                        Al ingresar, aceptas los{" "}
                        <Link href="/terminos" style={{ textDecoration: "underline" }}>Términos de uso</Link>{" "}
                        y la{" "}
                        <Link href="/privacidad" style={{ textDecoration: "underline" }}>Política de privacidad</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
