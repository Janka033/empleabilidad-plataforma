"use client";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Vacante {
    id: string; titulo: string; empresa: string;
    modalidad: string; tipo: string; ciudad: string;
    area: string; salario?: string; activa: boolean;
    descripcion?: string; requisitos?: string[];
}
interface Postulado {
    id: string; vacanteId: string;
    nombre: string; email: string;
    universidad?: string; programa?: string; semestre?: number;
    habilidades?: string[]; completitud: number;
    cartaMotivacion: string; expectativaSalarial: string;
    disponibilidad: string; estado: string; fecha: string;
    contratado?: boolean; empresaContratante?: string; perfilId?: string;
}
interface Notificacion {
    id: string; tipo: string; titulo: string;
    mensaje: string; leida: boolean; created_at: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const MODALIDADES = ["Presencial", "Remoto", "Híbrido"];
const TIPOS       = ["Práctica", "Tiempo completo", "Medio tiempo"];
const EMPTY_FORM  = {
    titulo: "", empresa: "", descripcion: "", modalidad: "",
    tipo: "", ciudad: "", area: "", salario: "", requisitos: "",
};

const ESTADOS = [
    { value: "enviada",    label: "Enviada",    style: "bg-gray-100 text-gray-600"      },
    { value: "vista",      label: "Vista",      style: "bg-amber-50 text-amber-700"     },
    { value: "entrevista", label: "En proceso", style: "bg-blue-50 text-blue-700"       },
    { value: "aceptada",   label: "Aceptada",   style: "bg-emerald-50 text-emerald-700" },
];
const ESTADO_ICON: Record<string, string> = {
    enviada: "schedule", vista: "visibility", entrevista: "groups",
    aceptada: "check_circle", rechazada: "cancel", confirmada: "verified",
};

function estadoStyle(e: string) { return ESTADOS.find((s) => s.value === e) ?? ESTADOS[0]; }

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastMsg { id: number; msg: string; type: ToastType }

function ToastContainer({ toasts }: { toasts: ToastMsg[] }) {
    if (!toasts.length) return null;
    const colors: Record<ToastType, string> = {
        success: "bg-emerald-600", error: "bg-red-600", info: "bg-blue-600",
    };
    const icons: Record<ToastType, string> = {
        success: "check_circle", error: "error", info: "info",
    };
    return (
        <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <div key={t.id} className={`${colors[t.type]} text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse`}>
                    <span className="material-symbols-outlined text-[18px]">{icons[t.type]}</span>
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <span className="material-symbols-outlined text-[22px] text-white">{icon}</span>
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function EmpresaDashboard() {
    const router = useRouter();

    // Estado general
    const [vacantes,            setVacantes]            = useState<Vacante[]>([]);
    const [loading,             setLoading]             = useState(true);
    const [empresaNombre,       setEmpresaNombre]       = useState("");

    // Formulario crear/editar
    const [showForm,            setShowForm]            = useState(false);
    const [editingVacante,      setEditingVacante]      = useState<Vacante | null>(null); // null = crear
    const [form,                setForm]                = useState<Record<string, string>>(EMPTY_FORM);
    const [formLoading,         setFormLoading]         = useState(false);
    const [formError,           setFormError]           = useState("");

    // Panel candidatos
    const [vacanteSeleccionada, setVacanteSeleccionada] = useState<Vacante | null>(null);
    const [postulados,          setPostulados]          = useState<Postulado[]>([]);
    const [postuladosLoading,   setPostuladosLoading]   = useState(false);
    const [updatingEstado,      setUpdatingEstado]      = useState<Record<string, boolean>>({});
    const [candidatosPage,      setCandidatosPage]      = useState(1);
    const [candidatoDetalle,    setCandidatoDetalle]    = useState<Postulado | null>(null);
    const candidatosPorPagina = 2;

    // Notificaciones
    const [notificaciones,   setNotificaciones]   = useState<Notificacion[]>([]);
    const [noLeidas,         setNoLeidas]         = useState(0);
    const [showNotifPanel,   setShowNotifPanel]   = useState(false);

    // Toasts
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const toastId = useRef(0);
    const [modalAceptar, setModalAceptar] = useState<{
        postulacionId: string; nombre: string;
    } | null>(null);

    const addToast = useCallback((msg: string, type: ToastType = "success") => {
        const id = ++toastId.current;
        setToasts((prev) => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    }, []);

    // ── Stats derivadas ────────────────────────────────────────────────────────
    const vacantesActivas = vacantes.filter((v) => v.activa).length;
    const totalPostulaciones = postulados.length;
    const postulacionesPendientes = postulados.filter((p) => p.estado === "enviada").length;

    // ── Fetch vacantes (solo de esta empresa) ─────────────────────────────────
    const fetchVacantes = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            // El backend filtra automáticamente por empresa_id desde el token JWT
            const res = await fetch(`${API_URLS.vacantes}/vacantes`, {
                headers: authHeaders(token),
            });
            if (res.status === 401) { router.push("/login"); return; }
            const data = await res.json();
            setVacantes(data.vacantes || []);
        } catch {
            addToast("Error al cargar vacantes", "error");
        } finally {
            setLoading(false);
        }
    }, [router, addToast]);

    // ── Fetch notificaciones ──────────────────────────────────────────────────
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
        } catch { /* silencioso */ }
    }, []);

    // ── Efectos de inicialización ─────────────────────────────────────────────
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
        } catch { /* ok */ }
    }, [router]);

    useEffect(() => {
        fetchVacantes();
        fetchNotificaciones();
        const interval = setInterval(fetchNotificaciones, 30000);
        return () => clearInterval(interval);
    }, [fetchVacantes, fetchNotificaciones]);

    // ── Postulados ─────────────────────────────────────────────────────────────
    const fetchPostulados = async (vacante: Vacante) => {
        setVacanteSeleccionada(vacante);
        setPostulados([]);
        setPostuladosLoading(true);
        setCandidatosPage(1);
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones/vacante/${vacante.id}`, {
                headers: authHeaders(token),
            });
            if (res.ok) setPostulados(await res.json());
        } catch {
            addToast("Error al cargar candidatos", "error");
        } finally { setPostuladosLoading(false); }
    };

    // ── Cambiar estado candidato ──────────────────────────────────────────────
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
                setPostulados((prev) => prev.map((p) =>
                    p.id === postulacionId ? { ...p, estado: nuevoEstado } : p
                ));
                const label = ESTADOS.find((e) => e.value === nuevoEstado)?.label ?? nuevoEstado;
                addToast(`Estado actualizado: ${label}`);
            } else {
                addToast("No se pudo actualizar el estado", "error");
            }
        } catch { addToast("Error de conexión", "error"); }
        finally { setUpdatingEstado((prev) => ({ ...prev, [postulacionId]: false })); }
    };

    // ── Crear vacante ──────────────────────────────────────────────────────────
    const abrirFormCrear = () => {
        setEditingVacante(null);
        setForm({ ...EMPTY_FORM, empresa: empresaNombre });
        setFormError("");
        setShowForm(true);
        setVacanteSeleccionada(null);
    };

    // ── Editar vacante ─────────────────────────────────────────────────────────
    const abrirFormEditar = (vac: Vacante) => {
        setEditingVacante(vac);
        setForm({
            titulo:      vac.titulo,
            empresa:     vac.empresa,
            descripcion: vac.descripcion || "",
            modalidad:   vac.modalidad,
            tipo:        vac.tipo,
            ciudad:      vac.ciudad,
            area:        vac.area,
            salario:     vac.salario || "",
            requisitos:  (vac.requisitos || []).join(", "),
        });
        setFormError("");
        setShowForm(true);
        setVacanteSeleccionada(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setFormError("");
    };

    const handleGuardarVacante = async (e: React.FormEvent) => {
        e.preventDefault();
        const { titulo, empresa, descripcion, modalidad, tipo, ciudad, area } = form;
        if (!titulo || !empresa || !descripcion || !modalidad || !tipo || !ciudad || !area) {
            setFormError("Completa todos los campos obligatorios.");
            return;
        }
        setFormLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        const body = JSON.stringify({
            titulo, empresa, descripcion, modalidad, tipo, ciudad, area,
            salario: form.salario || undefined,
            requisitos: form.requisitos
                ? form.requisitos.split(",").map((r) => r.trim()).filter(Boolean)
                : [],
        });

        try {
            const isEdit = !!editingVacante;
            const url    = isEdit
                ? `${API_URLS.vacantes}/vacantes/${editingVacante!.id}`
                : `${API_URLS.vacantes}/vacantes`;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, { method, headers: authHeaders(token), body });
            const data = await res.json();
            if (!res.ok) { setFormError(data.message || "Error al guardar."); return; }

            addToast(isEdit ? `Vacante "${data.titulo}" actualizada.` : `Vacante "${data.titulo}" publicada.`);
            setShowForm(false);
            setEditingVacante(null);
            fetchVacantes();
        } catch { setFormError("Error de conexión."); }
        finally { setFormLoading(false); }
    };

    // ── Notificaciones ─────────────────────────────────────────────────────────
    const handleMarcarNotifLeida = async (id: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        await fetch(`${API_URLS.perfiles}/notificaciones/${id}/leer`, {
            method: "PATCH", headers: authHeaders(token),
        });
        setNotificaciones((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
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

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
            <ToastContainer toasts={toasts} />

            {/* ── Navbar ── */}
            <nav className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 md:px-8 fixed top-0 w-full z-50">
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
                    {/* Campana */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifPanel((v) => !v)}
                            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[22px] text-gray-600">notifications</span>
                            {noLeidas > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#f97316" }}>
                  {noLeidas > 9 ? "9+" : noLeidas}
                </span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <div className="absolute right-0 top-12 w-80 md:w-96 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                    <h3 className="font-semibold text-gray-900 text-sm">Notificaciones</h3>
                                    {noLeidas > 0 && (
                                        <button onClick={handleMarcarTodasLeidas} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
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

            {/* ── Main ── */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-12 flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel de Empresa</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Gestiona tus vacantes y revisa los candidatos</p>
                    </div>
                    <button
                        onClick={abrirFormCrear}
                        className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 shadow-sm w-fit"
                        style={{ backgroundColor: "#0d1c32" }}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nueva vacante
                    </button>
                </div>

                {/* ── Stats cards ── */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon="work"          label="Vacantes activas"       value={vacantesActivas}          color="bg-[#0d1c32]" />
                        <StatCard icon="folder_shared" label="Total vacantes"         value={vacantes.length}          color="bg-indigo-500" />
                        <StatCard icon="group"         label="Candidatos (vista)"     value={totalPostulaciones}       color="bg-[#f97316]" />
                        <StatCard icon="schedule"      label="Pendientes de revisión" value={postulacionesPendientes}  color="bg-amber-500" />
                    </div>
                )}

                {/* ── Formulario crear/editar ── */}
                {showForm && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-gray-900">
                                {editingVacante ? `Editar: ${editingVacante.titulo}` : "Publicar nueva vacante"}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingVacante(null); }} className="text-gray-400 hover:text-gray-700">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {formError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                                <span className="material-symbols-outlined text-[16px]">error</span>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleGuardarVacante} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { name: "titulo",    label: "Título del cargo",          placeholder: "Ej: Desarrollador Frontend Junior", req: true  },
                                    { name: "empresa",   label: "Nombre de la empresa",      placeholder: "Ej: TechCorp S.A.S.",              req: true  },
                                    { name: "ciudad",    label: "Ciudad",                    placeholder: "Ej: Armenia, Quindío",             req: true  },
                                    { name: "area",      label: "Área",                      placeholder: "Ej: Tecnología",                   req: true  },
                                    { name: "salario",   label: "Salario (opcional)",        placeholder: "Ej: $1.500.000 - $2.000.000",     req: false },
                                    { name: "requisitos",label: "Requisitos (separados por ,)", placeholder: "Ej: React, Node.js, Git",       req: false },
                                ].map((f) => (
                                    <div key={f.name} className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">
                                            {f.label}{f.req && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <input
                                            name={f.name} value={form[f.name]} onChange={handleFormChange}
                                            placeholder={f.placeholder} required={f.req}
                                            className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-500 transition-colors"
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
                                <button type="button" onClick={() => { setShowForm(false); setEditingVacante(null); }}
                                        className="px-5 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={formLoading}
                                        className="px-6 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                                        style={{ backgroundColor: editingVacante ? "#f97316" : "#0d1c32" }}>
                                    {formLoading
                                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                                        : <><span className="material-symbols-outlined text-[16px]">{editingVacante ? "save" : "publish"}</span>{editingVacante ? "Guardar cambios" : "Publicar"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── Layout dos columnas ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-6 items-start">

                    {/* Lista de vacantes */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            Mis vacantes
                            {!loading && (
                                <span className="ml-2 font-normal normal-case text-gray-400">({vacantes.length})</span>
                            )}
                        </h2>

                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : vacantes.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center py-16 gap-3">
                                <span className="material-symbols-outlined text-[40px] text-gray-300">work_outline</span>
                                <p className="text-sm text-gray-400">Aún no has publicado vacantes.</p>
                                <button onClick={abrirFormCrear}
                                        className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2"
                                        style={{ backgroundColor: "#0d1c32" }}>
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Crear primera vacante
                                </button>
                            </div>
                        ) : (
                            vacantes.map((vac) => (
                                <div key={vac.id}
                                     className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all ${
                                         vacanteSeleccionada?.id === vac.id
                                             ? "border-gray-900 ring-1 ring-gray-900"
                                             : "border-gray-200"
                                     }`}
                                >
                                    {/* Fila superior */}
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
                                        }`}>
                      {vac.activa ? "Activa" : "Inactiva"}
                    </span>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{vac.modalidad}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{vac.tipo}</span>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                        <button
                                            onClick={() => fetchPostulados(vac)}
                                            className="flex-1 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 py-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">group</span>
                                            Ver candidatos
                                        </button>
                                        <button
                                            onClick={() => abrirFormEditar(vac)}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Panel candidatos */}
                    <div className="flex flex-col gap-3 lg:sticky lg:top-20">
                        {!vacanteSeleccionada ? (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center py-20 gap-3">
                                <span className="material-symbols-outlined text-[48px] text-gray-300">person_search</span>
                                <p className="text-sm text-gray-400 text-center px-8">
                                    Selecciona una vacante para ver los candidatos
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                        Candidatos:{" "}
                                        <span className="text-gray-900 normal-case font-bold">{vacanteSeleccionada.titulo}</span>
                                    </h2>
                                    <button onClick={() => { setVacanteSeleccionada(null); setPostulados([]); }}
                                            className="text-gray-400 hover:text-gray-700">
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>

                                {/* Resumen de estados */}
                                {!postuladosLoading && postulados.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: "Pendientes", count: postulados.filter(p => p.estado === "enviada").length,    color: "bg-gray-100 text-gray-700"      },
                                            { label: "En proceso", count: postulados.filter(p => p.estado === "entrevista").length, color: "bg-blue-50 text-blue-700"       },
                                            { label: "Aceptados",  count: postulados.filter(p => p.estado === "aceptada").length,   color: "bg-emerald-50 text-emerald-700" },
                                        ].map(({ label, count, color }) => (
                                            <div key={label} className={`${color} rounded-xl px-3 py-2 text-center`}>
                                                <p className="text-lg font-bold">{count}</p>
                                                <p className="text-xs">{label}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

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
                                    <div className="flex flex-col gap-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {postulados
                                                .slice((candidatosPage - 1) * candidatosPorPagina, candidatosPage * candidatosPorPagina)
                                                .map((p) => {
                                                    const eInfo   = estadoStyle(p.estado);
                                                    const isLocked = p.contratado || p.estado === "aceptada" || p.estado === "confirmada";
                                                    const barColor = {
                                                        aceptada: "bg-emerald-500", confirmada: "bg-purple-500",
                                                        rechazada: "bg-red-500", entrevista: "bg-blue-500",
                                                        vista: "bg-amber-500",
                                                    }[p.estado] ?? "bg-gray-300";

                                                    return (
                                                        <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                                            <div className={`h-1.5 w-full ${barColor}`} />
                                                            <div className="p-4 flex flex-col gap-3">
                                                                {/* Avatar + nombre */}
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                                                        <span className="font-bold text-gray-700">{p.nombre?.charAt(0).toUpperCase()}</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <p className="font-bold text-gray-900 text-sm">{p.nombre}</p>
                                                                            {p.contratado && (
                                                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                          Contratado
                                        </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 truncate">{p.email}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Select de estado */}
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-semibold text-gray-500 shrink-0">Estado:</span>
                                                                    <div className="relative flex-1">
                                                                        <select
                                                                            value={p.estado}
                                                                            disabled={updatingEstado[p.id] || isLocked}
                                                                            onChange={(e) => {
                                                                                const nuevoEstado = e.target.value;
                                                                                if (nuevoEstado === "aceptada") {
                                                                                    setModalAceptar({ postulacionId: p.id, nombre: p.nombre });
                                                                                    return;
                                                                                }
                                                                                handleCambiarEstado(p.id, nuevoEstado);
                                                                            }}
                                                                            className={`w-full text-xs font-semibold pl-7 pr-5 py-1.5 rounded-full border-0 cursor-pointer appearance-none ${eInfo.style} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                                                                        >
                                                                            {/* Si el estado actual NO está en las 4 opciones, lo mostramos como opción deshabilitada */}
                                                                            {!ESTADOS.find(s => s.value === p.estado) && (
                                                                                <option value={p.estado} disabled>
                                                                                    {estadoStyle(p.estado).label}
                                                                                </option>
                                                                            )}
                                                                            {ESTADOS.map((s) => (
                                                                                <option key={s.value} value={s.value}>{s.label}</option>
                                                                            ))}
                                                                        </select>
                                                                        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[13px] pointer-events-none">
                                      {ESTADO_ICON[p.estado] ?? "schedule"}
                                    </span>
                                                                        {updatingEstado[p.id] && (
                                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Datos académicos */}
                                                                <div className="grid grid-cols-2 gap-1.5 text-xs">
                                                                    {p.universidad && (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-[13px] text-gray-400">school</span>
                                                                            <span className="text-gray-700 truncate">{p.universidad}</span>
                                                                        </div>
                                                                    )}
                                                                    {p.semestre && (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-[13px] text-gray-400">calendar_month</span>
                                                                            <span className="text-gray-700">Sem. {p.semestre}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[13px] text-gray-400">star</span>
                                                                        <span className="text-gray-700">Perfil {p.completitud}%</span>
                                                                    </div>
                                                                </div>

                                                                {/* Habilidades */}
                                                                {p.habilidades && p.habilidades.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {p.habilidades.slice(0, 5).map((h, i) => (
                                                                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{h}</span>
                                                                        ))}
                                                                        {p.habilidades.length > 5 && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">+{p.habilidades.length - 5}</span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Carta */}
                                                                <div className="bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Carta</p>
                                                                    <p className="text-xs text-gray-700 line-clamp-2">
                                                                        {p.cartaMotivacion?.replace(/\\r\\n|\\n|\\r/g, " ").trim() || "—"}
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    onClick={() => setCandidatoDetalle(p)}
                                                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors"
                                                                >
                                                                    Ver perfil completo
                                                                </button>

                                                                {/* Footer: salario + fecha */}
                                                                <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-2">
                                                                    <span>{p.expectativaSalarial || "—"}</span>
                                                                    <span>{new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        {/* Paginación */}
                                        {postulados.length > candidatosPorPagina && (
                                            <div className="flex justify-center items-center gap-3">
                                                <button
                                                    onClick={() => setCandidatosPage((p) => Math.max(1, p - 1))}
                                                    disabled={candidatosPage === 1}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Anterior
                                                </button>
                                                <span className="text-xs text-gray-500">
                          {candidatosPage} / {Math.ceil(postulados.length / candidatosPorPagina)}
                        </span>
                                                <button
                                                    onClick={() => setCandidatosPage((p) => Math.min(Math.ceil(postulados.length / candidatosPorPagina), p + 1))}
                                                    disabled={candidatosPage === Math.ceil(postulados.length / candidatosPorPagina)}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Siguiente
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* ── Modal detalle candidato ── */}
            {candidatoDetalle && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Perfil del candidato</h3>
                            <button onClick={() => setCandidatoDetalle(null)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-5">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900">{candidatoDetalle.nombre}</h4>
                                <p className="text-gray-500">{candidatoDetalle.email}</p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Estado de postulación</p>
                                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${estadoStyle(candidatoDetalle.estado).style}`}>
                  {estadoStyle(candidatoDetalle.estado).label}
                </span>
                            </div>

                            <div className="border-t pt-4">
                                <h5 className="font-semibold text-gray-800 mb-3">Información académica</h5>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        ["school",         candidatoDetalle.universidad || "No especificada"],
                                        ["menu_book",      candidatoDetalle.programa    || "No especificado"],
                                        ["calendar_month", `Semestre ${candidatoDetalle.semestre || "?"}`],
                                        ["star",           `Perfil ${candidatoDetalle.completitud}% completo`],
                                    ].map(([icon, val]) => (
                                        <div key={icon} className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-gray-400 text-[18px]">{icon}</span>
                                            <span className="text-gray-700">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {candidatoDetalle.habilidades && candidatoDetalle.habilidades.length > 0 && (
                                <div className="border-t pt-4">
                                    <h5 className="font-semibold text-gray-800 mb-2">Habilidades</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {candidatoDetalle.habilidades.map((h, i) => (
                                            <span key={i} className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{h}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="border-t pt-4">
                                <h5 className="font-semibold text-gray-800 mb-2">Carta de motivación</h5>
                                <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {candidatoDetalle.cartaMotivacion || "No proporcionó carta de motivación."}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h5 className="font-semibold text-gray-800 mb-3">Detalles de postulación</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="text-gray-500">Expectativa salarial</p><p className="font-semibold">{candidatoDetalle.expectativaSalarial || "—"}</p></div>
                                    <div><p className="text-gray-500">Disponibilidad</p><p className="font-semibold">{candidatoDetalle.disponibilidad || "—"}</p></div>
                                    <div><p className="text-gray-500">Fecha</p><p className="font-semibold">{new Date(candidatoDetalle.fecha).toLocaleDateString("es-CO")}</p></div>
                                </div>
                            </div>

                            {/* Liberar estudiante */}
                            {candidatoDetalle.contratado && candidatoDetalle.empresaContratante === empresaNombre && (
                                <div className="border-t pt-4">
                                    <button
                                        onClick={async () => {
                                            if (!candidatoDetalle.perfilId) { addToast("No se encontró el perfil", "error"); return; }
                                            const token = localStorage.getItem("token");
                                            if (!token) return;
                                            try {
                                                const res = await fetch(`${API_URLS.perfiles}/perfiles/liberar/${candidatoDetalle.perfilId}`, {
                                                    method: "PATCH",
                                                    headers: authHeaders(token),
                                                    body: JSON.stringify({ empresaNombre }),
                                                });
                                                if (res.ok) {
                                                    addToast("Estudiante liberado correctamente");
                                                    setCandidatoDetalle(null);
                                                    if (vacanteSeleccionada) fetchPostulados(vacanteSeleccionada);
                                                } else {
                                                    const d = await res.json();
                                                    addToast(d.message || "Error al liberar", "error");
                                                }
                                            } catch { addToast("Error de conexión", "error"); }
                                        }}
                                        className="w-full text-sm font-semibold text-red-600 border border-red-200 rounded-lg py-2 bg-red-50 hover:bg-red-100 transition-colors"
                                    >
                                        Liberar estudiante (finalizó práctica)
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button onClick={() => setCandidatoDetalle(null)}
                                        className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Modal aceptar candidato ── */}
            <ConfirmModal
                show={!!modalAceptar}
                tipo="warning"
                titulo="Aceptar candidato"
                mensaje={`¿Estas seguro de aceptar a ${modalAceptar?.nombre}? Se le notificara y podra confirmar su practica.`}
                labelConfirm="Aceptar"
                onConfirm={() => {
                    if (modalAceptar) handleCambiarEstado(modalAceptar.postulacionId, "aceptada");
                    setModalAceptar(null);
                }}
                onCancel={() => setModalAceptar(null)}
            />



            {/* Footer */}
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