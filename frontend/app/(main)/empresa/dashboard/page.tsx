"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../../lib/api";

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
    const [form,                setForm]                = useState(EMPTY_FORM);
    const [formLoading,         setFormLoading]         = useState(false);
    const [formError,           setFormError]           = useState("");
    const [successMsg,          setSuccessMsg]          = useState("");
    const [empresaNombre,       setEmpresaNombre]       = useState("");
    const [vacanteSeleccionada, setVacanteSeleccionada] = useState<Vacante | null>(null);
    const [postulados,          setPostulados]          = useState<Postulado[]>([]);
    const [postuladosLoading,   setPostuladosLoading]   = useState(false);
    const [updatingEstado,      setUpdatingEstado]      = useState<Record<string, boolean>>({});

    // Notificaciones
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

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            if (payload.rol !== "empresa") { router.push("/vacantes"); return; }
        } catch { router.push("/login"); return; }
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            setEmpresaNombre(user.nombre || "");
        } catch {}
        fetchVacantes();
        fetchNotificaciones();
        // Poll cada 30 segundos
        const interval = setInterval(fetchNotificaciones, 30000);
        return () => clearInterval(interval);
    }, [router, fetchVacantes, fetchNotificaciones]);

    const fetchPostulados = async (vacante: Vacante) => {
        setVacanteSeleccionada(vacante); setPostulados([]); setPostuladosLoading(true);
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
                // Si fue aceptado, marcar en la vista como contratado
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
        setForm({ ...form, [e.target.name]: e.target.value }); setFormError("");
    };

    const handleCrearVacante = async (e: React.FormEvent) => {
        e.preventDefault();
        const { titulo, empresa, descripcion, modalidad, tipo, ciudad, area } = form;
        if (!titulo || !empresa || !descripcion || !modalidad || !tipo || !ciudad || !area) {
            setFormError("Completa todos los campos obligatorios."); return;
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

            {/* Navbar */}
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
                    {/* Campana notificaciones */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifPanel((v) => !v)}
                            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[22px] text-gray-600">notifications</span>
                            {noLeidas > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                                      style={{ backgroundColor: "#f97316" }}>
                                    {noLeidas > 9 ? "9+" : noLeidas}
                                </span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                    <h3 className="font-semibold text-gray-900 text-sm">Notificaciones</h3>
                                    {noLeidas > 0 && (
                                        <button onClick={handleMarcarTodasLeidas}
                                                className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                                            Marcar todas leídas
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                                    {notificaciones.length === 0 ? (
                                        <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                                            <span className="material-symbols-outlined text-[32px]">notifications_none</span>
                                            <p className="text-sm">Sin notificaciones</p>
                                        </div>
                                    ) : (
                                        notificaciones.map((n) => (
                                            <button key={n.id} onClick={() => handleMarcarNotifLeida(n.id)}
                                                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.leida ? "bg-orange-50" : ""}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[16px] text-blue-600">person_add</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-semibold ${!n.leida ? "text-gray-900" : "text-gray-600"}`}>{n.titulo}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">
                                                            {new Date(n.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                        </p>
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

                    <button
                        onClick={() => { localStorage.clear(); document.cookie = "token=; path=/; max-age=0"; router.push("/login"); }}
                        className="text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90"
                        style={{ backgroundColor: "#0d1c32" }}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-20 pb-12 flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mis Vacantes</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Gestiona tus vacantes y revisa los candidatos</p>
                    </div>
                    <button
                        onClick={() => { setForm({ ...EMPTY_FORM, empresa: empresaNombre }); setFormError(""); setShowForm(true); setVacanteSeleccionada(null); }}
                        className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 shadow-sm"
                        style={{ backgroundColor: "#0d1c32" }}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nueva vacante
                    </button>
                </div>

                {successMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                        {successMsg}
                    </div>
                )}

                {/* Formulario nueva vacante */}
                {showForm && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-gray-900">Publicar nueva vacante</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{formError}</div>}
                        <form onSubmit={handleCrearVacante} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { name: "titulo",     label: "Título del cargo",             placeholder: "Ej: Desarrollador Frontend Junior", req: true  },
                                    { name: "empresa",    label: "Nombre de la empresa",         placeholder: "Ej: TechCorp S.A.S.",              req: true  },
                                    { name: "ciudad",     label: "Ciudad",                       placeholder: "Ej: Armenia, Quindío",             req: true  },
                                    { name: "area",       label: "Área",                         placeholder: "Ej: Tecnología",                   req: true  },
                                    { name: "salario",    label: "Salario (opcional)",           placeholder: "Ej: $1.500.000 - $2.000.000",      req: false },
                                    { name: "requisitos", label: "Requisitos (separados por ,)", placeholder: "Ej: React, Node.js, Git",          req: false },
                                ].map((f) => (
                                    <div key={f.name} className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">
                                            {f.label}{f.req && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <input
                                            name={f.name} value={(form as any)[f.name]} onChange={handleFormChange}
                                            placeholder={f.placeholder} required={f.req}
                                            className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500"
                                        />
                                    </div>
                                ))}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Modalidad <span className="text-red-500">*</span></label>
                                    <select name="modalidad" value={form.modalidad} onChange={handleFormChange} required
                                            className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500">
                                        <option value="">Selecciona modalidad</option>
                                        {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Tipo <span className="text-red-500">*</span></label>
                                    <select name="tipo" value={form.tipo} onChange={handleFormChange} required
                                            className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500">
                                        <option value="">Selecciona tipo</option>
                                        {TIPOS.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-gray-700">Descripción <span className="text-red-500">*</span></label>
                                <textarea name="descripcion" value={form.descripcion} onChange={handleFormChange}
                                          placeholder="Describe las responsabilidades y lo que aprenderá el estudiante..." required rows={3}
                                          className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500 resize-none" />
                            </div>
                            <div className="flex justify-end gap-3 pt-1">
                                <button type="button" onClick={() => setShowForm(false)}
                                        className="px-5 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={formLoading}
                                        className="px-6 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                                        style={{ backgroundColor: "#0d1c32" }}>
                                    {formLoading
                                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Publicando...</>
                                        : <><span className="material-symbols-outlined text-[16px]">publish</span>Publicar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Grid principal */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* Lista de vacantes */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            Vacantes publicadas
                            {!loading && <span className="ml-2 font-normal normal-case text-gray-400">({vacantes.length})</span>}
                        </h2>
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : vacantes.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center py-16 gap-3">
                                <span className="material-symbols-outlined text-[40px] text-gray-300">work_outline</span>
                                <p className="text-sm text-gray-400">Aún no has publicado vacantes.</p>
                            </div>
                        ) : (
                            vacantes.map((vac) => (
                                <button
                                    key={vac.id} onClick={() => fetchPostulados(vac)}
                                    className={`text-left bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                        vacanteSeleccionada?.id === vac.id
                                            ? "border-gray-900 ring-1 ring-gray-900"
                                            : "border-gray-200"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-white text-sm"
                                             style={{ backgroundColor: "#0d1c32" }}>
                                            {vac.empresa.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-gray-900 truncate">{vac.titulo}</p>
                                            <p className="text-xs text-gray-500 truncate">{vac.empresa} · {vac.ciudad}</p>
                                        </div>
                                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                                            vac.activa ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                                        }`}>{vac.activa ? "Activa" : "Inactiva"}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{vac.modalidad}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{vac.tipo}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">group</span>
                                        Ver candidatos
                                    </p>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Panel candidatos */}
                    <div className="flex flex-col gap-3 lg:sticky lg:top-20">
                        {!vacanteSeleccionada ? (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center py-20 gap-3">
                                <span className="material-symbols-outlined text-[48px] text-gray-300">person_search</span>
                                <p className="text-sm text-gray-400 text-center px-8">
                                    Selecciona una vacante de la izquierda para ver los candidatos
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                        Candidatos: <span className="text-gray-900 normal-case font-bold">{vacanteSeleccionada.titulo}</span>
                                    </h2>
                                    <button onClick={() => { setVacanteSeleccionada(null); setPostulados([]); }}
                                            className="text-gray-400 hover:text-gray-700">
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>

                                {postuladosLoading ? (
                                    <div className="flex justify-center py-16">
                                        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : postulados.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center py-14 gap-2">
                                        <span className="material-symbols-outlined text-[36px] text-gray-300">inbox</span>
                                        <p className="text-sm text-gray-400">Ningún candidato aún.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                                        {postulados.map((p) => {
                                            const eInfo = estadoStyle(p.estado);
                                            return (
                                                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                    <div className={`h-1 w-full ${
                                                        p.estado === "aceptada"   ? "bg-emerald-400" :
                                                            p.estado === "rechazada"  ? "bg-red-400"     :
                                                                p.estado === "entrevista" ? "bg-blue-400"    :
                                                                    p.estado === "vista"      ? "bg-amber-400"   :
                                                                        "bg-gray-200"
                                                    }`} />

                                                    <div className="p-5 flex flex-col gap-4">
                                                        {/* Cabecera candidato */}
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                                                <span className="font-bold text-gray-600 text-sm">{p.nombre?.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-semibold text-gray-900 text-sm truncate">{p.nombre}</p>
                                                                    {/* Badge "ya tiene empresa" */}
                                                                    {p.contratado && (
                                                                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                                                            <span className="material-symbols-outlined text-[11px]">warning</span>
                                                                            Ya tiene empresa
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-gray-500 truncate">{p.email}</p>
                                                            </div>
                                                        </div>

                                                        {/* Selector de estado */}
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs font-semibold text-gray-500 shrink-0">Estado:</label>
                                                            <div className="relative flex-1">
                                                                <select
                                                                    value={p.estado}
                                                                    disabled={updatingEstado[p.id] || p.contratado}
                                                                    onChange={(e) => handleCambiarEstado(p.id, e.target.value)}
                                                                    className={`w-full text-xs font-semibold pl-7 pr-6 py-1.5 rounded-full border-0 outline-none cursor-pointer appearance-none ${eInfo.style} ${
                                                                        (updatingEstado[p.id] || p.contratado) ? "opacity-50 cursor-not-allowed" : ""
                                                                    }`}
                                                                >
                                                                    {ESTADOS.map((s) => (
                                                                        <option key={s.value} value={s.value}>{s.label}</option>
                                                                    ))}
                                                                </select>
                                                                <span className="material-symbols-outlined absolute left-1.5 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none">
                                                                    {ESTADO_ICON[p.estado] ?? "schedule"}
                                                                </span>
                                                                {updatingEstado[p.id]
                                                                    ? <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                                    : <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none">expand_more</span>
                                                                }
                                                            </div>
                                                        </div>

                                                        {/* Datos académicos */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {[
                                                                { icon: "school",         val: p.universidad },
                                                                { icon: "menu_book",      val: p.programa    },
                                                                { icon: "calendar_month", val: p.semestre ? `Semestre ${p.semestre}` : null },
                                                                { icon: "star",           val: `Perfil ${p.completitud}% completo` },
                                                            ].filter((r) => r.val).map(({ icon, val }) => (
                                                                <div key={icon} className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                    <span className="material-symbols-outlined text-[14px] text-gray-400">{icon}</span>
                                                                    <span className="truncate">{val}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Habilidades */}
                                                        {p.habilidades && p.habilidades.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {p.habilidades.map((h, i) => (
                                                                    <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">{h}</span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Carta */}
                                                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3.5">
                                                            <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Carta de motivación</p>
                                                            <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
                                                                {p.cartaMotivacion?.replace(/\\r\\n|\\n|\\r/g, " ").trim() || "—"}
                                                            </p>
                                                        </div>

                                                        {/* Detalles */}
                                                        <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-3">
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                <span className="material-symbols-outlined text-[14px] text-gray-400">payments</span>
                                                                <span className="text-gray-400">Expectativa:</span>
                                                                <span className="font-semibold">{p.expectativaSalarial || "—"}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                <span className="material-symbols-outlined text-[14px] text-gray-400">event_available</span>
                                                                <span className="text-gray-400">Disponible:</span>
                                                                <span className="font-semibold">{p.disponibilidad || "—"}</span>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                                                            Postulado el{" "}
                                                            {new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            <footer className="border-t border-gray-200 bg-white py-5 px-8 flex flex-col md:flex-row justify-between items-center gap-3 mt-auto">
                <span className="text-sm font-bold" style={{ color: "#0d1c32" }}>
                    Empleo<span style={{ color: "#f97316" }}>Uni</span>
                </span>
                <p className="text-xs text-gray-400">© 2024 EmpleoUni - Talento Universitario Colombiano</p>
                <div className="flex gap-4 text-xs text-gray-400">
                    <a href="#" className="hover:text-gray-700">Contacto</a>
                    <a href="#" className="hover:text-gray-700">Términos</a>
                    <a href="#" className="hover:text-gray-700">Privacidad</a>
                </div>
            </footer>
        </div>
    );
}