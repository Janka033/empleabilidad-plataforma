"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../../lib/api";

// ── Tipos ───────────────────────────────────────────────────────────────────
interface Resumen {
    vacantes: { total: number; activas: number };
    estudiantes: { total: number; contratados: number };
    tasaEmpleabilidad: number;
    postulaciones: { total: number; porEstado: { estado: string; cantidad: number }[] };
    practicas: { totalConvenios: number; finalizadas: number; notaPromedio: number | null };
}
interface PorPrograma { programa: string; estudiantes: number; contratados: number; tasa: number }
interface AnalyticsData { resumen: Resumen; porPrograma: PorPrograma[] }

const ESTADO_LABEL: Record<string, string> = {
    enviada: "Enviada", vista: "Vista", entrevista: "En proceso",
    aceptada: "Aceptada", confirmada: "Confirmada", rechazada: "Rechazada",
    rechazada_por_estudiante: "Rechazada por estudiante",
};
const ESTADO_COLOR: Record<string, string> = {
    enviada: "#9ca3af", vista: "#f59e0b", entrevista: "#3b82f6",
    aceptada: "#10b981", confirmada: "#8b5cf6", rechazada: "#ef4444",
    rechazada_por_estudiante: "#f87171",
};

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
                <span className="material-symbols-outlined text-[24px] text-white">{icon}</span>
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            const res = await fetch(`${API_URLS.analytics}/analytics/resumen`, { headers: authHeaders(token) });
            if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
            if (!res.ok) { setError("No se pudieron cargar las métricas"); return; }
            setData(await res.json());
        } catch { setError("Error de conexión con el servicio de analítica"); }
        finally { setLoading(false); }
    }, [router]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Descarga el CSV reenviando el JWT (RF16, HU17)
    const exportCsv = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setExporting(true);
        try {
            const res = await fetch(`${API_URLS.analytics}/analytics/reporte.csv`, { headers: authHeaders(token) });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "informe_empleabilidad.csv";
            a.click();
            URL.revokeObjectURL(url);
        } finally { setExporting(false); }
    };

    const handleLogout = () => {
        localStorage.clear();
        document.cookie = "token=; path=/; max-age=0";
        router.push("/login");
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc]">
            <p className="text-slate-600">{error || "Sin datos"}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">Reintentar</button>
        </div>
    );

    const { resumen, porPrograma } = data;
    const maxEstado = Math.max(1, ...resumen.postulaciones.porEstado.map((e) => e.cantidad));

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            {/* Navbar — no se imprime */}
            <nav className="print:hidden h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 md:px-8 fixed top-0 w-full z-50">
                <div className="flex items-center gap-3 md:gap-4">
                    <button onClick={() => setShowMenu((v) => !v)}
                            className="md:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-lg hover:bg-slate-100 shrink-0">
                        <span className="material-symbols-outlined text-slate-700">{showMenu ? "close" : "menu"}</span>
                    </button>
                    <span className="text-base font-bold" style={{ color: "#0d1c32" }}>Empleo<span style={{ color: "#f97316" }}>Uni</span></span>
                    <div className="hidden md:flex gap-4 text-sm font-medium">
                        <a href="/admin/dashboard" className="text-slate-900 font-semibold">Analítica</a>
                        <a href="/admin/auditoria" className="text-slate-500 hover:text-slate-900 transition-colors">Auditoría</a>
                        <a href="/admin/practicas" className="text-slate-500 hover:text-slate-900 transition-colors">Prácticas</a>
                    </div>
                </div>

                {showMenu && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg flex flex-col py-1.5">
                        <a href="/admin/dashboard" className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-slate-50"><span className="material-symbols-outlined text-[20px]" style={{ color: "#f97316" }}>analytics</span>Analítica</a>
                        <a href="/admin/auditoria" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><span className="material-symbols-outlined text-[20px] text-slate-400">fact_check</span>Auditoría</a>
                        <a href="/admin/practicas" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><span className="material-symbols-outlined text-[20px] text-slate-400">workspace_premium</span>Prácticas</a>
                    </div>
                )}
                <button onClick={handleLogout} className="text-sm font-semibold text-white px-3 md:px-4 py-2 rounded-lg hover:opacity-90 shrink-0" style={{ backgroundColor: "#0d1c32" }}>
                    <span className="hidden sm:inline">Cerrar sesión</span>
                    <span className="sm:hidden material-symbols-outlined text-[18px] align-middle">logout</span>
                </button>
            </nav>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-20 print:pt-6 pb-12 flex flex-col gap-6">

                {/* Encabezado + acciones */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analítica institucional</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Indicadores de empleabilidad y prácticas profesionales</p>
                    </div>
                    <div className="print:hidden flex gap-2">
                        <button onClick={exportCsv} disabled={exporting}
                                className="flex items-center gap-1.5 text-sm font-semibold border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-60">
                            <span className="material-symbols-outlined text-[18px]">table_view</span>
                            {exporting ? "Generando..." : "Exportar CSV"}
                        </button>
                        <button onClick={() => window.print()}
                                className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: "#0d1c32" }}>
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                            Exportar PDF
                        </button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard icon="work"          label="Vacantes activas"    value={resumen.vacantes.activas} sub={`${resumen.vacantes.total} en total`}            color="#0d1c32" />
                    <KpiCard icon="group"         label="Estudiantes"         value={resumen.estudiantes.total} sub={`${resumen.estudiantes.contratados} contratados`}  color="#6366f1" />
                    <KpiCard icon="trending_up"   label="Tasa empleabilidad"  value={`${resumen.tasaEmpleabilidad}%`}                                                  color="#f97316" />
                    <KpiCard icon="send"          label="Postulaciones"       value={resumen.postulaciones.total}                                                     color="#10b981" />
                    <KpiCard icon="handshake"     label="Convenios práctica"  value={resumen.practicas.totalConvenios} sub={`${resumen.practicas.finalizadas} finalizadas`} color="#8b5cf6" />
                    <KpiCard icon="workspace_premium" label="Prácticas finalizadas" value={resumen.practicas.finalizadas}                                            color="#0ea5e9" />
                    <KpiCard icon="grade"         label="Nota promedio práctica" value={resumen.practicas.notaPromedio ?? "—"}                                         color="#eab308" />
                    <KpiCard icon="folder_shared" label="Vacantes totales"    value={resumen.vacantes.total}                                                          color="#64748b" />
                </div>

                {/* Postulaciones por estado */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                    <h2 className="text-base font-semibold text-slate-800">Postulaciones por estado</h2>
                    {resumen.postulaciones.porEstado.length === 0 ? (
                        <p className="text-sm text-slate-400">Aún no hay postulaciones registradas.</p>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {resumen.postulaciones.porEstado.map((e) => (
                                <div key={e.estado} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-600 w-40 shrink-0 text-right">{ESTADO_LABEL[e.estado] || e.estado}</span>
                                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                        <div className="h-full rounded-full flex items-center justify-end px-2"
                                             style={{ width: `${Math.max(8, (e.cantidad / maxEstado) * 100)}%`, backgroundColor: ESTADO_COLOR[e.estado] || "#9ca3af" }}>
                                            <span className="text-[10px] font-bold text-white">{e.cantidad}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Indicadores por programa */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                    <h2 className="text-base font-semibold text-slate-800">Empleabilidad por programa</h2>
                    {porPrograma.length === 0 ? (
                        <p className="text-sm text-slate-400">Sin datos por programa.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-slate-200">
                                        <th className="py-2 font-medium">Programa</th>
                                        <th className="py-2 font-medium text-center">Estudiantes</th>
                                        <th className="py-2 font-medium text-center">Contratados</th>
                                        <th className="py-2 font-medium w-40">Tasa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {porPrograma.map((p) => (
                                        <tr key={p.programa} className="border-b border-slate-100">
                                            <td className="py-2.5 text-slate-800 font-medium">{p.programa}</td>
                                            <td className="py-2.5 text-center text-slate-700">{p.estudiantes}</td>
                                            <td className="py-2.5 text-center text-slate-700">{p.contratados}</td>
                                            <td className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${p.tasa}%`, backgroundColor: "#f97316" }} />
                                                    </div>
                                                    <span className="text-xs text-slate-600 w-10 text-right">{p.tasa}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="text-xs text-slate-400 text-center mt-2">
                    Informe generado el {new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })} · EmpleoUni · ISO/IEC 25010
                </p>
            </main>
        </div>
    );
}
