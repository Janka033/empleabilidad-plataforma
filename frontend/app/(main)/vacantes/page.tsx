"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders, parseApiError } from "../../lib/api";

const heading = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" } as const;
const NAVY = "#0d1c32";
const ORANGE = "#f97316";

interface Vacante {
    id: string; titulo: string; empresa: string; descripcion: string;
    modalidad: string; tipo: string; ciudad: string; area: string;
    salario?: string; requisitos?: string[]; activa: boolean;
}
interface VacantesResponse { vacantes: Vacante[]; total: number; }
interface Recomendacion { vacante: Vacante; score: number; nivel: "Alta" | "Media" | "Baja"; motivos: string[]; }
interface RecomendacionesResponse { recomendaciones: Recomendacion[]; total: number; }

function nivelColor(nivel: string): string {
    return { Alta: "bg-emerald-100 text-emerald-700", Media: "bg-amber-100 text-amber-700", Baja: "bg-red-100 text-red-700" }[nivel] ?? "bg-slate-100 text-slate-600";
}
function getRolFromToken(token: string): string | null {
    try { return JSON.parse(atob(token.split(".")[1])).rol ?? null; } catch { return null; }
}

export default function VacantesPage() {
    const router = useRouter();
    const routerRef = useRef(router);
    routerRef.current = router;

    const [vacantes, setVacantes] = useState<Vacante[]>([]);
    const [total, setTotal] = useState(0);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [recomendadas, setRecomendadas] = useState<Recomendacion[]>([]);
    const [scoreMap, setScoreMap] = useState<Record<string, Recomendacion>>({});

    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [modalidad, setModalidad] = useState("");
    const [programa, setPrograma] = useState("");
    const [salarioMinimo, setSalarioMinimo] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [showFiltros, setShowFiltros] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const limit = 6;

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setCurrentPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { routerRef.current.push("/login"); return; }
        if (getRolFromToken(token) === "empresa") routerRef.current.push("/empresa/dashboard");
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || getRolFromToken(token) === "empresa") return;
        (async () => {
            try {
                const res = await fetch(`${API_URLS.matching}/matching/recomendaciones?limit=50`, { headers: authHeaders(token) });
                if (!res.ok) return;
                const data: RecomendacionesResponse = await res.json();
                setRecomendadas(data.recomendaciones.filter((r) => r.score >= 40).slice(0, 4));
                const map: Record<string, Recomendacion> = {};
                for (const r of data.recomendaciones) map[r.vacante.id] = r;
                setScoreMap(map);
            } catch { /* matching complementario */ }
        })();
    }, []);

    const fetchVacantes = useCallback(async (signal?: AbortSignal) => {
        const token = localStorage.getItem("token");
        if (!token) { routerRef.current.push("/login"); return; }
        setError(null);
        const params = new URLSearchParams();
        params.append("limit", limit.toString());
        params.append("offset", ((currentPage - 1) * limit).toString());
        if (modalidad) params.append("modalidad", modalidad);
        if (programa) params.append("area", programa);
        if (searchTerm.trim()) params.append("q", searchTerm.trim());
        if (salarioMinimo > 0) params.append("salarioMin", salarioMinimo.toString());
        try {
            const res = await fetch(`${API_URLS.vacantes}/vacantes/buscar?${params.toString()}`, { headers: authHeaders(token), signal });
            if (signal?.aborted) return;
            if (!res.ok) {
                if (res.status === 401) { localStorage.removeItem("token"); routerRef.current.push("/login"); return; }
                throw new Error(await parseApiError(res, "Error al cargar vacantes"));
            }
            const data: VacantesResponse = await res.json();
            if (signal?.aborted) return;
            setVacantes(data.vacantes); setTotal(data.total);
        } catch (err: unknown) {
            if ((err as Error).name === "AbortError") return;
            setError(err instanceof Error ? err.message : "Error de conexión");
        } finally {
            if (!signal?.aborted) { setInitialLoading(false); setRefreshing(false); }
        }
    }, [modalidad, programa, salarioMinimo, searchTerm, currentPage]);

    useEffect(() => {
        const controller = new AbortController();
        if (vacantes.length === 0 && initialLoading) setInitialLoading(true);
        else setRefreshing(true);
        fetchVacantes(controller.signal);
        return () => controller.abort();
    }, [fetchVacantes]);

    const handleLimpiarFiltros = () => {
        setModalidad(""); setPrograma(""); setSalarioMinimo(0);
        setSearchInput(""); setSearchTerm(""); setCurrentPage(1);
    };

    const formatSalary = (salario?: string) => {
        if (!salario) return "No especificado";
        if (/[a-zA-Z$\-]/.test(salario)) return salario;
        const num = parseInt(salario.replace(/[^0-9]/g, ""));
        if (isNaN(num) || num === 0) return "No especificado";
        return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(num);
    };
    const getModalidadColor = (m: string) => ({
        Remoto: "bg-indigo-100 text-indigo-700", Híbrido: "bg-emerald-100 text-emerald-700", Presencial: "bg-amber-100 text-amber-700",
    }[m] ?? "bg-slate-100 text-slate-600");

    const totalPages = Math.ceil(total / limit);
    const logout = () => { localStorage.removeItem("token"); document.cookie = "token=; path=/; max-age=0"; router.push("/login"); };

    if (initialLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: NAVY, borderTopColor: "transparent" }} />
                <p className="text-slate-500 text-sm">Cargando vacantes...</p>
            </div>
        </div>
    );

    // ── Panel de filtros (reutilizado en escritorio y móvil) ──
    const filtros = (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="font-bold text-slate-900" style={heading}>Filtros</h2>
                <span className="material-symbols-outlined text-slate-400 text-[20px]">filter_list</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Modalidad</label>
                <select value={modalidad} onChange={(e) => { setModalidad(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-500">
                    <option value="">Todas las modalidades</option>
                    <option>Presencial</option><option>Remoto</option><option>Híbrido</option>
                </select>
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Área</label>
                <select value={programa} onChange={(e) => { setPrograma(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-500">
                    <option value="">Todas las áreas</option>
                    <option value="Tecnología">Tecnología</option><option value="Administración">Administración</option>
                    <option value="Diseño">Diseño</option><option value="Derecho">Derecho</option>
                </select>
            </div>
            <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-200">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-500">Salario mínimo</label>
                    <span className="text-xs font-semibold" style={{ color: ORANGE }}>
                        {salarioMinimo > 0 ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(salarioMinimo) : "Sin mínimo"}
                    </span>
                </div>
                <input type="range" min="0" max="5000000" step="100000" value={salarioMinimo}
                       onChange={(e) => { setSalarioMinimo(parseInt(e.target.value)); setCurrentPage(1); }}
                       className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200" style={{ accentColor: ORANGE }} />
                <div className="flex justify-between text-[11px] text-slate-400"><span>$0</span><span>$5M+</span></div>
            </div>
            <button onClick={handleLimpiarFiltros} className="w-full text-sm font-semibold rounded-lg py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
                Limpiar filtros
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                        <button onClick={() => setShowMobileMenu((v) => !v)}
                                className="sm:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-lg hover:bg-slate-100 shrink-0">
                            <span className="material-symbols-outlined text-slate-700">{showMobileMenu ? "close" : "menu"}</span>
                        </button>
                        <span className="text-lg font-bold shrink-0" style={{ ...heading, color: NAVY }}>Empleo<span style={{ color: ORANGE }}>Uni</span></span>
                        <div className="hidden sm:flex gap-5 text-sm font-medium">
                            <a href="/vacantes" className="font-semibold border-b-2 pb-1" style={{ color: NAVY, borderColor: ORANGE }}>Vacantes</a>
                            <a href="/perfil" className="text-slate-500 hover:text-slate-900 transition-colors">Mi Perfil</a>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={logout} className="text-sm font-semibold text-white px-3 md:px-4 py-2 rounded-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: NAVY }}>
                            <span className="hidden sm:inline">Cerrar sesión</span>
                            <span className="sm:hidden material-symbols-outlined text-[18px] align-middle">logout</span>
                        </button>
                    </div>
                </div>

                {/* Menú móvil desplegable */}
                {showMobileMenu && (
                    <div className="sm:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg flex flex-col py-1.5">
                        <a href="/vacantes" className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-slate-50">
                            <span className="material-symbols-outlined text-[20px]" style={{ color: ORANGE }}>work</span>Vacantes
                        </a>
                        <a href="/perfil" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                            <span className="material-symbols-outlined text-[20px] text-slate-400">person</span>Mi Perfil
                        </a>
                    </div>
                )}
            </nav>

            {/* Hero + buscador */}
            <section className="pt-16 px-4 md:px-8" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #16284a 100%)` }}>
                <div className="max-w-6xl mx-auto py-10 md:py-14 flex flex-col items-center text-center gap-5">
                    <h1 className="text-2xl md:text-4xl font-bold text-white max-w-2xl leading-tight" style={heading}>
                        Encuentra tu práctica profesional ideal
                    </h1>
                    <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-xl">
                        <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:border-slate-400 px-3">
                            <span className="material-symbols-outlined text-slate-400 mr-2">search</span>
                            <input className="w-full bg-transparent border-none outline-none text-sm text-slate-800 py-3" placeholder="Cargo, empresa o palabra clave..."
                                   value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                            {refreshing && <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0 ml-2" style={{ borderColor: ORANGE, borderTopColor: "transparent" }} />}
                        </div>
                        <button onClick={() => { setSearchTerm(searchInput); setCurrentPage(1); }}
                                className="text-white text-sm font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition-opacity" style={{ backgroundColor: ORANGE }}>
                            Buscar
                        </button>
                    </div>
                </div>
            </section>

            {/* Contenido */}
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row gap-6">
                {/* Toggle filtros móvil */}
                <button onClick={() => setShowFiltros((v) => !v)}
                        className="md:hidden flex items-center justify-center gap-2 text-sm font-semibold border border-slate-300 rounded-xl py-2.5 text-slate-700 bg-white">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    {showFiltros ? "Ocultar filtros" : "Mostrar filtros"}
                </button>

                {/* Filtros móvil (colapsable) */}
                {showFiltros && (
                    <div className="md:hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">{filtros}</div>
                )}

                {/* Sidebar filtros escritorio */}
                <aside className="hidden md:block w-72 shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-20">{filtros}</div>
                </aside>

                {/* Grid */}
                <div className="flex-1 flex flex-col gap-5 min-w-0">
                    {/* Recomendadas */}
                    {recomendadas.length > 0 && (
                        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined" style={{ color: ORANGE }}>auto_awesome</span>
                                <h2 className="font-bold text-slate-900" style={heading}>Recomendadas para ti</h2>
                            </div>
                            <p className="text-xs text-slate-500 -mt-1">Ordenadas por compatibilidad con tu perfil</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {recomendadas.map((rec) => (
                                    <div key={rec.vacante.id} onClick={() => router.push(`/vacantes/${rec.vacante.id}`)}
                                         className="border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-400 hover:shadow-sm transition-all flex flex-col gap-1.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-slate-900 truncate">{rec.vacante.titulo}</p>
                                                <p className="text-xs text-slate-400 truncate">{rec.vacante.empresa}</p>
                                            </div>
                                            <span className={`${nivelColor(rec.nivel)} text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap shrink-0`}>{rec.score}%</span>
                                        </div>
                                        {rec.motivos[0] && <p className="text-xs text-slate-500 line-clamp-2">{rec.motivos[0]}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <p className="text-sm text-slate-500">{refreshing ? "Buscando..." : `${total} vacante${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`}</p>
                    {error && <p className="text-red-600 text-sm border border-red-200 bg-red-50 rounded-lg p-3">{error}</p>}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {vacantes.length === 0 && !refreshing ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                                <span className="material-symbols-outlined text-[48px]">search_off</span>
                                <p className="text-sm">No se encontraron vacantes con esos filtros.</p>
                                <button onClick={handleLimpiarFiltros} className="text-sm font-semibold hover:underline" style={{ color: ORANGE }}>Limpiar filtros</button>
                            </div>
                        ) : (
                            vacantes.map((vac) => {
                                const sc = scoreMap[vac.id];
                                return (
                                    <div key={vac.id} onClick={() => router.push(`/vacantes/${vac.id}`)}
                                         className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col gap-3 relative">
                                        {sc && (
                                            <span title={sc.motivos[0]} className={`${nivelColor(sc.nivel)} absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1`}>
                                                <span className="material-symbols-outlined text-[13px]">auto_awesome</span>{sc.score}%
                                            </span>
                                        )}
                                        <div className="flex gap-3 items-start pr-12">
                                            <div className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 font-bold" style={{ backgroundColor: "#eef2f7", color: NAVY, ...heading }}>
                                                {vac.empresa.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-400 truncate">{vac.empresa}</p>
                                                <h3 className="font-bold text-slate-900 leading-tight truncate" style={heading}>{vac.titulo}</h3>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{vac.descripcion}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className={`${getModalidadColor(vac.modalidad)} text-xs font-medium px-2 py-1 rounded-md`}>{vac.modalidad}</span>
                                            <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">location_on</span>{vac.ciudad}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100">
                                            <span className="text-sm font-bold text-slate-900">{formatSalary(vac.salario)}<span className="text-xs text-slate-400 font-normal"> / mes</span></span>
                                            <span className="text-xs font-semibold flex items-center gap-1" style={{ color: ORANGE }}>Ver detalle<span className="material-symbols-outlined text-[15px]">arrow_forward</span></span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-2 text-sm flex-wrap">
                            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50">
                                <span className="material-symbols-outlined text-[16px]">chevron_left</span>Anterior
                            </button>
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let p: number;
                                    if (totalPages <= 5) p = i + 1;
                                    else if (currentPage <= 3) p = i + 1;
                                    else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                                    else p = currentPage - 2 + i;
                                    return (
                                        <button key={p} onClick={() => setCurrentPage(p)}
                                                className="w-9 h-9 rounded-lg flex items-center justify-center font-semibold transition-colors"
                                                style={currentPage === p ? { backgroundColor: NAVY, color: "#fff" } : { border: "1px solid #cbd5e1", color: "#334155" }}>
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50">
                                Siguiente<span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <footer className="bg-white border-t border-slate-200 py-6 px-4 md:px-8 mt-auto">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
                    <span className="font-bold" style={{ ...heading, color: NAVY }}>Empleo<span style={{ color: ORANGE }}>Uni</span></span>
                    <p className="text-xs text-slate-400">© 2026 EmpleoUni · Talento universitario colombiano</p>
                </div>
            </footer>
        </div>
    );
}
