"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Tipos basados en el modelo de vacantes
interface Vacante {
    id: string;
    titulo: string;
    empresa: string;
    descripcion: string;
    modalidad: string;      // "Presencial", "Remoto", "Híbrido"
    tipo: string;           // "Práctica", "Tiempo completo", "Medio tiempo"
    ciudad: string;
    area: string;
    salario?: string;
    requisitos?: string[];
    logoUrl?: string;       // No viene del backend, se puede dejar imagen por defecto
    activa: boolean;
}

interface VacantesResponse {
    vacantes: Vacante[];
    total: number;
}

export default function VacantesPage() {
    const router = useRouter();
    const [vacantes, setVacantes] = useState<Vacante[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros y paginación
    const [searchTerm, setSearchTerm] = useState("");
    const [modalidad, setModalidad] = useState("");
    const [programa, setPrograma] = useState("");
    const [salarioMinimo, setSalarioMinimo] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 6;

    // Obtener token y construir URL con filtros
    const fetchVacantes = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        setLoading(true);
        setError(null);

        // Construir query params
        const params = new URLSearchParams();
        params.append("limit", limit.toString());
        params.append("offset", ((currentPage - 1) * limit).toString());
        if (modalidad && modalidad !== "Todas las modalidades") params.append("modalidad", modalidad);
        if (programa && programa !== "Todos los programas") params.append("area", programa);
        // Nota: el backend no tiene filtro por salario mínimo, lo aplicamos en cliente
        if (searchTerm) params.append("titulo", searchTerm); // asumiendo que backend filtra por título (ajustable)

        try {
            const res = await fetch(`http://localhost:3003/vacantes?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    router.push("/login");
                    return;
                }
                throw new Error("Error al cargar vacantes");
            }
            const data: VacantesResponse = await res.json();
            // Filtrar por salario mínimo en el cliente (opcional)
            let filtered = data.vacantes;
            if (salarioMinimo > 0) {
                filtered = filtered.filter(v => {
                    const salarioNum = parseInt(v.salario?.replace(/[^0-9]/g, "") || "0");
                    return salarioNum >= salarioMinimo;
                });
            }
            if (searchTerm && !params.has("titulo")) {
                // Si el backend no soporta búsqueda por título, hacemos filtro cliente
                filtered = filtered.filter(v =>
                    v.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    v.empresa.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            setVacantes(filtered);
            setTotal(data.total);
        } catch (err: any) {
            setError(err.message || "Error de conexión");
        } finally {
            setLoading(false);
        }
    }, [router, modalidad, programa, salarioMinimo, searchTerm, currentPage]);

    useEffect(() => {
        fetchVacantes();
    }, [fetchVacantes]);

    // Helper para formatear salario
    const formatSalary = (salario?: string) => {
        if (!salario) return "No especificado";
        const num = parseInt(salario.replace(/[^0-9]/g, ""));
        return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(num);
    };

    // Determinar color de badge por modalidad
    const getModalidadColor = (modalidad: string) => {
        switch (modalidad) {
            case "Remoto":
                return "bg-[#e0e7ff] text-[#3730a3]";
            case "Híbrido":
                return "bg-[#dcfce7] text-[#166534]";
            default:
                return "bg-[#fef9c3] text-[#854d0e]";
        }
    };

    const totalPages = Math.ceil(total / limit);

    if (loading && vacantes.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-primary">Cargando vacantes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                <p className="text-error">{error}</p>
                <button
                    onClick={() => fetchVacantes()}
                    className="px-4 py-2 bg-primary text-on-primary rounded"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pt-16">
            {/* TopNavBar (igual que en login/register pero adaptado) */}
            <nav className="bg-surface border-b border-outline-variant shadow-sm fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-xl h-16 max-w-container-max mx-auto left-0 right-0">
                <div className="flex items-center gap-xl">
          <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
            EmpleoUni
          </span>
                    <div className="hidden md:flex gap-md font-body-md text-body-md">
                        <a className="text-primary border-b-2 border-primary pb-1" href="/vacantes">
                            Vacantes
                        </a>
                        <a className="text-on-surface-variant hover:text-primary transition-colors" href="/perfil">
                            Mi Perfil
                        </a>
                    </div>
                </div>
                <button
                    onClick={() => {
                        localStorage.removeItem("token");
                        router.push("/login");
                    }}
                    className="font-label-md text-label-md text-on-primary bg-primary rounded px-md py-xs hover:bg-on-surface-variant transition-colors shadow-level-1"
                >
                    Cerrar sesión
                </button>
            </nav>

            {/* Hero Section con buscador */}
            <section
                className="bg-navy py-xl px-margin-mobile md:px-xl w-full flex flex-col items-center justify-center relative overflow-hidden"
                style={{
                    backgroundImage: `linear-gradient(135deg, rgba(13, 28, 50, 0.9) 0%, rgba(27, 27, 29, 0.8) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuCbFSBKsvbgs-w4FN8WHd5SebmuRP-r5FlsmssKK1TLmBMYGd3y_OVDnJ8Nrqm-jNXYfo7U8T5w8Zu1unV2d_0_UNE3dAQ5i3qpHsk7DAvQcPveOuHtamnEfY9GH4Hv182hzWv9otcoYrV0Oj1WeJoqK-9cdKNpgeyIH1puPgX55G9raQ0V4Of3WbsBnZsz_-qyxLLtCcC7_r9OibBs3PzvI2FRlKmfCy4fI6QvwlKNfIp3zeksp8bvSMn4KouPKjjdLsrlodJ3IYg')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <h1 className="font-display-lg text-display-lg text-on-primary text-center max-w-[800px] mb-lg z-10 hidden md:block">
                    Encuentra tu práctica profesional ideal
                </h1>
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-primary text-center max-w-[800px] mb-lg z-10 md:hidden">
                    Encuentra tu práctica profesional ideal
                </h1>
                <div className="w-full max-w-[800px] flex flex-col md:flex-row gap-xs z-10 bg-surface rounded-lg p-xs shadow-level-2">
                    <div className="flex-1 flex items-center bg-surface-container-low rounded border border-outline-variant focus-within:border-primary px-sm">
                        <span className="material-symbols-outlined text-on-surface-variant mr-xs">search</span>
                        <input
                            className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface py-sm h-full outline-none"
                            placeholder="Cargo, empresa o palabra clave..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <button
                        onClick={() => fetchVacantes()}
                        className="bg-orange text-on-primary font-label-md text-label-md rounded px-lg py-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-xs shadow-level-1 whitespace-nowrap"
                    >
                        Buscar
                    </button>
                </div>
            </section>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-container-max mx-auto px-margin-mobile md:px-xl py-lg flex flex-col md:flex-row gap-gutter">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-1/4 flex flex-col gap-md shrink-0">
                    <div className="bg-surface rounded-lg border border-outline-variant p-md shadow-level-1 flex flex-col gap-md">
                        <div className="flex items-center justify-between border-b border-outline-variant pb-xs">
                            <h2 className="font-headline-md text-headline-md text-on-surface">Filtros</h2>
                            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors text-[20px]">
                filter_list
              </span>
                        </div>
                        {/* Modalidad */}
                        <div className="flex flex-col gap-xs">
                            <label className="font-label-md text-label-md text-on-surface-variant">Modalidad</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded px-sm py-[10px] font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                                    value={modalidad}
                                    onChange={(e) => {
                                        setModalidad(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Todas las modalidades</option>
                                    <option value="Presencial">Presencial</option>
                                    <option value="Remoto">Remoto</option>
                                    <option value="Híbrido">Híbrido</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                  expand_more
                </span>
                            </div>
                        </div>
                        {/* Programa académico (área) */}
                        <div className="flex flex-col gap-xs">
                            <label className="font-label-md text-label-md text-on-surface-variant">Programa académico</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded px-sm py-[10px] font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                                    value={programa}
                                    onChange={(e) => {
                                        setPrograma(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Todos los programas</option>
                                    <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
                                    <option value="Administración de Empresas">Administración de Empresas</option>
                                    <option value="Diseño Industrial">Diseño Industrial</option>
                                    <option value="Derecho">Derecho</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                  expand_more
                </span>
                            </div>
                        </div>
                        {/* Salario mínimo */}
                        <div className="flex flex-col gap-xs pt-xs border-t border-outline-variant">
                            <div className="flex justify-between items-center">
                                <label className="font-label-md text-label-md text-on-surface-variant">Salario mínimo</label>
                                <span className="font-body-sm text-body-sm text-primary font-semibold">
                  {formatSalary(salarioMinimo.toString())}
                </span>
                            </div>
                            <input
                                className="w-full h-1 bg-surface-variant rounded-full appearance-none cursor-pointer accent-primary"
                                type="range"
                                min="0"
                                max="5000000"
                                step="100000"
                                value={salarioMinimo}
                                onChange={(e) => {
                                    setSalarioMinimo(parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                            />
                            <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                                <span>$0</span>
                                <span>$5M+</span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setModalidad("");
                                setPrograma("");
                                setSalarioMinimo(0);
                                setSearchTerm("");
                                setCurrentPage(1);
                                fetchVacantes();
                            }}
                            className="w-full mt-sm bg-surface text-primary border border-primary font-label-md text-label-md rounded py-xs hover:bg-surface-container-low transition-colors shadow-level-1"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </aside>

                {/* Job Grid */}
                <div className="w-full md:w-3/4 flex flex-col gap-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-md">
                        {vacantes.length === 0 ? (
                            <div className="col-span-2 text-center py-12 text-on-surface-variant">
                                No se encontraron vacantes con los filtros seleccionados.
                            </div>
                        ) : (
                            vacantes.map((vac) => (
                                <div
                                    key={vac.id}
                                    className="bg-surface border border-outline-variant rounded-lg p-md shadow-level-1 hover:shadow-level-2 transition-shadow flex flex-col gap-sm relative group"
                                >
                                    <button className="absolute top-md right-md text-on-surface-variant hover:text-orange transition-colors">
                                        <span className="material-symbols-outlined">bookmark_border</span>
                                    </button>
                                    <div className="flex gap-sm items-start">
                                        <div className="w-12 h-12 bg-surface-container rounded border border-outline-variant flex items-center justify-center shrink-0 overflow-hidden">
                                            {/* Logo por defecto o podrías mapear según empresa */}
                                            <img
                                                alt={vac.empresa}
                                                className="w-full h-full object-cover"
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUL5CVcOaNoEDERTQcUALEzgXqT7ZL3DbFeDt5g36oCZMgWmemWLy_G7HLNHb-f44-GQVmwi18CYFfavf24Ij6s5laEw02emsBclKsQRCycCqSUC4t7iB-bc3IqrP_r2cGgI9OL01cIIlLWvBIBcz-SAyfZUj-1vnZ66rcTzJkc_N1LhVkdkaODq93M6q7v3cNlOSjN8EbFWx2sdanKT_lqGQcPiGv-C6eMNvssBdaF1y-lAVyVepdWpEoxeciM4L21llNZ0GmI18"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {vac.empresa}
                      </span>
                                            <h3 className="font-body-lg text-body-lg font-bold text-on-surface leading-tight mt-1 group-hover:text-primary transition-colors">
                                                {vac.titulo}
                                            </h3>
                                        </div>
                                    </div>
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
                      {formatSalary(vac.salario)} <span className="text-on-surface-variant text-body-sm font-normal">/ mes</span>
                    </span>
                                        <Link
                                            href={`/vacantes/${vac.id}`}
                                            className="border border-outline-variant text-on-surface font-label-sm text-label-sm rounded px-sm py-1 hover:bg-surface-container-low transition-colors shadow-level-1"
                                        >
                                            Ver más
                                        </Link>
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
                                className="flex items-center gap-xs px-sm py-xs border border-outline-variant rounded hover:bg-surface-container text-on-surface-variant transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[16px]">chevron_left</span> Anterior
                            </button>
                            <div className="flex gap-xs">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded flex items-center justify-center ${
                                                currentPage === pageNum
                                                    ? "bg-primary text-on-primary font-semibold"
                                                    : "border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-xs px-sm py-xs border border-outline-variant rounded hover:bg-surface-container text-on-surface transition-colors"
                            >
                                Siguiente <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-surface-container-highest w-full py-lg px-margin-mobile md:px-xl flex flex-col md:flex-row justify-between items-center gap-md mt-auto">
                <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">EmpleoUni</span>
                <p className="font-body-sm text-body-sm text-on-surface text-center md:text-left">
                    © 2024 EmpleoUni - Talento Universitario Colombiano
                </p>
                <div className="flex gap-md font-body-sm text-body-sm">
                    <a className="text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">
                        Contacto
                    </a>
                    <a className="text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">
                        Términos y Condiciones
                    </a>
                    <a className="text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">
                        Privacidad
                    </a>
                </div>
            </footer>
        </div>
    );
}