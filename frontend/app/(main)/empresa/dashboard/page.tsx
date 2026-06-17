"use client";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
    contratado?: boolean; empresaContratante?: string; perfilId?: string; userId?: string;
    linkedinUrl?: string; cvUrl?: string;
}
interface Evaluacion {
    id: string; tipo: "parcial" | "final"; calificacion: number;
    observaciones?: string; evaluador?: string; created_at: string;
}
interface Convenio {
    id: string; estudiante_user_id: string; estudiante_nombre: string;
    empresa_nombre: string; vacante_id?: string; vacante_titulo?: string;
    tutor_empresarial?: string; tutor_academico?: string; modalidad?: string;
    funciones?: string; fecha_inicio?: string; fecha_fin?: string; estado: string;
    total_evaluaciones?: string; tiene_final?: string;
}
interface Entrevista {
    id: string; postulacion_id: string; estudiante_nombre: string; vacante_titulo?: string;
    tipo: "virtual" | "presencial"; enlace?: string; lugar?: string;
    fecha?: string; hora?: string; estado: string;
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

// Estados que la EMPRESA puede asignar desde el selector
const ESTADOS = [
    { value: "enviada",    label: "Enviada",                  style: "bg-slate-100 text-slate-600"  },
    { value: "vista",      label: "Vista",                    style: "bg-amber-50 text-amber-700" },
    { value: "entrevista", label: "Aceptado para entrevista", style: "bg-blue-50 text-blue-700"   },
    { value: "rechazada",  label: "No aceptado",              style: "bg-red-50 text-red-600"     },
];
// Todos los estados (para mostrar badges; aceptada/confirmada las gestiona la coordinadora)
const ESTADO_TODOS: Record<string, { label: string; style: string }> = {
    enviada:    { label: "Enviada",                  style: "bg-slate-100 text-slate-600"      },
    vista:      { label: "Vista",                    style: "bg-amber-50 text-amber-700"     },
    entrevista: { label: "Aceptado para entrevista", style: "bg-blue-50 text-blue-700"       },
    rechazada:  { label: "No aceptado",              style: "bg-red-50 text-red-600"         },
    aceptada:   { label: "Contratación solicitada",  style: "bg-emerald-50 text-emerald-700" },
    confirmada: { label: "Contratado",               style: "bg-purple-50 text-purple-700"   },
    rechazada_por_estudiante: { label: "Rechazada por el estudiante", style: "bg-red-50 text-red-600" },
};
const ESTADO_ICON: Record<string, string> = {
    enviada: "schedule", vista: "visibility", entrevista: "groups",
    aceptada: "how_to_reg", rechazada: "cancel", confirmada: "verified",
};

function estadoStyle(e: string) { return ESTADO_TODOS[e] ?? ESTADO_TODOS.enviada; }

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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <span className="material-symbols-outlined text-[22px] text-white">{icon}</span>
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
        </div>
    );
}

// ── Modal: crear convenio de práctica (RF12, HU14, CU06) ────────────────────────
function ConvenioFormModal({ candidato, vacanteTitulo, empresaNombre, onClose, onCreated }: {
    candidato: Postulado; vacanteTitulo?: string; empresaNombre: string;
    onClose: () => void; onCreated: (msg: string, type?: ToastType) => void;
}) {
    const [f, setF] = useState({
        tutorEmpresarial: "", tutorAcademico: "", modalidad: "Presencial",
        funciones: "", fechaInicio: "", fechaFin: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!f.tutorEmpresarial || !f.tutorAcademico || !f.fechaInicio || !f.fechaFin) {
            setError("Completa tutores y fechas."); return;
        }
        const token = localStorage.getItem("token");
        if (!token) return;
        setSaving(true); setError("");
        try {
            const res = await fetch(`${API_URLS.practicas}/convenios`, {
                method: "POST",
                headers: authHeaders(token),
                body: JSON.stringify({
                    estudianteUserId:   candidato.userId,
                    estudiantePerfilId: candidato.perfilId,
                    estudianteNombre:   candidato.nombre,
                    vacanteId:          candidato.vacanteId,
                    vacanteTitulo,
                    empresaNombre,
                    ...f,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Error al crear convenio"); return; }
            onCreated("Convenio de práctica creado");
            onClose();
        } catch { setError("Error de conexión"); }
        finally { setSaving(false); }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ maxWidth: "32rem" }}>
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Convenio de práctica</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={submit} className="p-6 flex flex-col gap-4">
                    <div className="bg-slate-50 rounded-xl p-3 text-sm">
                        <p className="font-semibold text-slate-900">{candidato.nombre}</p>
                        <p className="text-slate-500 text-xs">{vacanteTitulo || "Práctica profesional"}</p>
                    </div>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Tutor empresarial *</label>
                            <input value={f.tutorEmpresarial} onChange={(e) => setF({ ...f, tutorEmpresarial: e.target.value })}
                                   className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" placeholder="Nombre del tutor" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Tutor académico *</label>
                            <input value={f.tutorAcademico} onChange={(e) => setF({ ...f, tutorAcademico: e.target.value })}
                                   className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" placeholder="Nombre del tutor" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Fecha inicio *</label>
                            <input type="date" value={f.fechaInicio} onChange={(e) => setF({ ...f, fechaInicio: e.target.value })}
                                   className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Fecha fin *</label>
                            <input type="date" value={f.fechaFin} onChange={(e) => setF({ ...f, fechaFin: e.target.value })}
                                   className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Modalidad</label>
                            <select value={f.modalidad} onChange={(e) => setF({ ...f, modalidad: e.target.value })}
                                    className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-500">
                                {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Funciones / objetivos</label>
                            <textarea rows={3} value={f.funciones} onChange={(e) => setF({ ...f, funciones: e.target.value })}
                                      className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500 resize-none"
                                      placeholder="Actividades que realizará el practicante..." />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={saving}
                                className="px-6 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                                style={{ backgroundColor: "#0d1c32" }}>
                            {saving ? "Creando..." : "Crear convenio"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ── Modal: gestionar práctica y registrar evaluaciones (RF13, HU15, HU16, CU07) ──
function ConvenioGestionModal({ convenio, onClose, onChanged }: {
    convenio: Convenio; onClose: () => void; onChanged: (msg: string, type?: ToastType) => void;
}) {
    const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
    const [estado, setEstado] = useState(convenio.estado);
    const [loading, setLoading] = useState(true);
    const [ev, setEv] = useState({ tipo: "parcial", calificacion: "", observaciones: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const cargar = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const r = await fetch(`${API_URLS.practicas}/convenios/${convenio.id}`, { headers: authHeaders(token) });
            if (r.ok) {
                const data = await r.json();
                setEvaluaciones(data.evaluaciones || []);
                setEstado(data.estado);
            }
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    }, [convenio.id]);

    useEffect(() => { cargar(); }, [cargar]);

    const agregar = async (e: React.FormEvent) => {
        e.preventDefault();
        const nota = Number(ev.calificacion);
        if (isNaN(nota) || nota < 0 || nota > 5) { setError("La nota debe estar entre 0 y 5"); return; }
        const token = localStorage.getItem("token");
        if (!token) return;
        setSaving(true); setError("");
        try {
            const res = await fetch(`${API_URLS.practicas}/convenios/${convenio.id}/evaluaciones`, {
                method: "POST",
                headers: authHeaders(token),
                body: JSON.stringify({ tipo: ev.tipo, calificacion: nota, observaciones: ev.observaciones }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Error al registrar"); return; }
            setEv({ tipo: "parcial", calificacion: "", observaciones: "" });
            onChanged(ev.tipo === "final" ? "Evaluación final registrada — práctica finalizada" : "Evaluación parcial registrada");
            await cargar();
        } catch { setError("Error de conexión"); }
        finally { setSaving(false); }
    };

    const finalizado = estado === "finalizado";

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ maxWidth: "32rem" }}>
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Práctica de {convenio.estudiante_nombre}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-6 flex flex-col gap-5">
                    {/* Datos del convenio */}
                    <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-slate-500 text-xs">Tutor empresarial</p><p className="font-semibold">{convenio.tutor_empresarial || "—"}</p></div>
                        <div><p className="text-slate-500 text-xs">Tutor académico</p><p className="font-semibold">{convenio.tutor_academico || "—"}</p></div>
                        <div><p className="text-slate-500 text-xs">Modalidad</p><p className="font-semibold">{convenio.modalidad || "—"}</p></div>
                        <div><p className="text-slate-500 text-xs">Estado</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${finalizado ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"}`}>
                                {finalizado ? "Finalizada" : "Activa"}
                            </span>
                        </div>
                    </div>

                    {/* Evaluaciones registradas */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-2">Evaluaciones</h4>
                        {loading ? (
                            <p className="text-sm text-slate-400">Cargando...</p>
                        ) : evaluaciones.length === 0 ? (
                            <p className="text-sm text-slate-400">Aún no hay evaluaciones registradas.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {evaluaciones.map((e) => (
                                    <div key={e.id} className="border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.tipo === "final" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                                            {e.tipo === "final" ? "Final" : "Parcial"}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">Nota: {e.calificacion} / 5.0</p>
                                            {e.observaciones && <p className="text-xs text-slate-600 mt-0.5">{e.observaciones}</p>}
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(e.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Form nueva evaluación */}
                    {finalizado ? (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">verified</span>
                            La práctica está finalizada. El estudiante ya puede descargar su certificado.
                        </div>
                    ) : (
                        <form onSubmit={agregar} className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                            <h4 className="text-sm font-semibold text-slate-800">Registrar evaluación</h4>
                            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">{error}</div>}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-600">Tipo</label>
                                    <select value={ev.tipo} onChange={(e) => setEv({ ...ev, tipo: e.target.value })}
                                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-slate-500">
                                        <option value="parcial">Parcial</option>
                                        <option value="final">Final (cierra la práctica)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-600">Calificación (0–5)</label>
                                    <input type="number" min="0" max="5" step="0.1" value={ev.calificacion}
                                           onChange={(e) => setEv({ ...ev, calificacion: e.target.value })}
                                           className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500" placeholder="Ej: 4.5" />
                                </div>
                            </div>
                            <textarea rows={2} value={ev.observaciones} onChange={(e) => setEv({ ...ev, observaciones: e.target.value })}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500 resize-none"
                                      placeholder="Observaciones del desempeño..." />
                            <button type="submit" disabled={saving}
                                    className="self-end px-5 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60"
                                    style={{ backgroundColor: ev.tipo === "final" ? "#7c3aed" : "#0d1c32" }}>
                                {saving ? "Guardando..." : ev.tipo === "final" ? "Registrar evaluación final" : "Registrar evaluación"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── Modal: agendar entrevista (la empresa selecciona al candidato) ───────────────
function AgendarEntrevistaModal({ candidato, onClose, onCreated }: {
    candidato: Postulado; onClose: () => void; onCreated: (msg: string, type?: ToastType) => void;
}) {
    const [f, setF] = useState({ tipo: "virtual", enlace: "", lugar: "", fecha: "", hora: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!f.fecha || !f.hora) { setError("Indica la fecha y la hora."); return; }
        if (f.tipo === "virtual" && !f.enlace) { setError("Agrega el enlace de la reunión (Zoom/Meet)."); return; }
        const token = localStorage.getItem("token");
        if (!token) return;
        setSaving(true); setError("");
        try {
            const res = await fetch(`${API_URLS.perfiles}/entrevistas`, {
                method: "POST", headers: authHeaders(token),
                body: JSON.stringify({ postulacionId: candidato.id, ...f }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Error al agendar"); return; }
            onCreated("Entrevista enviada a la coordinadora para confirmación");
            onClose();
        } catch { setError("Error de conexión"); }
        finally { setSaving(false); }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ maxWidth: "30rem" }}>
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Agendar entrevista</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <form onSubmit={submit} className="p-6 flex flex-col gap-4">
                    <div className="bg-slate-50 rounded-xl p-3 text-sm">
                        <p className="font-semibold text-slate-900">{candidato.nombre}</p>
                        <p className="text-slate-500 text-xs">Se enviará a coordinación para confirmar con el estudiante</p>
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
                    {/* Tipo */}
                    <div className="flex gap-2">
                        {(["virtual", "presencial"] as const).map((t) => (
                            <button key={t} type="button" onClick={() => setF({ ...f, tipo: t })}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border capitalize transition-colors ${f.tipo === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                                {t === "virtual" ? "Virtual" : "Presencial"}
                            </button>
                        ))}
                    </div>
                    {f.tipo === "virtual" ? (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Enlace (Zoom / Meet) *</label>
                            <input value={f.enlace} onChange={(e) => setF({ ...f, enlace: e.target.value })} placeholder="https://meet.google.com/..." className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Lugar</label>
                            <input value={f.lugar} onChange={(e) => setF({ ...f, lugar: e.target.value })} placeholder="Dirección u oficina" className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Fecha *</label>
                            <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Hora *</label>
                            <input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: "#0d1c32" }}>
                            {saving ? "Enviando..." : "Enviar a coordinación"}
                        </button>
                    </div>
                </form>
            </div>
        </div>, document.body
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

    // Prácticas: convenios y evaluaciones
    const [convenios,        setConvenios]        = useState<Convenio[]>([]);
    const [convenioForm,     setConvenioForm]     = useState<Postulado | null>(null); // candidato para crear convenio
    const [convenioGestion,  setConvenioGestion]  = useState<Convenio | null>(null);  // convenio a gestionar/evaluar

    // Entrevistas
    const [entrevistas,      setEntrevistas]      = useState<Entrevista[]>([]);
    const [confirmSeleccion, setConfirmSeleccion] = useState<Postulado | null>(null); // confirmar selección
    const [agendarEntrevista, setAgendarEntrevista] = useState<Postulado | null>(null); // abrir modal de entrevista

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
            // Vacantes propias de la empresa (incluye las inactivas/desactivadas)
            const res = await fetch(`${API_URLS.vacantes}/vacantes/mias`, {
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

    // ── Convenios de práctica de esta empresa ─────────────────────────────────
    const fetchConvenios = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const r = await fetch(`${API_URLS.practicas}/convenios/empresa`, { headers: authHeaders(token) });
            if (r.ok) setConvenios(await r.json());
        } catch { /* silencioso */ }
    }, []);

    // Devuelve el convenio existente de un candidato (por user id), si lo hay
    const convenioDe = useCallback(
        (p: Postulado) => convenios.find((c) => c.estudiante_user_id === p.userId),
        [convenios]
    );

    // Entrevistas de la empresa
    const fetchEntrevistas = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const r = await fetch(`${API_URLS.perfiles}/entrevistas/empresa`, { headers: authHeaders(token) });
            if (r.ok) setEntrevistas(await r.json());
        } catch { /* silencioso */ }
    }, []);

    const entrevistaDe = useCallback(
        (p: Postulado) => entrevistas.find((e) => e.postulacion_id === p.id),
        [entrevistas]
    );

    // No seleccionar → la postulación pasa a "rechazada"
    const handleNoSeleccionar = (p: Postulado) => {
        handleCambiarEstado(p.id, "rechazada");
    };

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
        fetchConvenios();
        fetchEntrevistas();
        const interval = setInterval(fetchNotificaciones, 30000);
        return () => clearInterval(interval);
    }, [fetchVacantes, fetchNotificaciones, fetchConvenios, fetchEntrevistas]);

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

    // ── Solicitar contratación → notifica a la coordinadora académica ──────────
    const handleSolicitarContratacion = async (p: Postulado) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones/${p.id}/solicitar-contratacion`, {
                method: "POST", headers: authHeaders(token),
            });
            if (res.ok) {
                setPostulados((prev) => prev.map((x) => x.id === p.id ? { ...x, estado: "aceptada" } : x));
                addToast("Solicitud de contratación enviada a la coordinadora");
            } else {
                const d = await res.json();
                addToast(d.message || "No se pudo enviar la solicitud", "error");
            }
        } catch { addToast("Error de conexión", "error"); }
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

    // ── Activar / desactivar vacante ───────────────────────────────────────────
    const handleToggleActiva = async (vac: Vacante) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        const nuevoEstado = !vac.activa;
        try {
            const res = await fetch(`${API_URLS.vacantes}/vacantes/${vac.id}/activa`, {
                method: "PATCH",
                headers: authHeaders(token),
                body: JSON.stringify({ activa: nuevoEstado }),
            });
            if (res.ok) {
                setVacantes((prev) => prev.map((v) => v.id === vac.id ? { ...v, activa: nuevoEstado } : v));
                addToast(nuevoEstado ? "Vacante activada" : "Vacante desactivada (ya no la ven los estudiantes)");
                // Si la vacante desactivada estaba seleccionada, refrescar panel
            } else {
                addToast("No se pudo cambiar el estado de la vacante", "error");
            }
        } catch { addToast("Error de conexión", "error"); }
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
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <ToastContainer toasts={toasts} />

            {/* ── Navbar ── */}
            <nav className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 md:px-8 fixed top-0 w-full z-50">
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
                            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[22px] text-slate-600">notifications</span>
                            {noLeidas > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#f97316" }}>
                  {noLeidas > 9 ? "9+" : noLeidas}
                </span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-12 w-auto sm:w-80 md:w-96 max-w-none sm:max-w-[24rem] bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-900 text-sm">Notificaciones</h3>
                                    {noLeidas > 0 && (
                                        <button onClick={handleMarcarTodasLeidas} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                                            Marcar todas leídas
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                    {notificaciones.length === 0 ? (
                                        <div className="flex flex-col items-center py-8 gap-2 text-slate-400">
                                            <span className="material-symbols-outlined text-[32px]">notifications_none</span>
                                            <p className="text-sm">Sin notificaciones</p>
                                        </div>
                                    ) : (
                                        notificaciones.map((n) => (
                                            <button key={n.id} onClick={() => handleMarcarNotifLeida(n.id)}
                                                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${!n.leida ? "bg-orange-50" : ""}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[16px] text-blue-600">person_add</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-semibold ${!n.leida ? "text-slate-900" : "text-slate-600"}`}>{n.titulo}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">
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
                        className="text-sm font-semibold text-white px-3 md:px-4 py-2 rounded-lg hover:opacity-90 shrink-0"
                        style={{ backgroundColor: "#0d1c32" }}
                    >
                        <span className="hidden sm:inline">Cerrar sesión</span>
                        <span className="sm:hidden material-symbols-outlined text-[18px] align-middle">logout</span>
                    </button>
                </div>
            </nav>

            {/* ── Main ── */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-12 flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Panel de Empresa</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Gestiona tus vacantes y revisa los candidatos</p>
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
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900">
                                {editingVacante ? `Editar: ${editingVacante.titulo}` : "Publicar nueva vacante"}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingVacante(null); }} className="text-slate-400 hover:text-slate-700">
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
                                        <label className="text-sm font-semibold text-slate-700">
                                            {f.label}{f.req && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <input
                                            name={f.name} value={form[f.name]} onChange={handleFormChange}
                                            placeholder={f.placeholder} required={f.req}
                                            className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-500 transition-colors"
                                        />
                                    </div>
                                ))}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Modalidad <span className="text-red-500">*</span></label>
                                    <select name="modalidad" value={form.modalidad} onChange={handleFormChange} required
                                            className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-500">
                                        <option value="">Selecciona modalidad</option>
                                        {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Tipo <span className="text-red-500">*</span></label>
                                    <select name="tipo" value={form.tipo} onChange={handleFormChange} required
                                            className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-500">
                                        <option value="">Selecciona tipo</option>
                                        {TIPOS.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700">Descripción <span className="text-red-500">*</span></label>
                                <textarea name="descripcion" value={form.descripcion} onChange={handleFormChange}
                                          placeholder="Describe las responsabilidades y lo que aprenderá el estudiante..." required rows={3}
                                          className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-500 resize-none" />
                            </div>
                            <div className="flex justify-end gap-3 pt-1">
                                <button type="button" onClick={() => { setShowForm(false); setEditingVacante(null); }}
                                        className="px-5 py-2 text-sm border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50">
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
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                            Mis vacantes
                            {!loading && (
                                <span className="ml-2 font-normal normal-case text-slate-400">({vacantes.length})</span>
                            )}
                        </h2>

                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : vacantes.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center py-16 gap-3">
                                <span className="material-symbols-outlined text-[40px] text-slate-300">work_outline</span>
                                <p className="text-sm text-slate-400">Aún no has publicado vacantes.</p>
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
                                             ? "border-slate-900 ring-1 ring-slate-900"
                                             : "border-slate-200"
                                     }`}
                                >
                                    {/* Fila superior */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-white text-sm"
                                             style={{ backgroundColor: "#0d1c32" }}>
                                            {vac.empresa.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-slate-900 truncate">{vac.titulo}</p>
                                            <p className="text-xs text-slate-500 truncate">{vac.empresa} · {vac.ciudad}</p>
                                        </div>
                                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                                            vac.activa ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                        }`}>
                      {vac.activa ? "Activa" : "Inactiva"}
                    </span>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{vac.modalidad}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{vac.tipo}</span>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                                        <button
                                            onClick={() => fetchPostulados(vac)}
                                            className="flex-1 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">group</span>
                                            Ver candidatos
                                        </button>
                                        <button
                                            onClick={() => abrirFormEditar(vac)}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleToggleActiva(vac)}
                                            title={vac.activa ? "Desactivar (dejará de verse para estudiantes)" : "Activar vacante"}
                                            className={`text-xs font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${
                                                vac.activa
                                                    ? "text-amber-700 hover:bg-amber-50"
                                                    : "text-emerald-700 hover:bg-emerald-50"
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[14px]">{vac.activa ? "visibility_off" : "visibility"}</span>
                                            {vac.activa ? "Desactivar" : "Activar"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Panel candidatos */}
                    <div className="flex flex-col gap-3 lg:sticky lg:top-20">
                        {!vacanteSeleccionada ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center py-20 gap-3">
                                <span className="material-symbols-outlined text-[48px] text-slate-300">person_search</span>
                                <p className="text-sm text-slate-400 text-center px-8">
                                    Selecciona una vacante para ver los candidatos
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                                        Candidatos:{" "}
                                        <span className="text-slate-900 normal-case font-bold">{vacanteSeleccionada.titulo}</span>
                                    </h2>
                                    <button onClick={() => { setVacanteSeleccionada(null); setPostulados([]); }}
                                            className="text-slate-400 hover:text-slate-700">
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>

                                {/* Resumen de estados */}
                                {!postuladosLoading && postulados.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: "Pendientes", count: postulados.filter(p => p.estado === "enviada").length,    color: "bg-slate-100 text-slate-700"      },
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
                                        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : postulados.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center py-14 gap-2">
                                        <span className="material-symbols-outlined text-[36px] text-slate-300">inbox</span>
                                        <p className="text-sm text-slate-400">Ningún candidato aún.</p>
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
                                                    }[p.estado] ?? "bg-slate-300";

                                                    return (
                                                        <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                                            <div className={`h-1.5 w-full ${barColor}`} />
                                                            <div className="p-4 flex flex-col gap-3">
                                                                {/* Avatar + nombre */}
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                                        <span className="font-bold text-slate-700">{p.nombre?.charAt(0).toUpperCase()}</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <p className="font-bold text-slate-900 text-sm">{p.nombre}</p>
                                                                            {p.contratado && (
                                                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                          Contratado
                                        </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-slate-500 truncate">{p.email}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Estado del candidato */}
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-semibold text-slate-500 shrink-0">Estado:</span>
                                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${eInfo.style}`}>
                                                                        <span className="material-symbols-outlined text-[13px]">{ESTADO_ICON[p.estado] ?? "schedule"}</span>
                                                                        {eInfo.label}
                                                                    </span>
                                                                </div>

                                                                {/* Datos académicos */}
                                                                <div className="grid grid-cols-2 gap-1.5 text-xs">
                                                                    {p.universidad && (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-[13px] text-slate-400">school</span>
                                                                            <span className="text-slate-700 truncate">{p.universidad}</span>
                                                                        </div>
                                                                    )}
                                                                    {p.semestre && (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-[13px] text-slate-400">calendar_month</span>
                                                                            <span className="text-slate-700">Sem. {p.semestre}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[13px] text-slate-400">star</span>
                                                                        <span className="text-slate-700">Perfil {p.completitud}%</span>
                                                                    </div>
                                                                </div>

                                                                {/* Habilidades */}
                                                                {p.habilidades && p.habilidades.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {p.habilidades.slice(0, 5).map((h, i) => (
                                                                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{h}</span>
                                                                        ))}
                                                                        {p.habilidades.length > 5 && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">+{p.habilidades.length - 5}</span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Carta */}
                                                                <div className="bg-slate-50 rounded-lg border border-slate-100 p-2.5">
                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Carta</p>
                                                                    <p className="text-xs text-slate-700 line-clamp-2">
                                                                        {p.cartaMotivacion?.replace(/\\r\\n|\\n|\\r/g, " ").trim() || "—"}
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    onClick={() => setCandidatoDetalle(p)}
                                                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors"
                                                                >
                                                                    Ver perfil completo
                                                                </button>

                                                                {/* Selección: la empresa decide y agenda la entrevista */}
                                                                {["enviada", "vista"].includes(p.estado) && (
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => setConfirmSeleccion(p)}
                                                                            className="flex-1 text-xs font-semibold text-white rounded-lg py-1.5 hover:opacity-90 flex items-center justify-center gap-1"
                                                                            style={{ backgroundColor: "#0d1c32" }}
                                                                        >
                                                                            <span className="material-symbols-outlined text-[14px]">check</span>
                                                                            Seleccionar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleNoSeleccionar(p)}
                                                                            className="flex-1 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg py-1.5 flex items-center justify-center gap-1"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                                                            No seleccionar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {p.estado === "entrevista" && (() => {
                                                                    const ent = entrevistaDe(p);
                                                                    const txt = ent?.estado === "confirmada"
                                                                        ? "El estudiante confirmó la entrevista"
                                                                        : ent?.estado === "programada"
                                                                        ? "Entrevista confirmada por coordinación"
                                                                        : "Entrevista enviada a coordinación";
                                                                    return (
                                                                        <div className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-2 flex items-center justify-center gap-1 text-center">
                                                                            <span className="material-symbols-outlined text-[14px]">event_available</span>
                                                                            {txt}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                {p.estado === "rechazada" && (
                                                                    <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg py-1.5 flex items-center justify-center gap-1">
                                                                        No has sido seleccionado
                                                                    </div>
                                                                )}
                                                                {p.estado === "aceptada" && (
                                                                    <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 flex items-center justify-center gap-1">
                                                                        <span className="material-symbols-outlined text-[14px]">how_to_reg</span>
                                                                        En proceso de contratación
                                                                    </div>
                                                                )}
                                                                {p.estado === "confirmada" && (
                                                                    <div className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg py-1.5 flex items-center justify-center gap-1">
                                                                        <span className="material-symbols-outlined text-[14px]">verified</span>
                                                                        Contratado
                                                                    </div>
                                                                )}

                                                                {/* Footer: salario + fecha */}
                                                                <div className="flex justify-between text-xs text-slate-400 border-t border-slate-100 pt-2">
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
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                                >
                                                    Anterior
                                                </button>
                                                <span className="text-xs text-slate-500">
                          {candidatosPage} / {Math.ceil(postulados.length / candidatosPorPagina)}
                        </span>
                                                <button
                                                    onClick={() => setCandidatosPage((p) => Math.min(Math.ceil(postulados.length / candidatosPorPagina), p + 1))}
                                                    disabled={candidatosPage === Math.ceil(postulados.length / candidatosPorPagina)}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Perfil del candidato</h3>
                            <button onClick={() => setCandidatoDetalle(null)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-5">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900">{candidatoDetalle.nombre}</h4>
                                <p className="text-slate-500">{candidatoDetalle.email}</p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Estado de postulación</p>
                                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${estadoStyle(candidatoDetalle.estado).style}`}>
                  {estadoStyle(candidatoDetalle.estado).label}
                </span>
                            </div>

                            <div className="border-t pt-4">
                                <h5 className="font-semibold text-slate-800 mb-3">Información académica</h5>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        ["school",         candidatoDetalle.universidad || "No especificada"],
                                        ["menu_book",      candidatoDetalle.programa    || "No especificado"],
                                        ["calendar_month", `Semestre ${candidatoDetalle.semestre || "?"}`],
                                        ["star",           `Perfil ${candidatoDetalle.completitud}% completo`],
                                    ].map(([icon, val]) => (
                                        <div key={icon} className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">{icon}</span>
                                            <span className="text-slate-700">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {candidatoDetalle.habilidades && candidatoDetalle.habilidades.length > 0 && (
                                <div className="border-t pt-4">
                                    <h5 className="font-semibold text-slate-800 mb-2">Habilidades</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {candidatoDetalle.habilidades.map((h, i) => (
                                            <span key={i} className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{h}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Enlaces y documentos */}
                            <div className="border-t pt-4">
                                <h5 className="font-semibold text-slate-800 mb-2">Enlaces y documentos</h5>
                                {(candidatoDetalle.linkedinUrl || candidatoDetalle.cvUrl) ? (
                                    <div className="flex flex-wrap gap-2">
                                        {candidatoDetalle.linkedinUrl && (
                                            <a href={candidatoDetalle.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">link</span>
                                                Ver LinkedIn
                                            </a>
                                        )}
                                        {candidatoDetalle.cvUrl && (
                                            <a href={candidatoDetalle.cvUrl} target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">description</span>
                                                Descargar hoja de vida
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">El candidato no ha registrado LinkedIn ni hoja de vida.</p>
                                )}
                            </div>

                            <div className="border-t pt-4">
                                <h5 className="font-semibold text-slate-800 mb-2">Carta de motivación</h5>
                                <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                        {candidatoDetalle.cartaMotivacion || "No proporcionó carta de motivación."}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h5 className="font-semibold text-slate-800 mb-3">Detalles de postulación</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="text-slate-500">Expectativa salarial</p><p className="font-semibold">{candidatoDetalle.expectativaSalarial || "—"}</p></div>
                                    <div><p className="text-slate-500">Disponibilidad</p><p className="font-semibold">{candidatoDetalle.disponibilidad || "—"}</p></div>
                                    <div><p className="text-slate-500">Fecha</p><p className="font-semibold">{new Date(candidatoDetalle.fecha).toLocaleDateString("es-CO")}</p></div>
                                </div>
                            </div>

                            {candidatoDetalle.contratado && (
                                <div className="border-t pt-4">
                                    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                                        Este estudiante está contratado. La gestión del convenio y la liberación las realiza la coordinadora académica.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button onClick={() => setCandidatoDetalle(null)}
                                        className="px-5 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold text-sm">
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

            {/* ── Confirmar selección de candidato ── */}
            <ConfirmModal
                show={!!confirmSeleccion}
                tipo="warning"
                titulo="Seleccionar candidato"
                mensaje={`¿Estás seguro de contratar a ${confirmSeleccion?.nombre}? A continuación agendarás la entrevista, que se enviará a la coordinadora.`}
                labelConfirm="Sí, agendar entrevista"
                onConfirm={() => { setAgendarEntrevista(confirmSeleccion); setConfirmSeleccion(null); }}
                onCancel={() => setConfirmSeleccion(null)}
            />

            {/* ── Modal agendar entrevista ── */}
            {agendarEntrevista && (
                <AgendarEntrevistaModal
                    candidato={agendarEntrevista}
                    onClose={() => setAgendarEntrevista(null)}
                    onCreated={(msg, type) => {
                        addToast(msg, type);
                        const pid = agendarEntrevista.id;
                        setPostulados((prev) => prev.map((x) => x.id === pid ? { ...x, estado: "entrevista" } : x));
                        fetchEntrevistas();
                    }}
                />
            )}

            {/* ── Modal crear convenio ── */}
            {convenioForm && (
                <ConvenioFormModal
                    candidato={convenioForm}
                    vacanteTitulo={vacanteSeleccionada?.titulo}
                    empresaNombre={empresaNombre}
                    onClose={() => setConvenioForm(null)}
                    onCreated={(msg, type) => { addToast(msg, type); fetchConvenios(); }}
                />
            )}

            {/* ── Modal gestionar práctica ── */}
            {convenioGestion && (
                <ConvenioGestionModal
                    convenio={convenioGestion}
                    onClose={() => setConvenioGestion(null)}
                    onChanged={(msg, type) => { addToast(msg, type); fetchConvenios(); }}
                />
            )}

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white py-5 px-8 flex flex-col md:flex-row justify-between items-center gap-3 mt-auto">
        <span className="text-sm font-bold" style={{ color: "#0d1c32" }}>
          Empleo<span style={{ color: "#f97316" }}>Uni</span>
        </span>
                <p className="text-xs text-slate-400">© 2024 EmpleoUni - Talento Universitario Colombiano</p>
                <div className="flex gap-4 text-xs text-slate-400">
                    <a href="#" className="hover:text-slate-700">Contacto</a>
                    <a href="#" className="hover:text-slate-700">Términos</a>
                    <a href="#" className="hover:text-slate-700">Privacidad</a>
                </div>
            </footer>
        </div>
    );
}