"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URLS } from "../../lib/api";

const heading = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" } as const;
const NAVY = "#0d1c32";
const ORANGE = "#f97316";

function ResetForm() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
        if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_URLS.auth}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) { setError(d.message || "No se pudo actualizar la contraseña"); return; }
            setDone(true);
            setTimeout(() => router.push("/login"), 2200);
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[30px] text-red-500">link_off</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900" style={heading}>Enlace inválido</h1>
                <p className="text-sm text-slate-500">El enlace no es válido. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”.</p>
                <Link href="/forgot-password" className="mt-2 text-sm font-semibold hover:underline" style={{ color: NAVY }}>Solicitar nuevo enlace</Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[30px] text-emerald-600">check_circle</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900" style={heading}>¡Contraseña actualizada!</h1>
                <p className="text-sm text-slate-500">Te llevamos a iniciar sesión...</p>
            </div>
        );
    }

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900" style={heading}>Crea una nueva contraseña</h1>
                <p className="text-slate-500 text-sm mt-1">Elige una contraseña segura de al menos 8 caracteres.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-sm font-semibold text-slate-700">Nueva contraseña</label>
                    <input id="password" type="password" autoComplete="new-password" required
                           value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                           placeholder="••••••••"
                           className="px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition" />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="confirm" className="text-sm font-semibold text-slate-700">Confirmar contraseña</label>
                    <input id="confirm" type="password" autoComplete="new-password" required
                           value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                           placeholder="••••••••"
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
                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</> : "Actualizar contraseña"}
                </button>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
            <div className="w-full max-w-[28rem]">
                <Link href="/" className="block text-2xl font-bold mb-8 text-center" style={{ ...heading, color: NAVY }}>
                    Empleo<span style={{ color: ORANGE }}>Uni</span>
                </Link>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>}>
                        <ResetForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
