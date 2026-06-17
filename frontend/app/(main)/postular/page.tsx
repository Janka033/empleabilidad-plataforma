"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../lib/api";

const heading = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" } as const;
const NAVY = "#0d1c32";
const ORANGE = "#f97316";

interface VacanteInfo {
    id: string; titulo: string; empresa: string; modalidad: string;
    ciudad: string; salario?: string; descripcion: string; requisitos?: string[];
}

function Nav({ right }: { right?: React.ReactNode }) {
    return (
        <nav className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur flex items-center justify-between px-4 md:px-8 fixed top-0 w-full z-50">
            <a href="/vacantes" className="text-lg font-bold" style={{ ...heading, color: NAVY }}>Empleo<span style={{ color: ORANGE }}>Uni</span></a>
            {right}
        </nav>
    );
}

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Nav />
            <div className="flex-1 flex items-start justify-center px-4 pt-24 pb-12">
                <div className="w-full max-w-2xl animate-pulse flex flex-col gap-6">
                    <div className="h-8 bg-slate-200 rounded-xl w-1/3" />
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col gap-4">
                        <div className="h-6 bg-slate-200 rounded-lg w-2/3" />
                        <div className="h-40 bg-slate-100 rounded-xl" />
                        <div className="h-10 bg-slate-200 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Aviso({ color, icon, titulo, mensaje, children }: { color: string; icon: string; titulo: string; mensaje: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Nav />
            <div className="flex-1 flex items-center justify-center px-4 pt-16">
                <div className="w-full max-w-[28rem] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
                    <div className="p-8 flex flex-col items-center text-center gap-5">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
                            <span className="material-symbols-outlined text-[32px]" style={{ color }}>{icon}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900" style={heading}>{titulo}</h2>
                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">{mensaje}</p>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PantallaExito({ vacante }: { vacante: VacanteInfo }) {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Nav />
            <div className="flex-1 flex items-start justify-center px-4 pt-24 pb-12">
                <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                    <div className="p-6 md:p-10 flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[40px] text-emerald-600">check_circle</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={heading}>¡Postulación enviada!</h1>
                            <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-[36rem] mx-auto">
                                Tu perfil fue enviado a <span className="font-semibold text-slate-800">{vacante.empresa}</span>. La empresa revisará tu candidatura pronto.
                            </p>
                        </div>
                        <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 font-bold" style={{ color: NAVY, ...heading }}>
                                {vacante.empresa.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{vacante.titulo}</p>
                                <p className="text-sm text-slate-500">{vacante.empresa} · {vacante.ciudad}</p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Enviada</span>
                        </div>
                        <div className="w-full grid grid-cols-3 gap-3">
                            {[
                                { icon: "mark_email_read", label: "Enviada", desc: "En revisión", done: true },
                                { icon: "visibility", label: "Revisión", desc: "La empresa verá tu perfil", done: false },
                                { icon: "handshake", label: "Respuesta", desc: "3–7 días hábiles", done: false },
                            ].map(({ icon, label, desc, done }) => (
                                <div key={label} className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center ${done ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                                    <span className={`material-symbols-outlined text-[22px] ${done ? "text-emerald-600" : "text-slate-400"}`}>{icon}</span>
                                    <span className={`text-xs font-semibold ${done ? "text-emerald-700" : "text-slate-600"}`}>{label}</span>
                                    <span className="text-[11px] text-slate-400">{desc}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button onClick={() => router.push("/vacantes")} className="flex-1 flex items-center justify-center gap-2 py-3 px-6 text-white font-semibold rounded-xl hover:opacity-90 text-sm" style={{ backgroundColor: NAVY }}>
                                <span className="material-symbols-outlined text-[18px]">search</span>Más vacantes
                            </button>
                            <button onClick={() => router.push("/perfil")} className="flex-1 flex items-center justify-center gap-2 py-3 px-6 text-slate-700 font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 text-sm">
                                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>Mis postulaciones
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PostularPage() {
    const router = useRouter();
    const [vacante, setVacante] = useState<VacanteInfo | null>(null);
    const [ready, setReady] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [carta, setCarta] = useState("");
    const [expectativa, setExpectativa] = useState("");
    const [disponibilidad, setDisponibilidad] = useState("inmediata");
    const [bloqueado, setBloqueado] = useState(false);
    const [empresaBloq, setEmpresaBloq] = useState("");
    const [yaPostulado, setYaPostulado] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        const raw = localStorage.getItem("vacantePostular");
        if (!raw) { router.push("/vacantes"); return; }
        try { setVacante(JSON.parse(raw)); setReady(true); } catch { router.push("/vacantes"); }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!carta.trim() || !expectativa.trim()) { setError("Completa todos los campos obligatorios."); return; }
        const token = localStorage.getItem("token");
        if (!token || !vacante) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones`, {
                method: "POST", headers: authHeaders(token),
                body: JSON.stringify({ vacanteId: vacante.id, cartaMotivacion: carta, expectativaSalarial: expectativa, disponibilidad }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.contratado) { setBloqueado(true); setEmpresaBloq(data.empresa || "otra empresa"); return; }
                if (res.status === 409) { setYaPostulado(true); localStorage.removeItem("vacantePostular"); return; }
                setError(data.message || "Error al enviar la postulación."); return;
            }
            localStorage.removeItem("vacantePostular"); setShowSuccess(true);
        } catch { setError("Error de conexión. Intenta de nuevo."); }
        finally { setLoading(false); }
    };

    if (!ready) return <LoadingSkeleton />;
    if (bloqueado) return (
        <Aviso color="#f59e0b" icon="business_center" titulo="Ya tienes empresa" mensaje={<>Ya estás contratado por <strong className="text-slate-800">{empresaBloq}</strong> y no puedes postularte a más vacantes.</>}>
            <div className="flex gap-3 w-full">
                <button onClick={() => router.push("/vacantes")} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver vacantes</button>
                <button onClick={() => router.push("/perfil")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: NAVY }}>Mi perfil</button>
            </div>
        </Aviso>
    );
    if (yaPostulado) return (
        <Aviso color="#3b82f6" icon="info" titulo="Ya te postulaste" mensaje={<>Ya enviaste una postulación a <strong className="text-slate-800">{vacante?.empresa}</strong> para esta vacante. Sigue su estado desde tu perfil.</>}>
            <div className="flex gap-3 w-full">
                <button onClick={() => router.push("/vacantes")} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver vacantes</button>
                <button onClick={() => router.push("/perfil")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: NAVY }}>Mis postulaciones</button>
            </div>
        </Aviso>
    );
    if (showSuccess && vacante) return <PantallaExito vacante={vacante} />;
    if (!vacante) return <LoadingSkeleton />;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Nav right={
                <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>Volver
                </button>
            } />
            <div className="flex-1 flex items-start justify-center px-4 pt-20 pb-12">
                <div className="w-full max-w-2xl flex flex-col gap-5">
                    <div className="flex items-center gap-1.5 text-sm text-slate-400 flex-wrap">
                        <button onClick={() => router.push("/vacantes")} className="hover:text-slate-700">Vacantes</button>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-slate-600 font-medium truncate max-w-[160px]">{vacante.titulo}</span>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-slate-900 font-semibold">Postular</span>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="h-1.5 w-full" style={{ backgroundImage: `linear-gradient(to right, ${NAVY}, ${ORANGE})` }} />
                        <div className="p-5 md:p-8 flex flex-col gap-6">
                            <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-bold" style={{ color: NAVY, ...heading }}>
                                    {vacante.empresa.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-lg font-bold text-slate-900 truncate" style={heading}>{vacante.titulo}</h1>
                                    <p className="text-sm text-slate-500 truncate">{vacante.empresa} · {vacante.ciudad} · {vacante.modalidad}</p>
                                </div>
                            </div>
                            <h2 className="font-bold text-slate-800" style={heading}>Completa tu postulación</h2>
                            {error && (
                                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">error</span><p className="text-sm">{error}</p>
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Carta de motivación <span className="text-red-500">*</span></label>
                                    <textarea value={carta} onChange={(e) => setCarta(e.target.value)} required rows={6} maxLength={2000}
                                              placeholder="Cuéntale a la empresa por qué eres el candidato ideal..."
                                              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-slate-500 resize-none" />
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-slate-400">Menciona tus habilidades y por qué te interesa la empresa.</p>
                                        <span className={`text-xs font-medium ${carta.length > 1500 ? "text-amber-600" : "text-slate-400"}`}>{carta.length}/2000</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Expectativa salarial <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[16px]">payments</span>
                                            <input type="text" value={expectativa} onChange={(e) => setExpectativa(e.target.value)} required placeholder="Ej: $1.500.000"
                                                   className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-slate-500" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Disponibilidad</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[16px]">event_available</span>
                                            <select value={disponibilidad} onChange={(e) => setDisponibilidad(e.target.value)}
                                                    className="w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-slate-500 bg-white appearance-none">
                                                <option value="inmediata">Inmediata</option><option value="15 días">En 15 días</option><option value="1 mes">En 1 mes</option><option value="negociable">Negociable</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px]">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-[18px] text-blue-500 shrink-0">info</span>
                                    <p className="text-xs text-blue-700">Tu perfil académico (universidad, programa, semestre y habilidades) se adjuntará automáticamente.</p>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => router.back()} className="flex-1 py-3 px-5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                                    <button type="submit" disabled={loading || !carta.trim() || !expectativa.trim()}
                                            className="flex-[2] py-3 px-8 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90" style={{ backgroundColor: NAVY }}>
                                        {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando...</> : <><span className="material-symbols-outlined text-[16px]">send</span>Enviar postulación</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
