"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../../lib/api";

interface AuditLog {
    _id: string;
    servicio: string;
    accion: string;
    entidad?: string;
    entidad_id?: string;
    detalle?: string;
    usuario_email?: string;
    usuario_rol?: string;
    usuario_id?: string;
    ip?: string;
    created_at: string;
}

const SERVICIOS = ["", "auth", "vacantes", "perfiles", "practicas"];

const SERVICIO_COLOR: Record<string, string> = {
    auth:      "bg-indigo-50 text-indigo-700",
    vacantes:  "bg-amber-50 text-amber-700",
    perfiles:  "bg-emerald-50 text-emerald-700",
    practicas: "bg-purple-50 text-purple-700",
};

const ACCION_LABEL: Record<string, string> = {
    registro: "Registro", login: "Inicio de sesión", crear_vacante: "Crear vacante",
    confirmar_practica: "Confirmar práctica", crear_convenio: "Crear convenio",
    evaluacion_parcial: "Evaluación parcial", evaluacion_final: "Evaluación final",
};

export default function AuditoriaPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [servicio, setServicio] = useState("");
    const [page, setPage] = useState(1);
    const [showMenu, setShowMenu] = useState(false);
    const limit = 25;

    const fetchLogs = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
            if (servicio) params.append("servicio", servicio);
            const res = await fetch(`${API_URLS.audit}/audit?${params}`, { headers: authHeaders(token) });
            if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
            if (!res.ok) { setError("No se pudieron cargar los registros"); return; }
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
        } catch { setError("Error de conexión con el servicio de auditoría"); }
        finally { setLoading(false); }
    }, [router, servicio, page]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleLogout = () => {
        localStorage.clear();
        document.cookie = "token=; path=/; max-age=0";
        router.push("/login");
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            {/* Navbar */}
            <nav className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 md:px-8 fixed top-0 w-full z-50">
                <div className="flex items-center gap-3 md:gap-4">
                    <button onClick={() => setShowMenu((v) => !v)}
                            className="md:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-lg hover:bg-slate-100 shrink-0">
                        <span className="material-symbols-outlined text-slate-700">{showMenu ? "close" : "menu"}</span>
                    </button>
                    <span className="text-base font-bold" style={{ color: "#0d1c32" }}>Empleo<span style={{ color: "#f97316" }}>Uni</span></span>
                    <div className="hidden md:flex gap-4 text-sm font-medium">
                        <a href="/admin/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">Analítica</a>
                        <a href="/admin/auditoria" className="text-slate-900 font-semibold">Auditoría</a>
                        <a href="/admin/practicas" className="text-slate-500 hover:text-slate-900 transition-colors">Prácticas</a>
                    </div>
                </div>

                {showMenu && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg flex flex-col py-1.5">
                        <a href="/admin/dashboard" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><span className="material-symbols-outlined text-[20px] text-slate-400">analytics</span>Analítica</a>
                        <a href="/admin/auditoria" className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-slate-50"><span className="material-symbols-outlined text-[20px]" style={{ color: "#f97316" }}>fact_check</span>Auditoría</a>
                        <a href="/admin/practicas" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><span className="material-symbols-outlined text-[20px] text-slate-400">workspace_premium</span>Prácticas</a>
                    </div>
                )}
                <button onClick={handleLogout} className="text-sm font-semibold text-white px-3 md:px-4 py-2 rounded-lg hover:opacity-90 shrink-0" style={{ backgroundColor: "#0d1c32" }}>
                    <span className="hidden sm:inline">Cerrar sesión</span>
                    <span className="sm:hidden material-symbols-outlined text-[18px] align-middle">logout</span>
                </button>
            </nav>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-20 pb-12 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Auditoría del sistema</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Registro de acciones críticas (quién, cuándo, qué)</p>
                    </div>
                    {/* Filtro por servicio */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-500">Servicio:</label>
                        <select
                            value={servicio}
                            onChange={(e) => { setServicio(e.target.value); setPage(1); }}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-500"
                        >
                            {SERVICIOS.map((s) => <option key={s} value={s}>{s === "" ? "Todos" : s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="py-16 flex flex-col items-center gap-3">
                            <p className="text-slate-600 text-sm">{error}</p>
                            <button onClick={fetchLogs} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">Reintentar</button>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
                            <span className="material-symbols-outlined text-[40px]">history</span>
                            <p className="text-sm">No hay registros de auditoría todavía.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4 font-medium">Fecha</th>
                                        <th className="py-3 px-4 font-medium">Servicio</th>
                                        <th className="py-3 px-4 font-medium">Acción</th>
                                        <th className="py-3 px-4 font-medium">Detalle</th>
                                        <th className="py-3 px-4 font-medium">Usuario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((l) => (
                                        <tr key={l._id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                                {new Date(l.created_at).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SERVICIO_COLOR[l.servicio] || "bg-slate-100 text-slate-600"}`}>{l.servicio}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">{ACCION_LABEL[l.accion] || l.accion}</td>
                                            <td className="py-3 px-4 text-slate-600 max-w-[20rem]">{l.detalle || "—"}</td>
                                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                                {l.usuario_email || l.usuario_id?.slice(0, 8) || "—"}
                                                {l.usuario_rol && <span className="ml-1 text-[10px] text-slate-400">({l.usuario_rol})</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 text-sm">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50">Anterior</button>
                        <span className="text-slate-500">{page} / {totalPages} · {total} eventos</span>
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50">Siguiente</button>
                    </div>
                )}
            </main>
        </div>
    );
}
