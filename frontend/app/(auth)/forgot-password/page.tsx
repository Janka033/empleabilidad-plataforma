"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URLS } from "../../lib/api";

const heading = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" } as const;
const NAVY = "#0d1c32";
const ORANGE = "#f97316";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API_URLS.auth}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                setError(d.message || "No se pudo procesar la solicitud");
                return;
            }
            setSent(true);
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
            <div className="w-full max-w-[28rem]">
                <Link href="/" className="block text-2xl font-bold mb-8 text-center" style={{ ...heading, color: NAVY }}>
                    Empleo<span style={{ color: ORANGE }}>Uni</span>
                </Link>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                    {sent ? (
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[30px] text-emerald-600">mark_email_read</span>
                            </div>
                            <h1 className="text-xl font-bold text-slate-900" style={heading}>Revisa tu correo</h1>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Si <strong className="text-slate-700">{email}</strong> tiene una cuenta, te enviamos un enlace para
                                restablecer tu contraseña. El enlace caduca en 1 hora.
                            </p>
                            <Link href="/login" className="mt-3 text-sm font-semibold hover:underline" style={{ color: NAVY }}>
                                Volver a iniciar sesión
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-slate-900" style={heading}>¿Olvidaste tu contraseña?</h1>
                                <p className="text-slate-500 text-sm mt-1">
                                    Ingresa tu correo y te enviaremos un enlace para crear una nueva.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email" className="text-sm font-semibold text-slate-700">Correo electrónico</label>
                                    <input id="email" name="email" type="email" autoComplete="email" required
                                           value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                           placeholder="tu@correo.com"
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
                                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando...</> : "Enviar enlace de restablecimiento"}
                                </button>
                            </form>

                            <p className="text-center text-sm text-slate-500 mt-6">
                                <Link href="/login" className="font-semibold hover:underline" style={{ color: NAVY }}>← Volver a iniciar sesión</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
