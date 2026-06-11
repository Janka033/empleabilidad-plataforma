"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../../lib/api";

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
    activa: boolean;
}

interface Postulado {
    id: string;
    vacanteId: string;
    nombre: string;
    email: string;
    universidad?: string;
    programa?: string;
    semestre?: number;
    habilidades?: string[];
    completitud: number;
    cartaMotivacion: string;
    expectativaSalarial: string;
    disponibilidad: string;
    estado: string;
    fecha: string;
}

const MODALIDADES = ["Presencial", "Remoto", "Híbrido"];
const TIPOS = ["Práctica", "Tiempo completo", "Medio tiempo"];
const EMPTY_FORM = { titulo: "", empresa: "", descripcion: "", modalidad: "", tipo: "", ciudad: "", area: "", salario: "", requisitos: "" };

export default function EmpresaDashboard() {
    const router = useRouter();
    const [vacantes, setVacantes] = useState<Vacante[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [empresaNombre, setEmpresaNombre] = useState("");

    // Postulados
    const [vacanteSeleccionada, setVacanteSeleccionada] = useState<Vacante | null>(null);
    const [postulados, setPostulados] = useState<Postulado[]>([]);
    const [postuladosLoading, setPostuladosLoading] = useState(false);

    const fetchMisVacantes = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            const res = await fetch(`${API_URLS.vacantes}/vacantes`, { headers: authHeaders(token) });
            if (res.status === 401) { router.push("/login"); return; }
            const data = await res.json();
            setVacantes(data.vacantes || []);
        } catch { /* silenciar */ } finally { setLoading(false); }
    }, [router]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (payload.rol !== "empresa") { router.push("/vacantes"); return; }
        } catch { router.push("/login"); return; }
        const user = localStorage.getItem("user");
        if (user) { try { setEmpresaNombre(JSON.parse(user).nombre || ""); } catch { } }
        fetchMisVacantes();
    }, [router, fetchMisVacantes]);

    const fetchPostulados = async (vacante: Vacante) => {
        setVacanteSeleccionada(vacante);
        setPostulados([]);
        setPostuladosLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones/vacante/${vacante.id}`, {
                headers: authHeaders(token),
            });
            if (res.ok) setPostulados(await res.json());
        } catch { } finally { setPostuladosLoading(false); }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setFormError("");
    };

    const handleCrearVacante = async (e: React.FormEvent) => {
        e.preventDefault();
        const { titulo, empresa, descripcion, modalidad, tipo, ciudad, area } = form;
        if (!titulo || !empresa || !descripcion || !modalidad || !tipo || !ciudad || !area) {
            setFormError("Completa todos los campos obligatorios."); return;
        }
        setFormLoading(true);
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            const res = await fetch(`${API_URLS.vacantes}/vacantes`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders(token) },
                body: JSON.stringify({
                    titulo, empresa, descripcion, modalidad, tipo, ciudad, area,
                    salario: form.salario || undefined,
                    requisitos: form.requisitos ? form.requisitos.split(",").map(r => r.trim()).filter(Boolean) : [],
                }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.message || "Error al crear la vacante."); return; }
            setSuccessMsg(`Vacante "${data.titulo}" publicada exitosamente.`);
            setForm({ ...EMPTY_FORM, empresa: empresaNombre });
            setShowForm(false);
            fetchMisVacantes();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch { setFormError("Error de conexión. Intenta de nuevo."); }
        finally { setFormLoading(false); }
    };

    const estadoLabel = (e: string) => ({ enviada: "Enviada", vista: "Vista", entrevista: "En proceso", aceptada: "Aceptada", rechazada: "Rechazado" }[e] ?? e);
    const estadoColor = (e: string) => ({
        aceptada: "bg-[#e8f5e9] text-[#1b5e20]",
        rechazada: "bg-[#ffdad6] text-[#93000a]",
        entrevista: "bg-[#e0e7ff] text-[#3730a3]",
        vista: "bg-[#fef9c3] text-[#854d0e]",
    }[e] ?? "bg-surface-variant text-on-surface-variant");

    return (
        <div className="bg-background text-on-background min-h-screen flex flex-col pt-16">
            {/* NavBar */}
            <nav className="bg-surface border-b border-outline-variant shadow-sm fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-12 h-16">
                <div className="flex items-center gap-3">
                    <span className="text-xl font-bold" style={{ color: "#0d1c32" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
                    <span className="hidden md:block text-sm text-on-surface-variant border-l border-outline-variant pl-3">Panel de Empresa</span>
                </div>
                <button onClick={() => { localStorage.clear(); router.push("/login"); }}
                        className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                    Cerrar sesión
                </button>
            </nav>

            <main className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-12 py-8 flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface">Mis Vacantes</h1>
                        <p className="text-sm text-on-surface-variant mt-1">Gestiona tus vacantes y revisa los candidatos</p>
                    </div>
                    <button onClick={() => { setForm({ ...EMPTY_FORM, empresa: empresaNombre }); setFormError(""); setShowForm(true); setVacanteSeleccionada(null); }}
                            className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nueva vacante
                    </button>
                </div>

                {successMsg && (
                    <div className="bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>{successMsg}
                    </div>
                )}

                {/* Formulario crear vacante */}
                {showForm && (
                    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-on-surface">Crear nueva vacante</h2>
                            <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        {formError && <div className="bg-[#ffdad6] border border-red-200 text-[#93000a] rounded-lg px-4 py-3 text-sm">{formError}</div>}
                        <form onSubmit={handleCrearVacante} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { name: "titulo", label: "Título del cargo", placeholder: "Ej: Desarrollador Frontend Junior", required: true },
                                    { name: "empresa", label: "Nombre de la empresa", placeholder: "Ej: TechCorp S.A.S.", required: true },
                                    { name: "ciudad", label: "Ciudad", placeholder: "Ej: Armenia, Quindío", required: true },
                                    { name: "area", label: "Área", placeholder: "Ej: Tecnología, Administración", required: true },
                                    { name: "salario", label: "Salario (opcional)", placeholder: "Ej: $1.500.000 - $2.000.000", required: false },
                                    { name: "requisitos", label: "Requisitos (separados por coma)", placeholder: "Ej: React, Node.js, Git", required: false },
                                ].map(f => (
                                    <div key={f.name} className="flex flex-col gap-1">
                                        <label className="text-sm font-semibold text-on-surface">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                                        <input name={f.name} value={(form as any)[f.name]} onChange={handleFormChange}
                                               placeholder={f.placeholder} required={f.required}
                                               className="px-3 py-2.5 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:border-primary" />
                                    </div>
                                ))}
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-on-surface">Modalidad <span className="text-red-500">*</span></label>
                                    <select name="modalidad" value={form.modalidad} onChange={handleFormChange} required
                                            className="px-3 py-2.5 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:border-primary">
                                        <option value="">Selecciona modalidad</option>
                                        {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-on-surface">Tipo <span className="text-red-500">*</span></label>
                                    <select name="tipo" value={form.tipo} onChange={handleFormChange} required
                                            className="px-3 py-2.5 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:border-primary">
                                        <option value="">Selecciona tipo</option>
                                        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-semibold text-on-surface">Descripción <span className="text-red-500">*</span></label>
                                <textarea name="descripcion" value={form.descripcion} onChange={handleFormChange}
                                          placeholder="Describe responsabilidades y lo que aprenderá el estudiante..." required rows={3}
                                          className="px-3 py-2.5 border border-outline-variant rounded-lg text-sm bg-surface focus:outline-none focus:border-primary resize-none" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)}
                                        className="px-5 py-2 text-sm border border-outline-variant rounded-lg text-on-surface hover:bg-surface-variant transition-colors">Cancelar</button>
                                <button type="submit" disabled={formLoading}
                                        className="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-2">
                                    {formLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Publicando...</> : <><span className="material-symbols-outlined text-[16px]">publish</span>Publicar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Layout dos columnas: vacantes | postulados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                    {/* Columna izquierda: lista de vacantes */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-base font-semibold text-on-surface">Vacantes publicadas</h2>
                        {loading ? (
                            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                        ) : vacantes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
                                <span className="material-symbols-outlined text-[40px]">work_outline</span>
                                <p className="text-sm">Aún no has publicado vacantes.</p>
                            </div>
                        ) : (
                            vacantes.map(vac => (
                                <button key={vac.id} onClick={() => fetchPostulados(vac)}
                                        className={`text-left bg-surface border rounded-xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${vacanteSeleccionada?.id === vac.id ? "border-primary ring-1 ring-primary" : "border-outline-variant"}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
                                            <span className="text-white font-bold">{vac.empresa.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-on-surface">{vac.titulo}</p>
                                            <p className="text-xs text-on-surface-variant">{vac.empresa} · {vac.ciudad}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">{vac.modalidad}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">{vac.tipo}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${vac.activa ? "bg-[#e8f5e9] text-[#1b5e20]" : "bg-surface-variant text-on-surface-variant"}`}>
                                            {vac.activa ? "Activa" : "Inactiva"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-primary font-medium">Ver postulados →</p>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Columna derecha: postulados a la vacante seleccionada */}
                    <div className="flex flex-col gap-3 md:sticky md:top-20">
                        {!vacanteSeleccionada ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
                                <span className="material-symbols-outlined text-[40px]">person_search</span>
                                <p className="text-sm text-center">Selecciona una vacante para ver los candidatos postulados</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-on-surface">
                                        Postulados a: <span className="text-primary">{vacanteSeleccionada.titulo}</span>
                                    </h2>
                                    <button onClick={() => { setVacanteSeleccionada(null); setPostulados([]); }}
                                            className="text-on-surface-variant hover:text-on-surface">
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>

                                {postuladosLoading ? (
                                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                                ) : postulados.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
                                        <span className="material-symbols-outlined text-[36px]">inbox</span>
                                        <p className="text-sm">Ningún estudiante se ha postulado aún.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {postulados.map(p => (
                                            <div key={p.id} className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                                                {/* Cabecera del candidato */}
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-surface-variant rounded-full flex items-center justify-center shrink-0">
                                                        <span className="text-on-surface-variant font-bold text-base">{p.nombre?.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm text-on-surface">{p.nombre}</p>
                                                        <p className="text-xs text-on-surface-variant">{p.email}</p>
                                                    </div>
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${estadoColor(p.estado)}`}>
                                                        {estadoLabel(p.estado)}
                                                    </span>
                                                </div>

                                                {/* Info académica */}
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-on-surface-variant border-t border-outline-variant pt-2">
                                                    {p.universidad && <span>🎓 {p.universidad}</span>}
                                                    {p.programa   && <span>📚 {p.programa}</span>}
                                                    {p.semestre   && <span>📅 Semestre {p.semestre}</span>}
                                                    <span>⭐ Perfil {p.completitud}% completo</span>
                                                </div>

                                                {/* Habilidades */}
                                                {p.habilidades && p.habilidades.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {p.habilidades.map((h, i) => (
                                                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#e0e7ff] text-[#3730a3]">{h}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Carta de motivación */}
                                                <div className="bg-surface-container-low rounded-lg p-3 text-xs text-on-surface-variant border border-outline-variant">
                                                    <p className="font-semibold text-on-surface mb-1">Carta de motivación</p>
                                                    <p className="leading-relaxed">{p.cartaMotivacion}</p>
                                                </div>

                                                {/* Expectativa y disponibilidad */}
                                                <div className="flex gap-4 text-xs text-on-surface-variant">
                                                    <span>💰 Expectativa: {p.expectativaSalarial}</span>
                                                    <span>📆 Disponible: {p.disponibilidad}</span>
                                                </div>

                                                <p className="text-xs text-on-surface-variant">
                                                    Postulado el {new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            <footer className="bg-surface-container-highest w-full py-6 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
                <span className="text-base font-bold" style={{ color: "#0d1c32" }}>Empleo<span style={{ color: "#f97316" }}>Uni</span></span>
                <p className="text-sm text-on-surface">© 2024 EmpleoUni - Talento Universitario Colombiano</p>
                <div className="flex gap-4 text-sm text-on-surface-variant">
                    <a href="#" className="hover:underline">Contacto</a>
                    <a href="#" className="hover:underline">Términos</a>
                    <a href="#" className="hover:underline">Privacidad</a>
                </div>
            </footer>
        </div>
    );
}