"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../../lib/api";
import toast from 'react-hot-toast';

interface Vacante {
    id: string; titulo: string; empresa: string;
    modalidad: string; tipo: string; ciudad: string;
    area: string; salario?: string; activa: boolean;
}
interface Postulado {
    id: string; vacanteId: string;
    nombre: string; email: string;
    universidad?: string; programa?: string; semestre?: number;
    habilidades?: string[]; completitud: number;
    cartaMotivacion: string; expectativaSalarial: string;
    disponibilidad: string; estado: string; fecha: string;
    contratado?: boolean; empresaContratante?: string;
    perfilId?: string;
}
interface Notificacion {
    id: string; tipo: string; titulo: string;
    mensaje: string; leida: boolean; created_at: string;
    meta?: { vacanteId?: string; postulacionId?: string; estudianteNombre?: string };
}

const MODALIDADES = ["Presencial", "Remoto", "Híbrido"];
const TIPOS       = ["Práctica", "Tiempo completo", "Medio tiempo"];
const EMPTY_FORM  = { titulo: "", empresa: "", descripcion: "", modalidad: "", tipo: "", ciudad: "", area: "", salario: "", requisitos: "" };

const ESTADOS = [
    { value: "enviada",    label: "Enviada",    style: "bg-gray-100 text-gray-600"       },
    { value: "vista",      label: "Vista",      style: "bg-amber-50 text-amber-700"      },
    { value: "entrevista", label: "En proceso", style: "bg-blue-50 text-blue-700"        },
    { value: "aceptada",   label: "Aceptada",   style: "bg-emerald-50 text-emerald-700"  },
    { value: "rechazada",  label: "Rechazada",  style: "bg-red-50 text-red-600"          },
    { value: "confirmada", label: "Confirmada", style: "bg-purple-50 text-purple-700"    },
    { value: "rechazada_por_estudiante", label: "Rechazada por estudiante", style: "bg-orange-50 text-orange-700" },
];
const ESTADO_ICON: Record<string, string> = {
    enviada: "schedule", vista: "visibility", entrevista: "groups", aceptada: "check_circle", rechazada: "cancel",
};

function estadoStyle(e: string) {
    return ESTADOS.find((s) => s.value === e) ?? ESTADOS[0];
}

export default function EmpresaDashboard() {
    const router = useRouter();
    const [vacantes,            setVacantes]            = useState<Vacante[]>([]);
    const [loading,             setLoading]             = useState(true);
    const [showForm,            setShowForm]            = useState(false);
    const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);    const [formLoading,         setFormLoading]         = useState(false);
    const [formError,           setFormError]           = useState("");
    const [successMsg,          setSuccessMsg]          = useState("");
    const [empresaNombre,       setEmpresaNombre]       = useState("");
    const [vacanteSeleccionada, setVacanteSeleccionada] = useState<Vacante | null>(null);
    const [postulados,          setPostulados]          = useState<Postulado[]>([]);
    const [postuladosLoading,   setPostuladosLoading]   = useState(false);
    const [updatingEstado,      setUpdatingEstado]      = useState<Record<string, boolean>>({});
    const [candidatosPage,      setCandidatosPage]      = useState(1);
    const candidatosPorPagina = 2;
    const [candidatoDetalle, setCandidatoDetalle] = useState<Postulado | null>(null);

    const [notificaciones,   setNotificaciones]   = useState<Notificacion[]>([]);
    const [noLeidas,         setNoLeidas]         = useState(0);
    const [showNotifPanel,   setShowNotifPanel]   = useState(false);

    const fetchVacantes = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            const res = await fetch(`${API_URLS.vacantes}/vacantes`, { headers: authHeaders(token) });
            if (res.status === 401) { router.push("/login"); return; }
            const data = await res.json();
            setVacantes(data.vacantes || []);
        } catch {} finally { setLoading(false); }
    }, [router]);

    const fetchNotificaciones = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const r = await fetch(`${API_URLS.perfiles}/notificaciones`, { headers: authHeaders(token) });
            if (r.ok) {
                const d = await r.json();
                setNotificaciones(d.notificaciones || []);
                setNoLeidas(d.noLeidas || 0);
            }
        } catch {}
    }, []);

    // 1. Verificación de token y rol
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (payload.rol !== "empresa") { router.push("/vacantes"); return; }
        } catch { router.push("/login"); return; }
    }, [router]);

// 2. Cargar nombre de la empresa (solo una vez)
    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEmpresaNombre(user.nombre || "");
        } catch {}
    }, []);

// 3. Cargar vacantes y notificaciones + polling
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchVacantes();
        fetchNotificaciones();
        const interval = setInterval(fetchNotificaciones, 30000);
        return () => clearInterval(interval);
    }, [fetchVacantes, fetchNotificaciones]);

    const fetchPostulados = async (vacante: Vacante) => {
        setVacanteSeleccionada(vacante);
        setPostulados([]);
        setPostuladosLoading(true);
        setCandidatosPage(1);
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones/vacante/${vacante.id}`, { headers: authHeaders(token) });
            if (res.ok) setPostulados(await res.json());
        } catch {} finally { setPostuladosLoading(false); }
    };

    const handleCambiarEstado = async (postulacionId: string, nuevoEstado: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setUpdatingEstado((prev) => ({ ...prev, [postulacionId]: true }));
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones/${postulacionId}/estado`, {
                method: "PATCH",
                headers: authHeaders(token),
                body: JSON.stringify({ estado: nuevoEstado }),
            });
            if (res.ok) {
                setPostulados((prev) => prev.map((p) => p.id === postulacionId ? { ...p, estado: nuevoEstado } : p));
                if (nuevoEstado === "aceptada") {
                    setPostulados((prev) => prev.map((p) =>
                        p.id === postulacionId ? { ...p, estado: nuevoEstado, contratado: true, empresaContratante: empresaNombre } : p
                    ));
                }
            }
        } catch {} finally {
            setUpdatingEstado((prev) => ({ ...prev, [postulacionId]: false }));
        }
    };

    const handleMarcarNotifLeida = async (notifId: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        await fetch(`${API_URLS.perfiles}/notificaciones/${notifId}/leer`, {
            method: "PATCH", headers: authHeaders(token),
        });
        setNotificaciones((prev) => prev.map((n) => n.id === notifId ? { ...n, leida: true } : n));
        setNoLeidas((prev) => Math.max(0, prev - 1));
    };

    const handleMarcarTodasLeidas = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        await fetch(`${API_URLS.perfiles}/notificaciones/leer-todas`, {
            method: "PATCH", headers: authHeaders(token),
        });
        setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
        setNoLeidas(0);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setFormError("");
    };

    const handleCrearVacante = async (e: React.FormEvent) => {
        e.preventDefault();
        const { titulo, empresa, descripcion, modalidad, tipo, ciudad, area } = form;
        if (!titulo || !empresa || !descripcion || !modalidad || !tipo || !ciudad || !area) {
            setFormError("Completa todos los campos obligatorios.");
            return;
        }
        setFormLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.vacantes}/vacantes`, {
                method: "POST",
                headers: authHeaders(token),
                body: JSON.stringify({
                    titulo, empresa, descripcion, modalidad, tipo, ciudad, area,
                    salario: form.salario || undefined,
                    requisitos: form.requisitos ? form.requisitos.split(",").map((r) => r.trim()).filter(Boolean) : [],
                }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.message || "Error al crear la vacante."); return; }
            setSuccessMsg(`Vacante "${data.titulo}" publicada.`);
            setForm({ ...EMPTY_FORM, empresa: empresaNombre });
            setShowForm(false);
            fetchVacantes();
            setTimeout(() => setSuccessMsg(""), 4000);
        } catch { setFormError("Error de conexión."); }
        finally { setFormLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
            <nav className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-8 fixed top-0 w-full z-50">
                <div className="flex items-center gap-3">
                    <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
                    <span className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                        <span className="material-symbols-outlined text-[14px]">business</span>
                        {empresaNombre || "Panel de Empresa"}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button onClick={() => setShowNotifPanel((v) => !v)} className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                            <span className="material-symbols-outlined text-[22px] text-gray-600">notifications</span>
                            {noLeidas > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#f97316" }}>
                                    {noLeidas > 9 ? "9+" : noLeidas}
                                </span>
                            )}
                        </button>
                        {showNotifPanel && (
                            <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                    <h3 className="font-semibold text-gray-900 text-sm">Notificaciones</h3>
                                    {noLeidas > 0 && <button onClick={handleMarcarTodasLeidas} className="text-xs text-orange-500 hover:text-orange-600 font-medium">Marcar todas leídas</button>}
                                </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                                    {notificaciones.length === 0 ? (
                                        <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                                            <span className="material-symbols-outlined text-[32px]">notifications_none</span>
                                            <p className="text-sm">Sin notificaciones</p>
                                        </div>
                                    ) : (
                                        notificaciones.map((n) => (
                                            <button key={n.id} onClick={() => handleMarcarNotifLeida(n.id)} className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.leida ? "bg-orange-50" : ""}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[16px] text-blue-600">person_add</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-semibold ${!n.leida ? "text-gray-900" : "text-gray-600"}`}>{n.titulo}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                                                    </div>
                                                    {!n.leida && <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: "#f97316" }} />}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => { localStorage.clear(); document.cookie = "token=; path=/; max-age=0"; router.push("/login"); }} className="text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90" style={{ backgroundColor: "#0d1c32" }}>Cerrar sesión</button>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-12 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mis Vacantes</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Gestiona tus vacantes y revisa los candidatos</p>
                    </div>
                    <button onClick={() => { setForm({ ...EMPTY_FORM, empresa: empresaNombre }); setFormError(""); setShowForm(true); setVacanteSeleccionada(null); }} className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 shadow-sm" style={{ backgroundColor: "#0d1c32" }}><span className="material-symbols-outlined text-[18px]">add</span>Nueva vacante</button>
                </div>

                {successMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>{successMsg}</div>}

                {showForm && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
                        <div className="flex items-center justify-between"><h2 className="text-base font-bold text-gray-900">Publicar nueva vacante</h2><button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><span className="material-symbols-outlined">close</span></button></div>
                        {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{formError}</div>}
                        <form onSubmit={handleCrearVacante} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { name: "titulo", label: "Título del cargo", placeholder: "Ej: Desarrollador Frontend Junior", req: true },
                                    { name: "empresa", label: "Nombre de la empresa", placeholder: "Ej: TechCorp S.A.S.", req: true },
                                    { name: "ciudad", label: "Ciudad", placeholder: "Ej: Armenia, Quindío", req: true },
                                    { name: "area", label: "Área", placeholder: "Ej: Tecnología", req: true },
                                    { name: "salario", label: "Salario (opcional)", placeholder: "Ej: $1.500.000 - $2.000.000", req: false },
                                    { name: "requisitos", label: "Requisitos (separados por ,)", placeholder: "Ej: React, Node.js, Git", req: false },
                                ].map((f) => (
                                    <div key={f.name} className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-gray-700">{f.label}{f.req && <span className="text-red-500 ml-1">*</span>}</label><input name={f.name} value={form[f.name]} onChange={handleFormChange} placeholder={f.placeholder} required={f.req} className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500" /></div>
                                ))}
                                <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-gray-700">Modalidad <span className="text-red-500">*</span></label><select name="modalidad" value={form.modalidad} onChange={handleFormChange} required className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500"><option value="">Selecciona modalidad</option>{MODALIDADES.map((m) => <option key={m}>{m}</option>)}</select></div>
                                <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-gray-700">Tipo <span className="text-red-500">*</span></label><select name="tipo" value={form.tipo} onChange={handleFormChange} required className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500"><option value="">Selecciona tipo</option>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
                            </div>
                            <div className="flex flex-col gap-1.5"><label className="text-sm font-semibold text-gray-700">Descripción <span className="text-red-500">*</span></label><textarea name="descripcion" value={form.descripcion} onChange={handleFormChange} placeholder="Describe las responsabilidades y lo que aprenderá el estudiante..." required rows={3} className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500 resize-none" /></div>
                            <div className="flex justify-end gap-3 pt-1"><button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">Cancelar</button><button type="submit" disabled={formLoading} className="px-6 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center gap-2" style={{ backgroundColor: "#0d1c32" }}>{formLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Publicando...</> : <><span className="material-symbols-outlined text-[16px]">publish</span>Publicar</>}</button></div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
                    {/* Lista de vacantes (sin cambios) */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Vacantes publicadas{!loading && <span className="ml-2 font-normal normal-case text-gray-400">({vacantes.length})</span>}</h2>
                        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /></div> : vacantes.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center py-16 gap-3"><span className="material-symbols-outlined text-[40px] text-gray-300">work_outline</span><p className="text-sm text-gray-400">Aún no has publicado vacantes.</p></div> : vacantes.map((vac) => (
                            <button key={vac.id} onClick={() => fetchPostulados(vac)} className={`text-left bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer ${vacanteSeleccionada?.id === vac.id ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"}`}>
                                <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-white text-sm" style={{ backgroundColor: "#0d1c32" }}>{vac.empresa.charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-900 truncate">{vac.titulo}</p><p className="text-xs text-gray-500 truncate">{vac.empresa} · {vac.ciudad}</p></div><span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${vac.activa ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{vac.activa ? "Activa" : "Inactiva"}</span></div>
                                <div className="flex flex-wrap gap-1.5"><span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{vac.modalidad}</span><span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{vac.tipo}</span></div>
                                <p className="text-xs font-semibold text-gray-400 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span>Ver candidatos</p>
                            </button>
                        ))}
                    </div>

                    {/* Panel candidatos - CORREGIDO SIN BOTONES SUELTOS */}
                    <div className="flex flex-col gap-3 lg:sticky lg:top-20">
                        {!vacanteSeleccionada ? (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center py-20 gap-3"><span className="material-symbols-outlined text-[48px] text-gray-300">person_search</span><p className="text-sm text-gray-400 text-center px-8">Selecciona una vacante de la izquierda para ver los candidatos</p></div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Candidatos: <span className="text-gray-900 normal-case font-bold">{vacanteSeleccionada.titulo}</span></h2><button onClick={() => { setVacanteSeleccionada(null); setPostulados([]); }} className="text-gray-400 hover:text-gray-700"><span className="material-symbols-outlined text-[20px]">close</span></button></div>

                                {postuladosLoading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /></div> : postulados.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center py-14 gap-2"><span className="material-symbols-outlined text-[36px] text-gray-300">inbox</span><p className="text-sm text-gray-400">Ningún candidato aún.</p></div> : (
                                    <div className="flex flex-col gap-4">
                                        {/* Grid de candidatos (2 columnas) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {postulados.slice((candidatosPage - 1) * candidatosPorPagina, candidatosPage * candidatosPorPagina).map((p) => {
                                                const eInfo = estadoStyle(p.estado);
                                                const isLocked = p.contratado || p.estado === "aceptada" || p.estado === "confirmada";
                                                return (
                                                    <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                                        <div className={`h-1.5 w-full ${p.estado === "aceptada" ? "bg-emerald-500" : p.estado === "confirmada" ? "bg-purple-500" : p.estado === "rechazada" ? "bg-red-500" : p.estado === "entrevista" ? "bg-blue-500" : p.estado === "vista" ? "bg-amber-500" : "bg-gray-300"}`} />
                                                        <div className="p-5 flex flex-col gap-4">
                                                            <div className="flex items-start gap-3"><div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0"><span className="font-bold text-gray-700 text-base">{p.nombre?.charAt(0).toUpperCase()}</span></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-gray-900 text-base break-words">{p.nombre}</p>{p.contratado && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Contratado</span>}</div><p className="text-sm text-gray-500 break-words">{p.email}</p></div></div>
                                                            <div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-600 shrink-0">Estado:</span><div className="relative flex-1"><select value={p.estado} disabled={updatingEstado[p.id] || isLocked} onChange={(e) => handleCambiarEstado(p.id, e.target.value)} className={`w-full text-sm font-semibold pl-8 pr-6 py-2 rounded-full border-0 cursor-pointer appearance-none ${eInfo.style} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}>{ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select><span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-base pointer-events-none">{ESTADO_ICON[p.estado] ?? "schedule"}</span>{updatingEstado[p.id] && <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}</div></div>
                                                            <div className="grid grid-cols-2 gap-2 text-sm">{p.universidad && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base text-gray-400">school</span><span className="text-gray-700 break-words">{p.universidad}</span></div>}{p.programa && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base text-gray-400">menu_book</span><span className="text-gray-700 break-words">{p.programa}</span></div>}{p.semestre && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base text-gray-400">calendar_month</span><span className="text-gray-700">Semestre {p.semestre}</span></div>}<div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base text-gray-400">star</span><span className="text-gray-700">Perfil {p.completitud}%</span></div></div>
                                                            {p.habilidades && p.habilidades.length > 0 && <div className="flex flex-wrap gap-1.5">{p.habilidades.slice(0, 8).map((h, i) => <span key={i} className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">{h}</span>)}{p.habilidades.length > 8 && <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">+{p.habilidades.length - 8}</span>}</div>}
                                                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Carta de motivación</p><p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{p.cartaMotivacion?.replace(/\\r\\n|\\n|\\r/g, " ").trim() || "—"}</p></div>
                                                            <button onClick={() => setCandidatoDetalle(p)} className="mt-2 w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors">Ver perfil completo</button>
                                                            <div className="flex flex-wrap justify-between gap-2 text-sm border-t border-gray-100 pt-3"><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base text-gray-400">payments</span><span className="font-semibold text-gray-800">{p.expectativaSalarial || "—"}</span></div><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base text-gray-400">event_available</span><span>{p.disponibilidad || "—"}</span></div><div className="flex items-center gap-1 text-gray-400 text-xs"><span className="material-symbols-outlined text-sm">schedule</span>{new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</div></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Paginación */}
                                        {postulados.length > candidatosPorPagina && (
                                            <div className="flex justify-center items-center gap-3 mt-4">
                                                <button onClick={() => setCandidatosPage((prev) => Math.max(1, prev - 1))} disabled={candidatosPage === 1} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                                                <span className="text-sm text-gray-500">Página {candidatosPage} de {Math.ceil(postulados.length / candidatosPorPagina)}</span>
                                                <button onClick={() => setCandidatosPage((prev) => Math.min(Math.ceil(postulados.length / candidatosPorPagina), prev + 1))} disabled={candidatosPage === Math.ceil(postulados.length / candidatosPorPagina)} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal de detalle del candidato */}
            {candidatoDetalle && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Perfil del candidato</h3>
                            <button onClick={() => setCandidatoDetalle(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><span className="material-symbols-outlined">close</span></button>

                        </div>
                        <div className="p-6 flex flex-col gap-5">
                            <div><h4 className="text-xl font-bold text-gray-900">{candidatoDetalle.nombre}</h4><p className="text-gray-500">{candidatoDetalle.email}</p></div>
                            <div className="bg-gray-50 rounded-xl p-4"><p className="text-sm font-semibold text-gray-500 uppercase">Estado de postulación</p><span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${estadoStyle(candidatoDetalle.estado).style}`}>{estadoStyle(candidatoDetalle.estado).label}</span></div>
                            <div className="border-t pt-4"><h5 className="font-semibold text-gray-800 mb-3">Información académica</h5><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400">school</span><span className="text-gray-700">{candidatoDetalle.universidad || "No especificada"}</span></div><div className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400">menu_book</span><span className="text-gray-700">{candidatoDetalle.programa || "No especificado"}</span></div><div className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400">calendar_month</span><span className="text-gray-700">Semestre {candidatoDetalle.semestre || "?"}</span></div><div className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400">star</span><span className="text-gray-700">Perfil completado {candidatoDetalle.completitud}%</span></div></div></div>
                            {candidatoDetalle.habilidades && candidatoDetalle.habilidades.length > 0 && (<div className="border-t pt-4"><h5 className="font-semibold text-gray-800 mb-2">Habilidades técnicas</h5><div className="flex flex-wrap gap-2">{candidatoDetalle.habilidades.map((h, i) => <span key={i} className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{h}</span>)}</div></div>)}
                            <div className="border-t pt-4"><h5 className="font-semibold text-gray-800 mb-2">Carta de motivación</h5><div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto"><p className="text-sm text-gray-700 whitespace-pre-wrap">{candidatoDetalle.cartaMotivacion || "No proporcionó carta de motivación."}</p></div></div>
                            <div className="border-t pt-4"><h5 className="font-semibold text-gray-800 mb-2">Detalles de la postulación</h5><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500">Expectativa salarial</p><p className="font-semibold">{candidatoDetalle.expectativaSalarial || "—"}</p></div><div><p className="text-gray-500">Disponibilidad</p><p className="font-semibold">{candidatoDetalle.disponibilidad || "—"}</p></div><div><p className="text-gray-500">Fecha de postulación</p><p className="font-semibold">{new Date(candidatoDetalle.fecha).toLocaleDateString("es-CO")}</p></div></div></div>
                            {/* Botón liberar (solo si el estudiante está contratado y la empresa es la misma) */}
                            {/* Botón liberar (solo si el estudiante está contratado y la empresa es la misma) */}
                            {candidatoDetalle.contratado && candidatoDetalle.empresaContratante === empresaNombre && (
                                <div className="border-t pt-4">
                                    <button
                                        onClick={async () => {
                                            // Validar que perfilId exista
                                            if (!candidatoDetalle.perfilId) {
                                                alert("Error: no se encontró el identificador del perfil del estudiante.");
                                                return;
                                            }
                                            if (confirm(`¿Liberar a ${candidatoDetalle.nombre} para que pueda postularse nuevamente?`)) {
                                                const token = localStorage.getItem("token");
                                                // ✅ VALIDACIÓN CLAVE: si no hay token, no continuar
                                                if (!token) {
                                                    alert("No se encontró la sesión. Por favor, inicia sesión nuevamente.");
                                                    return;
                                                }
                                                try {
                                                    const res = await fetch(`${API_URLS.perfiles}/perfiles/liberar/${candidatoDetalle.perfilId}`, {
                                                        method: "PATCH",
                                                        headers: authHeaders(token), // ahora TypeScript sabe que token es string
                                                        body: JSON.stringify({ empresaNombre: empresaNombre })
                                                    });
                                                    if (res.ok) {
                                                        alert("Estudiante liberado correctamente");
                                                        setCandidatoDetalle(null);
                                                        if (vacanteSeleccionada) fetchPostulados(vacanteSeleccionada);
                                                    } else {
                                                        const data = await res.json();
                                                        alert(data.message || "Error al liberar");
                                                    }
                                                } catch (error) {
                                                    console.error(error);
                                                    alert("Error de conexión");
                                                }
                                            }
                                        }}
                                        className="w-full text-center text-sm font-semibold text-red-600 border border-red-200 rounded-lg py-2 bg-red-50 hover:bg-red-100 transition-colors"
                                    >
                                        Liberar estudiante (finalizó práctica)
                                    </button>
                                </div>
                            )}
                            <div className="flex justify-end pt-4"><button onClick={() => setCandidatoDetalle(null)} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Volver</button></div>
                        </div>
                    </div>
                </div>
            )}

            <footer className="border-t border-gray-200 bg-white py-5 px-8 flex flex-col md:flex-row justify-between items-center gap-3 mt-auto">
                <span className="text-sm font-bold" style={{ color: "#0d1c32" }}>Empleo<span style={{ color: "#f97316" }}>Uni</span></span>
                <p className="text-xs text-gray-400">© 2024 EmpleoUni - Talento Universitario Colombiano</p>
                <div className="flex gap-4 text-xs text-gray-400"><a href="#" className="hover:text-gray-700">Contacto</a><a href="#" className="hover:text-gray-700">Términos</a><a href="#" className="hover:text-gray-700">Privacidad</a></div>
            </footer>
        </div>
    );
}