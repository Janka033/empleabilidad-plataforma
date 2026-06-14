"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders, parseApiError } from "../../lib/api";

interface Vacante {
    id: string;
    titulo: string;
    empresa: string;
    descripcion: string;
    modalidad: string;
    tipo: string;
    ciudad: string;
    area: string;
    salario?: string;
    requisitos?: string[];
    activa: boolean;
}

interface VacantesResponse {
    vacantes: Vacante[];
    total: number;
}

function getRolFromToken(token: string): string | null {
    try { return JSON.parse(atob(token.split(".")[1])).rol ?? null; }
    catch { return null; }
}

export default function VacantesPage() {
    const router    = useRouter();
    const routerRef = useRef(router);
    routerRef.current = router;

    const [vacantes,        setVacantes]        = useState<Vacante[]>([]);
    const [total,           setTotal]           = useState(0);
    const [initialLoading,  setInitialLoading]  = useState(true);
    const [refreshing,      setRefreshing]      = useState(false);
    const [error,           setError]           = useState<string | null>(null);

    // ── Filtros ──────────────────────────────────────────────────────────
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm,  setSearchTerm]  = useState("");   // debounced → va al backend
    const [modalidad,   setModalidad]   = useState("");
    const [programa,    setPrograma]    = useState("");
    const [salarioMinimo, setSalarioMinimo] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 6;

    // ── Debounce 400 ms ──────────────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // ── Verificación de rol ──────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { routerRef.current.push("/login"); return; }
        const rol = getRolFromToken(token);
        if (rol === "empresa") routerRef.current.push("/empresa/dashboard");
    }, []);

    // ── Fetch principal — todos los filtros van al BACKEND ───────────────
    const fetchVacantes = useCallback(async (signal?: AbortSignal) => {
        const token = localStorage.getItem("token");
        if (!token) { routerRef.current.push("/login"); return; }

        setError(null);

        const params = new URLSearchParams();
        params.append("limit",  limit.toString());
        params.append("offset", ((currentPage - 1) * limit).toString());
        if (modalidad)             params.append("modalidad",  modalidad);
        if (programa)              params.append("area",       programa);
        if (searchTerm.trim())     params.append("titulo",     searchTerm.trim());
        if (salarioMinimo > 0)     params.append("salarioMin", salarioMinimo.toString());

        try {
            const res = await fetch(
                `${API_URLS.vacantes}/vacantes?${params.toString()}`,
                { headers: authHeaders(token), signal }
            );

            if (signal?.aborted) return;

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    routerRef.current.push("/login");
                    return;
                }
                throw new Error(await parseApiError(res, "Error al cargar vacantes"));
            }

            const data: VacantesResponse = await res.json();
            if (signal?.aborted) return;

            setVacantes(data.vacantes);
            setTotal(data.total);
        } catch (err: unknown) {
            if ((err as Error).name === "AbortError") return;
            setError(err instanceof Error ? err.message : "Error de conexión");
        } finally {
            if (!signal?.aborted) {
                setInitialLoading(false);
                setRefreshing(false);
            }
        }
    }, [modalidad, programa, salarioMinimo, searchTerm, currentPage]);

    useEffect(() => {
        const controller = new AbortController();
        if (vacantes.length === 0 && initialLoading) {
            setInitialLoading(true);
        } else {
            setRefreshing(true);
        }
        fetchVacantes(controller.signal);
        return () => controller.abort();
    }, [fetchVacantes]);

    const handleLimpiarFiltros = () => {
        setModalidad("");
        setPrograma("");
        setSalarioMinimo(0);
        setSearchInput("");
        setSearchTerm("");
        setCurrentPage(1);
    };

    // ── Helpers ──────────────────────────────────────────────────────────
    const formatSalary = (salario?: string) => {
        if (!salario) return "No especificado";
        if (/[a-zA-Z$\-]/.test(salario)) return salario;
        const num = parseInt(salario.replace(/[^0-9]/g, ""));
        if (isNaN(num) || num === 0) return "No especificado";
        return new Intl.NumberFormat("es-CO", {
            style: "currency", currency: "COP", minimumFractionDigits: 0,
        }).format(num);
    };

    const getModalidadColor = (m: string) => ({
        Remoto:    "bg-[#e0e7ff] text-[#3730a3]",
        Híbrido:   "bg-[#dcfce7] text-[#166534]",
        Presencial: "bg-[#fef9c3] text-[#854d0e]",
    }[m] ?? "bg-surface-variant text-on-surface-variant");

    const totalPages = Math.ceil(total / limit);

    // ── Loading screen ───────────────────────────────────────────────────
    if (initialLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-on-surface-variant font-body-md text-body-md">Cargando vacantes...</p>
            </div>
        </div>
    );

    if (error && vacantes.length === 0) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
            <p className="text-error font-body-md text-body-md">{error}</p>
            <button
                onClick={() => fetchVacantes()}
                className="px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded hover:opacity-90 transition-opacity"
            >
                Reintentar
            </button>
        </div>
    );

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pt-16">

            {/* NavBar */}
            <nav className="bg-surface border-b border-outline-variant shadow-sm fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-xl h-16 max-w-container-max mx-auto left-0 right-0">
                <div className="flex items-center gap-xl">
                    <span className="font-headline-md text-headline-md font-bold tracking-tight" style={{ color: "#0d1c32" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
                    <div className="hidden md:flex gap-md font-body-md text-body-md">
                        <a className="text-primary border-b-2 border-primary pb-1" href="/vacantes">Vacantes</a>
                        <a className="text-on-surface-variant hover:text-primary transition-colors" href="/perfil">Mi Perfil</a>
                    </div>
                </div>
                <button
                    onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}
                    className="font-label-md text-label-md text-on-primary bg-primary rounded px-md py-xs hover:opacity-90 transition-opacity shadow-level-1"
                >
                    Cerrar sesión
                </button>
            </nav>

            {/* Hero */}
            <section
                className="bg-navy py-xl px-margin-mobile md:px-xl w-full flex flex-col items-center justify-center relative overflow-hidden"
                style={{
                    backgroundImage: `linear-gradient(135deg, rgba(13,28,50,0.9) 0%, rgba(27,27,29,0.8) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuCbFSBKsvbgs-w4FN8WHd5SebmuRP-r5FlsmssKK1TLmBMYGd3y_OVDnJ8Nrqm-jNXYfo7U8T5w8Zu1unV2d_0_UNE3dAQ5i3qpHsk7DAvQcPveOuHtamnEfY9GH4Hv182hzWv9otcoYrV0Oj1WeJoqK-9cdKNpgeyIH1puPgX55G9raQ0V4Of3WbsBnZsz_-qyxLLtCcC7_r9OibBs3PzvI2FRlKmfCy4fI6QvwlKNfIp3zeksp8bvSMn4KouPKjjdLsrlodJ3IYg')`,
                    backgroundSize: "cover", backgroundPosition: "center",
                }}
            >
                <h1 className="font-display-lg text-display-lg text-on-primary text-center max-w-[800px] mb-lg z-10 hidden md:block">
                    Encuentra tu práctica profesional ideal
                </h1>
                <h1 className="font-headline-lg-mobile text-on-primary text-center max-w-[800px] mb-lg z-10 md:hidden">
                    Encuentra tu práctica profesional ideal
                </h1>

                {/* Buscador — va al backend */}
                <div className="w-full max-w-[800px] flex flex-col md:flex-row gap-xs z-10 bg-surface rounded-lg p-xs shadow-level-2">
                    <div className="flex-1 flex items-center bg-surface-container-low rounded border border-outline-variant focus-within:border-primary px-sm">
                        <span className="material-symbols-outlined text-on-surface-variant mr-xs">search</span>
                        <input
                            className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface py-sm h-full outline-none"
                            placeholder="Cargo, empresa o palabra clave..."
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        {refreshing && (
                            <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin shrink-0 mr-xs" />
                        )}
                    </div>
                    <button
                        onClick={() => { setSearchTerm(searchInput); setCurrentPage(1); }}
                        className="bg-orange text-on-primary font-label-md text-label-md rounded px-lg py-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-xs shadow-level-1 whitespace-nowrap"
                        style={{ backgroundColor: "#f97316" }}
                    >
                        Buscar
                    </button>
                </div>
            </section>

            {/* Contenido */}
            <main className="flex-1 w-full max-w-container-max mx-auto px-margin-mobile md:px-xl py-lg flex flex-col md:flex-row gap-gutter">

                {/* Sidebar filtros */}
                <aside className="w-full md:w-1/4 flex flex-col gap-md shrink-0">
                    <div className="bg-surface rounded-lg border border-outline-variant p-md shadow-level-1 flex flex-col gap-md">
                        <div className="flex items-center justify-between border-b border-outline-variant pb-xs">
                            <h2 className="font-headline-md text-headline-md text-on-surface">Filtros</h2>
                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">filter_list</span>
                        </div>

                        {/* Modalidad */}
                        <div className="flex flex-col gap-xs">
                            <label className="font-label-md text-label-md text-on-surface-variant">Modalidad</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded px-sm py-[10px] font-body-sm text-body-sm text-on-surface focus:border-primary outline-none"
                                    value={modalidad}
                                    onChange={(e) => { setModalidad(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="">Todas las modalidades</option>
                                    <option>Presencial</option>
                                    <option>Remoto</option>
                                    <option>Híbrido</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        {/* Área */}
                        <div className="flex flex-col gap-xs">
                            <label className="font-label-md text-label-md text-on-surface-variant">Área / Programa</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded px-sm py-[10px] font-body-sm text-body-sm text-on-surface focus:border-primary outline-none"
                                    value={programa}
                                    onChange={(e) => { setPrograma(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="">Todas las áreas</option>
                                    <option value="Tecnología">Tecnología</option>
                                    <option value="Administración">Administración</option>
                                    <option value="Diseño">Diseño</option>
                                    <option value="Derecho">Derecho</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        {/* Salario mínimo — va al BACKEND */}
                        <div className="flex flex-col gap-xs pt-xs border-t border-outline-variant">
                            <div className="flex justify-between items-center">
                                <label className="font-label-md text-label-md text-on-surface-variant">Salario mínimo</label>
                                <span className="font-body-sm text-body-sm text-primary font-semibold">
                                    {salarioMinimo > 0
                                        ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(salarioMinimo)
                                        : "Sin mínimo"}
                                </span>
                            </div>
                            <input
                                className="w-full h-1 bg-surface-variant rounded-full appearance-none cursor-pointer accent-primary"
                                type="range" min="0" max="5000000" step="100000"
                                value={salarioMinimo}
                                onChange={(e) => { setSalarioMinimo(parseInt(e.target.value)); setCurrentPage(1); }}
                            />
                            <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                                <span>$0</span><span>$5M+</span>
                            </div>
                        </div>

                        <button
                            onClick={handleLimpiarFiltros}
                            className="w-full mt-sm bg-surface text-primary border border-primary font-label-md text-label-md rounded py-xs hover:bg-surface-container-low transition-colors"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </aside>

                {/* Grid de vacantes */}
                <div className="w-full md:w-3/4 flex flex-col gap-lg">
                    {/* Contador */}
                    <div className="flex items-center justify-between">
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {refreshing ? "Buscando..." : `${total} vacante${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`}
                        </p>
                    </div>

                    {error && (
                        <p className="text-error font-body-sm text-body-sm border border-error rounded p-xs">{error}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                        {vacantes.length === 0 && !refreshing ? (
                            <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[48px]">search_off</span>
                                <p className="font-body-md text-body-md">No se encontraron vacantes con los filtros seleccionados.</p>
                                <button onClick={handleLimpiarFiltros} className="text-primary font-label-md text-label-md hover:underline">
                                    Limpiar filtros
                                </button>
                            </div>
                        ) : (
                            vacantes.map((vac) => (
                                <div
                                    key={vac.id}
                                    onClick={() => router.push(`/vacantes/${vac.id}`)}
                                    className="bg-surface border border-outline-variant rounded-lg p-md shadow-level-1 hover:shadow-level-2 transition-all cursor-pointer flex flex-col gap-sm relative group hover:border-primary"
                                >
                                    <button
                                        type="button"
                                        aria-label="Guardar vacante"
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-md right-md text-on-surface-variant hover:text-orange transition-colors"
                                    >
                                        <span className="material-symbols-outlined">bookmark_border</span>
                                    </button>

                                    <div className="flex gap-sm items-start">
                                        <div className="w-12 h-12 bg-primary-container rounded border border-outline-variant flex items-center justify-center shrink-0">
                                            <span className="font-headline-md text-headline-md text-primary font-bold">
                                                {vac.empresa.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-label-sm text-label-sm text-on-surface-variant">{vac.empresa}</span>
                                            <h3 className="font-body-lg text-body-lg font-bold text-on-surface leading-tight mt-1 group-hover:text-primary transition-colors">
                                                {vac.titulo}
                                            </h3>
                                        </div>
                                    </div>

                                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                                        {vac.descripcion}
                                    </p>

                                    <div className="flex flex-wrap gap-xs mt-xs">
                                        <span className={`${getModalidadColor(vac.modalidad)} font-label-sm text-label-sm px-2 py-1 rounded-[4px]`}>
                                            {vac.modalidad}
                                        </span>
                                        <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded-[4px] flex items-center gap-[2px]">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span> {vac.ciudad}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-end mt-auto pt-sm border-t border-surface-variant">
                                        <span className="font-body-md text-body-md font-semibold text-on-surface">
                                            {formatSalary(vac.salario)}{" "}
                                            <span className="text-on-surface-variant text-body-sm font-normal">/ mes</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary group-hover:gap-2 transition-all">
                                            Ver detalle
                                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-sm mt-md font-body-sm text-body-sm">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-xs px-sm py-xs border border-outline-variant rounded hover:bg-surface-container text-on-surface-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[16px]">chevron_left</span> Anterior
                            </button>
                            <div className="flex gap-xs">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let p: number;
                                    if (totalPages <= 5)            p = i + 1;
                                    else if (currentPage <= 3)      p = i + 1;
                                    else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                                    else                             p = currentPage - 2 + i;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`w-8 h-8 rounded flex items-center justify-center ${
                                                currentPage === p
                                                    ? "bg-primary text-on-primary font-semibold"
                                                    : "border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-xs px-sm py-xs border border-outline-variant rounded hover:bg-surface-container text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-surface-container-highest w-full py-lg px-margin-mobile md:px-xl flex flex-col md:flex-row justify-between items-center gap-md mt-auto">
                <span className="font-headline-md text-headline-md font-bold tracking-tight" style={{ color: "#0d1c32" }}>
                    Empleo<span style={{ color: "#f97316" }}>Uni</span>
                </span>
                <p className="font-body-sm text-body-sm text-on-surface">© 2024 EmpleoUni - Talento Universitario Colombiano</p>
                <div className="flex gap-md font-body-sm text-body-sm">
                    <a className="text-on-surface-variant hover:underline opacity-80 hover:opacity-100" href="#">Contacto</a>
                    <a className="text-on-surface-variant hover:underline opacity-80 hover:opacity-100" href="#">Términos</a>
                    <a className="text-on-surface-variant hover:underline opacity-80 hover:opacity-100" href="#">Privacidad</a>
                </div>
            </footer>
        </div>
    );
}
