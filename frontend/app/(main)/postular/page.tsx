"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../lib/api";

interface VacanteInfo {
    id: string; titulo: string; empresa: string;
    modalidad: string; ciudad: string; salario?: string;
    descripcion: string; requisitos?: string[];
}

export default function PostularPage() {
    const router = useRouter();
    const [vacante,        setVacante]        = useState<VacanteInfo | null>(null);
    const [showSuccess,    setShowSuccess]    = useState(false);
    const [loading,        setLoading]        = useState(false);
    const [error,          setError]          = useState<string | null>(null);
    const [carta,          setCarta]          = useState("");
    const [expectativa,    setExpectativa]    = useState("");
    const [disponibilidad, setDisponibilidad] = useState("inmediata");
    // Bloqueo por contratado
    const [bloqueado,      setBloqueado]      = useState(false);
    const [empresaBloq,    setEmpresaBloq]    = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        const raw = localStorage.getItem("vacantePostular");
        if (!raw) { router.push("/vacantes"); return; }
        try { setVacante(JSON.parse(raw)); } catch { router.push("/vacantes"); }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!carta.trim() || !expectativa.trim()) { setError("Completa todos los campos."); return; }
        const token = localStorage.getItem("token");
        if (!token || !vacante) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones`, {
                method: "POST",
                headers: authHeaders(token),
                body: JSON.stringify({
                    vacanteId: vacante.id, cartaMotivacion: carta,
                    expectativaSalarial: expectativa, disponibilidad,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                // Detectar error de contratado
                if (data.contratado) {
                    setBloqueado(true);
                    setEmpresaBloq(data.empresa || "otra empresa");
                    return;
                }
                setError(data.message || "Error al enviar la postulación.");
                return;
            }
            localStorage.removeItem("vacantePostular");
            setShowSuccess(true);
        } catch { setError("Error de conexión."); }
        finally { setLoading(false); }
    };

    // ── PANTALLA: ya tiene empresa ────────────────────────────────────────────
    if (bloqueado) {
        return (
            <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
                <nav className="h-14 border-b border-gray-200 bg-white flex items-center px-8">
                    <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
                </nav>
                <div className="flex-1 flex items-center justify-center px-4 py-12">
                    <div className="w-full max-w-md bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                        <div className="h-2 w-full bg-amber-400" />
                        <div className="p-8 flex flex-col items-center text-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[32px] text-amber-500">business_center</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Ya tienes empresa</h2>
                                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                                    Este practicante ya está contratado por <strong className="text-gray-800">{empresaBloq}</strong> y no puede postularse a más vacantes.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => router.push("/vacantes")}
                                        className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                    Ver vacantes
                                </button>
                                <button onClick={() => router.push("/perfil")}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                                        style={{ backgroundColor: "#0d1c32" }}>
                                    Mi perfil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── PÁGINA DE ÉXITO ───────────────────────────────────────────────────────
    if (showSuccess) {
        return (
            <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
                <nav className="h-14 border-b border-gray-200 bg-white flex items-center px-8">
                    <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
                </nav>
                <div className="flex-1 flex items-center justify-center px-4 py-12">
                    <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="h-2 w-full bg-gradient-to-r from-green-400 to-emerald-500" />
                        <div className="p-10 flex flex-col items-center text-center gap-8">
                            <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[40px] text-green-600">check_circle</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">¡Postulación enviada!</h1>
                                <p className="text-gray-500 text-base leading-relaxed max-w-xl mx-auto">
                                    Tu perfil fue enviado exitosamente a{" "}
                                    <span className="font-semibold text-gray-800">{vacante?.empresa}</span>.
                                    La empresa recibirá una notificación y revisará tu candidatura.
                                </p>
                            </div>
                            <div className="w-full rounded-xl bg-gray-50 border border-gray-200 p-5 flex items-center gap-4 text-left">
                                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="text-xl font-bold text-gray-700">{vacante?.empresa?.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{vacante?.titulo}</p>
                                    <p className="text-sm text-gray-500">{vacante?.empresa} · {vacante?.ciudad}</p>
                                </div>
                                <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Enviada</span>
                            </div>
                            <div className="w-full grid grid-cols-3 gap-4">
                                {[
                                    { icon: "mark_email_read", label: "Postulación enviada",  desc: "Tu perfil está en revisión",  done: true  },
                                    { icon: "visibility",       label: "Revisión de empresa", desc: "La empresa verá tu perfil",   done: false },
                                    { icon: "handshake",        label: "Respuesta",            desc: "En 3–7 días hábiles",         done: false },
                                ].map(({ icon, label, desc, done }) => (
                                    <div key={label} className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${done ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                                        <span className={`material-symbols-outlined text-[24px] ${done ? "text-emerald-600" : "text-gray-400"}`}>{icon}</span>
                                        <span className={`text-xs font-semibold text-center ${done ? "text-emerald-700" : "text-gray-600"}`}>{label}</span>
                                        <span className="text-xs text-gray-400 text-center">{desc}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full">
                                <button onClick={() => router.push("/vacantes")}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 text-sm">
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                    Ver más vacantes
                                </button>
                                <button onClick={() => router.push("/perfil")}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-white text-gray-700 font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 text-sm">
                                    <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                                    Mis postulaciones
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!vacante) return null;

    // ── FORMULARIO ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col pt-14">
            <nav className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-8 fixed top-0 w-full z-50">
                <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
                    Empleo<span style={{ color: "#f97316" }}>Uni</span>
                </span>
                <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span> Volver
                </button>
            </nav>

            <div className="flex-1 flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="h-2 w-full" style={{ backgroundImage: "linear-gradient(to right, #0d1c32, #f97316)" }} />
                    <div className="p-8 flex flex-col gap-7">
                        <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                <span className="text-xl font-bold text-gray-700">{vacante.empresa.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">{vacante.titulo}</h1>
                                <p className="text-sm text-gray-500">{vacante.empresa} · {vacante.ciudad}</p>
                            </div>
                        </div>

                        <h2 className="text-base font-semibold text-gray-800">Completa tu postulación</h2>

                        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-gray-700">
                                    Carta de motivación <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={carta} onChange={(e) => setCarta(e.target.value)} required rows={5}
                                    placeholder="Cuéntale a la empresa por qué eres el candidato ideal..."
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500 resize-none"
                                />
                                <p className="text-xs text-gray-400">{carta.length}/1000 caracteres recomendados</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Expectativa salarial <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text" value={expectativa} onChange={(e) => setExpectativa(e.target.value)} required
                                        placeholder="Ej: $1.500.000"
                                        className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Disponibilidad</label>
                                    <select value={disponibilidad} onChange={(e) => setDisponibilidad(e.target.value)}
                                            className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-gray-500 bg-white">
                                        <option value="inmediata">Inmediata</option>
                                        <option value="15 días">En 15 días</option>
                                        <option value="1 mes">En 1 mes</option>
                                        <option value="negociable">Negociable</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => router.back()}
                                        className="flex-1 py-3 px-5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading}
                                        className="flex-2 py-3 px-8 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                        style={{ backgroundColor: "#0d1c32", flex: 2 }}>
                                    {loading
                                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                                        : <><span className="material-symbols-outlined text-[16px]">send</span> Enviar postulación</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}