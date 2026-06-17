"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_URLS, authHeaders, parseApiError } from "../../../lib/api";

const heading = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" } as const;
const NAVY = "#0d1c32";
const ORANGE = "#f97316";

interface Vacante {
    id: string; titulo: string; empresa: string; descripcion: string;
    modalidad: string; tipo: string; ciudad: string; area: string;
    salario?: string; requisitos?: string[]; activa: boolean; created_at?: string;
}
interface Compatibilidad {
    score: number; nivel: "Alta" | "Media" | "Baja"; motivos: string[];
    desglose: { habilidades: number; area: number; tipo: number };
}

function getRolFromToken(token: string): string | null {
    try { return JSON.parse(atob(token.split(".")[1])).rol ?? null; } catch { return null; }
}
function nivelColor(nivel: string): string {
    return { Alta: "bg-emerald-100 text-emerald-700", Media: "bg-amber-100 text-amber-700", Baja: "bg-red-100 text-red-700" }[nivel] ?? "bg-slate-100 text-slate-600";
}
const MODALIDAD_COLOR: Record<string, string> = {
    Remoto: "bg-indigo-100 text-indigo-700", Híbrido: "bg-emerald-100 text-emerald-700", Presencial: "bg-amber-100 text-amber-700",
};

export default function VacanteDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [vacante, setVacante] = useState<Vacante | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rol, setRol] = useState<string | null>(null);
    const [compat, setCompat] = useState<Compatibilidad | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        const userRol = getRolFromToken(token);
        setRol(userRol);
        (async () => {
            try {
                const res = await fetch(`${API_URLS.vacantes}/vacantes/${id}`, { headers: authHeaders(token) });
                if (!res.ok) throw new Error(await parseApiError(res, "Vacante no encontrada"));
                setVacante(await res.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error de conexión");
            } finally { setLoading(false); }
        })();
        if (userRol !== "empresa") {
            (async () => {
                try {
                    const res = await fetch(`${API_URLS.matching}/matching/compatibilidad/${id}`, { headers: authHeaders(token) });
                    if (res.ok) setCompat(await res.json());
                } catch { /* silencioso */ }
            })();
        }
    }, [id, router]);

    const handlePostular = () => {
        if (!vacante) return;
        localStorage.setItem("vacantePostular", JSON.stringify({
            id: vacante.id, titulo: vacante.titulo, empresa: vacante.empresa, modalidad: vacante.modalidad,
            ciudad: vacante.ciudad, salario: vacante.salario || "No especificado", descripcion: vacante.descripcion, requisitos: vacante.requisitos || [],
        }));
        router.push("/postular");
    };

    const formatSalary = (s?: string) => {
        if (!s) return "No especificado";
        if (/[a-zA-Z$\-]/.test(s)) return s;
        const n = parseInt(s.replace(/[^0-9]/g, ""));
        return isNaN(n) || n === 0 ? "No especificado" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
    };

    const logout = () => { localStorage.removeItem("token"); document.cookie = "token=; path=/; max-age=0"; router.push("/login"); };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: NAVY, borderTopColor: "transparent" }} />
        </div>
    );
    if (error || !vacante) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
            <span className="material-symbols-outlined text-[48px] text-slate-300">error_outline</span>
            <p className="text-slate-500 text-sm">{error ?? "Vacante no encontrada"}</p>
            <button onClick={() => router.back()} className="px-4 py-2 text-white rounded-lg text-sm font-semibold" style={{ backgroundColor: NAVY }}>Volver</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <a href="/vacantes" className="text-lg font-bold" style={{ ...heading, color: NAVY }}>Empleo<span style={{ color: ORANGE }}>Uni</span></a>
                        <div className="hidden sm:flex gap-5 text-sm font-medium">
                            <a href="/vacantes" className="text-slate-500 hover:text-slate-900">Vacantes</a>
                            <a href="/perfil" className="text-slate-500 hover:text-slate-900">Mi Perfil</a>
                        </div>
                    </div>
                    <button onClick={logout} className="text-sm font-semibold text-white px-3 md:px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: NAVY }}>
                        <span className="hidden sm:inline">Cerrar sesión</span>
                        <span className="sm:hidden material-symbols-outlined text-[18px] align-middle">logout</span>
                    </button>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 pt-20 pb-10 flex flex-col gap-5">
                <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-300 px-3 py-1.5 rounded-full hover:bg-white w-fit">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>Volver
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                    {/* Detalle */}
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 font-bold text-xl" style={{ backgroundColor: "#eef2f7", color: NAVY, ...heading }}>
                                    {vacante.empresa.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-400">{vacante.empresa}</p>
                                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight" style={heading}>{vacante.titulo}</h1>
                                </div>
                                <span className={`hidden sm:flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${vacante.activa ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />{vacante.activa ? "Activa" : "Cerrada"}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={`${MODALIDAD_COLOR[vacante.modalidad] ?? "bg-slate-100 text-slate-600"} text-xs font-medium px-2.5 py-1 rounded-full`}>{vacante.modalidad}</span>
                                {[["work", vacante.tipo], ["location_on", vacante.ciudad], ["category", vacante.area]].map(([ic, v]) => (
                                    <span key={v} className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">{ic}</span>{v}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col gap-2">
                            <h2 className="font-bold text-slate-900 flex items-center gap-2" style={heading}><span className="material-symbols-outlined text-[20px]" style={{ color: ORANGE }}>description</span>Descripción</h2>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{vacante.descripcion}</p>
                        </div>

                        {vacante.requisitos && vacante.requisitos.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col gap-2">
                                <h2 className="font-bold text-slate-900 flex items-center gap-2" style={heading}><span className="material-symbols-outlined text-[20px]" style={{ color: ORANGE }}>checklist</span>Requisitos</h2>
                                <ul className="flex flex-col gap-2 mt-1">
                                    {vacante.requisitos.map((req, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                            <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0 text-emerald-600">check_circle</span>{req}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Lateral */}
                    <div className="lg:sticky lg:top-20 flex flex-col gap-4">
                        {rol !== "empresa" && compat && (
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                                <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm" style={heading}><span className="material-symbols-outlined text-[18px]" style={{ color: ORANGE }}>auto_awesome</span>Compatibilidad</h2>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 shrink-0">
                                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                            <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                                            <circle cx="40" cy="40" r="34" fill="none" stroke={ORANGE} strokeWidth="8" strokeLinecap="round"
                                                    strokeDasharray={`${2 * Math.PI * 34 * (compat.score / 100)} ${2 * Math.PI * 34}`} />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center font-bold text-slate-900" style={heading}>{compat.score}%</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className={`${nivelColor(compat.nivel)} text-xs font-semibold px-2.5 py-1 rounded-full w-fit`}>Compatibilidad {compat.nivel}</span>
                                        <div className="flex flex-col gap-0.5 mt-1 text-xs text-slate-500">
                                            <span>Habilidades: {compat.desglose.habilidades}/60</span>
                                            <span>Área: {compat.desglose.area}/25</span>
                                            <span>Tipo: {compat.desglose.tipo}/15</span>
                                        </div>
                                    </div>
                                </div>
                                <ul className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                                    {compat.motivos.map((m, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                                            <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0" style={{ color: ORANGE }}>check_circle</span>{m}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400">Salario mensual</span>
                                <span className="text-xl font-bold" style={{ ...heading, color: NAVY }}>{formatSalary(vacante.salario)}</span>
                            </div>
                            <div className="h-px bg-slate-100" />
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {[["work", "Modalidad", vacante.modalidad], ["schedule", "Tipo", vacante.tipo], ["location_on", "Ciudad", vacante.ciudad], ["category", "Área", vacante.area]].map(([ic, l, v]) => (
                                    <div key={l} className="flex flex-col gap-0.5">
                                        <span className="text-xs text-slate-400 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">{ic}</span>{l}</span>
                                        <span className="text-sm text-slate-700 font-medium">{v}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="h-px bg-slate-100" />
                            {rol !== "empresa" ? (
                                vacante.activa ? (
                                    <>
                                        <button onClick={handlePostular} className="w-full font-semibold text-sm py-3 rounded-xl text-white hover:opacity-90 shadow-sm flex items-center justify-center gap-2" style={{ backgroundColor: NAVY }}>
                                            <span className="material-symbols-outlined text-[18px]">send</span>Postularme
                                        </button>
                                        <p className="text-center text-xs text-slate-400">Tu perfil académico se adjuntará automáticamente</p>
                                    </>
                                ) : (
                                    <div className="w-full text-center py-3 rounded-xl bg-slate-100 text-slate-500 text-sm font-medium">Vacante cerrada</div>
                                )
                            ) : (
                                <p className="text-center text-xs text-slate-500 py-2">Vista previa de la vacante</p>
                            )}
                        </div>
                        {vacante.created_at && (
                            <p className="text-center text-xs text-slate-400">Publicada el {new Date(vacante.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
