"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URLS } from "../../lib/api";
import { saveSession } from "../../lib/auth";
import GoogleButton from "../../components/GoogleButton";

const heading = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" } as const;
const NAVY = "#0d1c32";
const ORANGE = "#f97316";

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
            if (!res.ok) { setError(data.message || "Credenciales inválidas"); return; }
            saveSession(data.token, data.role, data.user);
            if (data.role === "admin") router.push("/admin/dashboard");
            else if (data.role === "empresa") router.push("/empresa/dashboard");
            else router.push("/vacantes");
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Panel de marca */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
                 style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #16284a 60%, #1b3a6b 100%)` }}>
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: ORANGE, transform: "translate(40%,-40%)" }} />
                <Link href="/" className="relative text-2xl font-bold text-white" style={heading}>
                    Empleo<span style={{ color: ORANGE }}>Uni</span>
                </Link>
                <div className="relative">
                    <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={heading}>
                        Bienvenido de nuevo a<br /><span style={{ color: ORANGE }}>tu carrera.</span>
                    </h1>
                    <p className="text-slate-300 text-lg max-w-[28rem] leading-relaxed">
                        Accede a tus vacantes recomendadas, postulaciones, entrevistas y el seguimiento de tu práctica profesional.
                    </p>
                    <div className="flex gap-8 mt-10">
                        {[["Matching", "auto_awesome"], ["Prácticas", "workspace_premium"], ["Entrevistas", "event_available"]].map(([l, ic]) => (
                            <div key={l} className="flex flex-col items-center gap-2 text-slate-300">
                                <span className="material-symbols-outlined" style={{ color: ORANGE }}>{ic}</span>
                                <span className="text-xs">{l}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="relative text-xs text-slate-500">© 2026 EmpleoUni — CUE Alexander von Humboldt</p>
            </div>

            {/* Formulario */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
                <div className="w-full max-w-[28rem]">
                    <Link href="/" className="lg:hidden block text-2xl font-bold mb-8 text-center" style={{ ...heading, color: NAVY }}>
                        Empleo<span style={{ color: ORANGE }}>Uni</span>
                    </Link>
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900" style={heading}>Iniciar sesión</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            ¿No tienes cuenta?{" "}
                            <Link href="/register" className="font-semibold hover:underline" style={{ color: NAVY }}>Regístrate gratis</Link>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="email" className="text-sm font-semibold text-slate-700">Correo electrónico</label>
                            <input id="email" name="email" type="email" autoComplete="email" required
                                   value={formData.email} onChange={handleChange} placeholder="tu@correo.com"
                                   className="px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                                <label htmlFor="password" className="text-sm font-semibold text-slate-700">Contraseña</label>
                                <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-slate-800">¿La olvidaste?</Link>
                            </div>
                            <input id="password" name="password" type="password" autoComplete="current-password" required
                                   value={formData.password} onChange={handleChange} placeholder="••••••••"
                                   className="px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition" />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                                <span className="material-symbols-outlined text-[18px]">error</span>{error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                                className="w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                                style={{ backgroundColor: NAVY }}>
                            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Ingresando...</> : "Ingresar"}
                        </button>
                    </form>

                    <div className="mt-6">
                        <GoogleButton />
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-8">
                        Al ingresar, aceptas los{" "}
                        <Link href="/terminos" className="underline hover:text-slate-600">Términos</Link> y la{" "}
                        <Link href="/privacidad" className="underline hover:text-slate-600">Política de privacidad</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
