"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_AUTH_URL}/auth/login`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Credenciales inválidas");
                return;
            }

            localStorage.setItem("token", data.token);
            router.push("/vacantes");
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Panel izquierdo — navy */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0d1c32] flex-col justify-between p-12 relative overflow-hidden">
                {/* Decoración geométrica */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="absolute top-1/2 right-8 w-32 h-32 bg-[#f97316]/10 rounded-full -translate-y-1/2" />

                {/* Logo */}
                <div className="relative z-10">
          <span className="text-white text-2xl font-bold tracking-tight">
            Empleo<span className="text-[#f97316]">Uni</span>
          </span>
                    <p className="text-[#b9c7e4] text-sm mt-1">
                        Plataforma de empleabilidad universitaria
                    </p>
                </div>

                {/* Contenido central */}
                <div className="relative z-10">
                    <h2 className="text-white text-4xl font-bold leading-tight mb-4">
                        Tu carrera
                        <br />
                        profesional
                        <br />
                        <span className="text-[#f97316]">comienza aquí.</span>
                    </h2>
                    <p className="text-[#76849f] text-base leading-relaxed max-w-sm">
                        Conectamos estudiantes universitarios colombianos con empresas que
                        buscan talento en formación. Prácticas profesionales y empleos a tu
                        medida.
                    </p>

                    {/* Stats */}
                    <div className="flex gap-8 mt-10">
                        <div>
                            <p className="text-white text-2xl font-bold">+1.200</p>
                            <p className="text-[#76849f] text-sm">Vacantes activas</p>
                        </div>
                        <div>
                            <p className="text-white text-2xl font-bold">+340</p>
                            <p className="text-[#76849f] text-sm">Empresas aliadas</p>
                        </div>
                        <div>
                            <p className="text-white text-2xl font-bold">+5k</p>
                            <p className="text-[#76849f] text-sm">Estudiantes</p>
                        </div>
                    </div>
                </div>

                {/* Footer panel */}
                <div className="relative z-10">
                    <p className="text-[#44474d] text-xs">
                        © 2025 EmpleoUni — CUE Armenia, Quindío
                    </p>
                </div>
            </div>

            {/* Panel derecho — formulario */}
            <div className="flex-1 flex flex-col justify-center items-center bg-[#fbf9fb] px-6 py-12">
                {/* Logo mobile */}
                <div className="lg:hidden mb-8 text-center">
          <span className="text-[#0d1c32] text-2xl font-bold tracking-tight">
            Empleo<span className="text-[#f97316]">Uni</span>
          </span>
                </div>

                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-[#1b1b1d] tracking-tight">
                            Iniciar sesión
                        </h1>
                        <p className="text-[#44474d] text-sm mt-1">
                            ¿No tienes cuenta?{" "}
                            <Link
                                href="/register"
                                className="text-[#0d1c32] font-semibold hover:text-[#f97316] transition-colors"
                            >
                                Regístrate gratis
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-semibold text-[#1b1b1d] mb-1.5"
                            >
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="tu@correo.com"
                                className="w-full px-4 py-3 bg-white border border-[#c5c6cd] rounded-lg text-sm text-[#1b1b1d] placeholder-[#75777e]
                           focus:outline-none focus:border-[#0d1c32] focus:ring-2 focus:ring-[#0d1c32]/10
                           transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-semibold text-[#1b1b1d]"
                                >
                                    Contraseña
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-[#44474d] hover:text-[#f97316] transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-white border border-[#c5c6cd] rounded-lg text-sm text-[#1b1b1d] placeholder-[#75777e]
                           focus:outline-none focus:border-[#0d1c32] focus:ring-2 focus:ring-[#0d1c32]/10
                           transition-all"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-lg px-4 py-3">
                                <p className="text-[#93000a] text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-[#0d1c32] text-white font-semibold text-sm rounded-lg
                         hover:bg-[#1a2f4a] active:scale-[0.98] transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-[0px_2px_4px_rgba(0,0,0,0.05)]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                  <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                  >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Ingresando...
                </span>
                            ) : (
                                "Ingresar"
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative flex items-center gap-3">
                            <div className="flex-1 h-px bg-[#c5c6cd]" />
                            <span className="text-xs text-[#75777e]">o continúa con</span>
                            <div className="flex-1 h-px bg-[#c5c6cd]" />
                        </div>

                        {/* Google OAuth (placeholder) */}
                        <button
                            type="button"
                            className="w-full py-3 px-4 bg-white text-[#1b1b1d] font-medium text-sm rounded-lg
                         border border-[#c5c6cd] hover:border-[#0d1c32] hover:bg-[#f5f3f5]
                         active:scale-[0.98] transition-all flex items-center justify-center gap-3
                         shadow-[0px_2px_4px_rgba(0,0,0,0.05)]"
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continuar con Google
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-xs text-[#75777e] mt-8">
                        Al ingresar, aceptas los{" "}
                        <Link href="/terminos" className="underline hover:text-[#1b1b1d]">
                            Términos de uso
                        </Link>{" "}
                        y la{" "}
                        <Link href="/privacidad" className="underline hover:text-[#1b1b1d]">
                            Política de privacidad
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}