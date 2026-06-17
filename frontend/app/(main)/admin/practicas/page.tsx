"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../../lib/api";

// ── Tipos ───────────────────────────────────────────────────────────────────
interface SolicitudMeta {
    estudianteUserId: string; estudiantePerfilId: string; estudianteNombre: string;
    vacanteId: string; vacanteTitulo: string; empresaId: string; empresaNombre: string;
    postulacionId?: string;
}
interface Notif {
    id: string; tipo: string; titulo: string; mensaje: string;
    leida: boolean; created_at: string; meta?: SolicitudMeta;
}
interface Evaluacion {
    id: string; tipo: "parcial" | "final"; calificacion: number;
    observaciones?: string; created_at: string;
}
interface Convenio {
    id: string; estudiante_user_id: string; estudiante_perfil_id: string; estudiante_nombre: string;
    empresa_nombre: string; vacante_titulo?: string; tutor_empresarial?: string; tutor_academico?: string;
    modalidad?: string; funciones?: string; fecha_inicio?: string; fecha_fin?: string; estado: string;
    evaluaciones?: Evaluacion[];
}
interface Entrevista {
    id: string; postulacion_id: string;
    estudiante_user_id: string; estudiante_perfil_id: string; estudiante_nombre: string;
    empresa_id: string; empresa_nombre: string; vacante_id: string; vacante_titulo?: string;
    tipo: "virtual" | "presencial"; enlace?: string; lugar?: string;
    fecha?: string; hora?: string; estado: string;
}
interface Estudiante {
    id: string; user_id: string; nombre: string; email: string;
    universidad?: string; programa?: string; semestre?: number;
    contratado?: boolean; empresa_contratante?: string;
}

const MODALIDADES = ["Presencial", "Remoto", "Híbrido"];

type ToastType = "success" | "error";

// ── Modal: crear convenio (desde una solicitud de la empresa) ─────────────────
function CrearConvenioModal({ solicitud, onClose, onCreated }: {
    solicitud: SolicitudMeta; onClose: () => void; onCreated: (msg: string, type?: ToastType) => void;
}) {
    const [f, setF] = useState({ tutorEmpresarial: "", tutorAcademico: "", modalidad: "Presencial", funciones: "", fechaInicio: "", fechaFin: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!f.tutorEmpresarial || !f.tutorAcademico || !f.fechaInicio || !f.fechaFin) { setError("Completa tutores y fechas."); return; }
        const token = localStorage.getItem("token");
        if (!token) return;
        setSaving(true); setError("");
        try {
            const res = await fetch(`${API_URLS.practicas}/convenios`, {
                method: "POST", headers: authHeaders(token),
                body: JSON.stringify({
                    estudianteUserId: solicitud.estudianteUserId,
                    estudiantePerfilId: solicitud.estudiantePerfilId,
                    estudianteNombre: solicitud.estudianteNombre,
                    vacanteId: solicitud.vacanteId,
                    vacanteTitulo: solicitud.vacanteTitulo,
                    empresaId: solicitud.empresaId,
                    empresaNombre: solicitud.empresaNombre,
                    postulacionId: solicitud.postulacionId,
                    ...f,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Error al crear convenio"); return; }
            onCreated("Convenio creado y estudiante notificado");
            onClose();
        } catch { setError("Error de conexión"); }
        finally { setSaving(false); }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ maxWidth: "32rem" }}>
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Crear convenio de práctica</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <form onSubmit={submit} className="p-6 flex flex-col gap-4">
                    <div className="bg-slate-50 rounded-xl p-3 text-sm">
                        <p className="font-semibold text-slate-900">{solicitud.estudianteNombre}</p>
                        <p className="text-slate-500 text-xs">{solicitud.vacanteTitulo} · {solicitud.empresaNombre}</p>
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Tutor empresarial *</label>
                            <input value={f.tutorEmpresarial} onChange={(e) => setF({ ...f, tutorEmpresarial: e.target.value })} className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" placeholder="Nombre" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Tutor académico *</label>
                            <input value={f.tutorAcademico} onChange={(e) => setF({ ...f, tutorAcademico: e.target.value })} className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" placeholder="Nombre" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Fecha inicio *</label>
                            <input type="date" value={f.fechaInicio} onChange={(e) => setF({ ...f, fechaInicio: e.target.value })} className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700">Fecha fin *</label>
                            <input type="date" value={f.fechaFin} onChange={(e) => setF({ ...f, fechaFin: e.target.value })} className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Modalidad</label>
                            <select value={f.modalidad} onChange={(e) => setF({ ...f, modalidad: e.target.value })} className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-500">
                                {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Funciones / objetivos</label>
                            <textarea rows={3} value={f.funciones} onChange={(e) => setF({ ...f, funciones: e.target.value })} className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-slate-500 resize-none" placeholder="Actividades del practicante..." />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: "#0d1c32" }}>
                            {saving ? "Creando..." : "Crear convenio"}
                        </button>
                    </div>
                </form>
            </div>
        </div>, document.body
    );
}

// ── Modal: gestionar evaluaciones de un convenio ──────────────────────────────
function EvaluarModal({ convenio, onClose, onChanged }: {
    convenio: Convenio; onClose: () => void; onChanged: (msg: string, type?: ToastType) => void;
}) {
    const [ev, setEv] = useState({ tipo: "primer_corte", calificacion: "", observaciones: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const finalizado = convenio.estado === "finalizado";
    const CORTE_LABEL: Record<string, string> = { primer_corte: "Primer corte (30%)", segundo_corte: "Segundo corte (30%)", tercer_corte: "Tercer corte (40%)" };
    const yaRegistrados = new Set((convenio.evaluaciones || []).map((e) => e.tipo));

    const agregar = async (e: React.FormEvent) => {
        e.preventDefault();
        const nota = Number(ev.calificacion);
        if (isNaN(nota) || nota < 0 || nota > 5) { setError("La nota debe estar entre 0 y 5"); return; }
        const token = localStorage.getItem("token");
        if (!token) return;
        setSaving(true); setError("");
        try {
            const res = await fetch(`${API_URLS.practicas}/convenios/${convenio.id}/evaluaciones`, {
                method: "POST", headers: authHeaders(token),
                body: JSON.stringify({ tipo: ev.tipo, calificacion: nota, observaciones: ev.observaciones }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Error al registrar"); return; }
            onChanged(ev.tipo === "final" ? "Evaluación final registrada — práctica finalizada" : "Evaluación parcial registrada");
            onClose();
        } catch { setError("Error de conexión"); }
        finally { setSaving(false); }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ maxWidth: "32rem" }}>
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Práctica de {convenio.estudiante_nombre}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="p-6 flex flex-col gap-5">
                    <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-slate-500 text-xs">Empresa</p><p className="font-semibold">{convenio.empresa_nombre}</p></div>
                        <div><p className="text-slate-500 text-xs">Tutor empresarial</p><p className="font-semibold">{convenio.tutor_empresarial || "—"}</p></div>
                        <div><p className="text-slate-500 text-xs">Tutor académico</p><p className="font-semibold">{convenio.tutor_academico || "—"}</p></div>
                        <div><p className="text-slate-500 text-xs">Estado</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${finalizado ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"}`}>{finalizado ? "Finalizada" : "Activa"}</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-2">Evaluaciones</h4>
                        {!convenio.evaluaciones || convenio.evaluaciones.length === 0 ? (
                            <p className="text-sm text-slate-400">Sin evaluaciones todavía.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {convenio.evaluaciones.map((e) => (
                                    <div key={e.id} className="border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.tipo === "tercer_corte" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>{CORTE_LABEL[e.tipo] || e.tipo}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">Nota: {e.calificacion} / 5.0</p>
                                            {e.observaciones && <p className="text-xs text-slate-600 mt-0.5">{e.observaciones}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {finalizado ? (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">verified</span>
                            Práctica finalizada. El estudiante ya puede descargar su certificado.
                        </div>
                    ) : (
                        <form onSubmit={agregar} className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                            <h4 className="text-sm font-semibold text-slate-800">Registrar evaluación</h4>
                            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">{error}</div>}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-600">Tipo</label>
                                    <select value={ev.tipo} onChange={(e) => setEv({ ...ev, tipo: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-slate-500">
                                        <option value="primer_corte" disabled={yaRegistrados.has("primer_corte")}>Primer corte (30%)</option>
                                        <option value="segundo_corte" disabled={yaRegistrados.has("segundo_corte")}>Segundo corte (30%)</option>
                                        <option value="tercer_corte" disabled={yaRegistrados.has("tercer_corte")}>Tercer corte / final (40%)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-600">Calificación (0–5)</label>
                                    <input type="number" min="0" max="5" step="0.1" value={ev.calificacion} onChange={(e) => setEv({ ...ev, calificacion: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500" placeholder="Ej: 4.5" />
                                </div>
                            </div>
                            <textarea rows={2} value={ev.observaciones} onChange={(e) => setEv({ ...ev, observaciones: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500 resize-none" placeholder="Observaciones..." />
                            <button type="submit" disabled={saving} className="self-end px-5 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: ev.tipo === "tercer_corte" ? "#7c3aed" : "#0d1c32" }}>
                                {saving ? "Guardando..." : ev.tipo === "tercer_corte" ? "Registrar tercer corte (final)" : `Registrar ${CORTE_LABEL[ev.tipo]}`}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>, document.body
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function CoordinadoraPracticas() {
    const router = useRouter();
    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [convenios, setConvenios] = useState<Convenio[]>([]);
    const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
    const [semFiltro, setSemFiltro] = useState("");
    const [loading, setLoading] = useState(true);
    const [solicitud, setSolicitud] = useState<SolicitudMeta | null>(null);
    const [evaluar, setEvaluar] = useState<Convenio | null>(null);
    const [toast, setToast] = useState("");
    const [showMenu, setShowMenu] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

    const cargar = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        try {
            const [nRes, cRes, eRes, sRes] = await Promise.all([
                fetch(`${API_URLS.perfiles}/notificaciones`, { headers: authHeaders(token) }),
                fetch(`${API_URLS.practicas}/convenios/todos`, { headers: authHeaders(token) }),
                fetch(`${API_URLS.perfiles}/entrevistas/coordinadora`, { headers: authHeaders(token) }),
                fetch(`${API_URLS.perfiles}/perfiles/estudiantes`, { headers: authHeaders(token) }),
            ]);
            if (nRes.status === 401 || nRes.status === 403 || cRes.status === 403) { router.push("/login"); return; }
            if (nRes.ok) { const d = await nRes.json(); setNotifs(d.notificaciones || []); }
            if (cRes.ok) setConvenios(await cRes.json());
            if (eRes.ok) setEntrevistas(await eRes.json());
            if (sRes.ok) setEstudiantes(await sRes.json());
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    }, [router]);

    // Confirmar una entrevista → notifica al estudiante
    const confirmarEntrevista = async (e: Entrevista) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/entrevistas/${e.id}/confirmar`, {
                method: "PATCH", headers: authHeaders(token),
            });
            if (res.ok) { showToast("Entrevista confirmada — estudiante notificado"); cargar(); }
            else showToast("No se pudo confirmar");
        } catch { showToast("Error de conexión"); }
    };

    // Rechazar la selección → "No fuiste seleccionado" al estudiante
    const rechazarEntrevista = async (e: Entrevista) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/entrevistas/${e.id}/rechazar`, { method: "PATCH", headers: authHeaders(token) });
            if (res.ok) { showToast("Estudiante notificado: no seleccionado"); cargar(); }
            else showToast("No se pudo rechazar");
        } catch { showToast("Error de conexión"); }
    };

    // Cancelar/cerrar un convenio (la práctica no se concretó)
    const cancelarConvenio = async (c: Convenio) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.practicas}/convenios/${c.id}/cancelar`, { method: "PATCH", headers: authHeaders(token) });
            if (res.ok) { showToast("Convenio cerrado y estudiante notificado"); cargar(); }
            else showToast("No se pudo cancelar");
        } catch { showToast("Error de conexión"); }
    };

    // Crear convenio a partir de una entrevista confirmada
    const convenioDesdeEntrevista = (e: Entrevista) => setSolicitud({
        estudianteUserId: e.estudiante_user_id, estudiantePerfilId: e.estudiante_perfil_id,
        estudianteNombre: e.estudiante_nombre, vacanteId: e.vacante_id, vacanteTitulo: e.vacante_titulo || "",
        empresaId: e.empresa_id, empresaNombre: e.empresa_nombre, postulacionId: e.postulacion_id,
    });

    const tieneConvenioEnt = (e: Entrevista) =>
        convenios.some((c) => c.estudiante_user_id === e.estudiante_user_id && c.vacante_titulo === e.vacante_titulo);

    useEffect(() => { cargar(); const i = setInterval(cargar, 30000); return () => clearInterval(i); }, [cargar]);

    const handleLogout = () => { localStorage.clear(); document.cookie = "token=; path=/; max-age=0"; router.push("/login"); };

    const liberar = async (c: Convenio) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/perfiles/liberar/${c.estudiante_perfil_id}`, {
                method: "PATCH", headers: authHeaders(token),
            });
            if (res.ok) { showToast("Estudiante liberado"); cargar(); }
            else { const d = await res.json(); showToast(d.message || "Error al liberar"); }
        } catch { showToast("Error de conexión"); }
    };

    // Entrevistas activas (no rechazadas)
    const entrevistasActivas = entrevistas.filter((e) => e.estado !== "rechazada");
    const ENT_LABEL: Record<string, { label: string; style: string }> = {
        solicitada: { label: "Por confirmar", style: "bg-amber-50 text-amber-700" },
        programada: { label: "Esperando al estudiante", style: "bg-blue-50 text-blue-700" },
        confirmada: { label: "Estudiante confirmó", style: "bg-emerald-50 text-emerald-700" },
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            {toast && (
                <div className="fixed top-16 right-4 z-[80] bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>{toast}
                </div>
            )}
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
                        <a href="/admin/auditoria" className="text-slate-500 hover:text-slate-900 transition-colors">Auditoría</a>
                        <a href="/admin/practicas" className="text-slate-900 font-semibold">Prácticas</a>
                    </div>
                </div>

                {showMenu && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg flex flex-col py-1.5">
                        <a href="/admin/dashboard" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><span className="material-symbols-outlined text-[20px] text-slate-400">analytics</span>Analítica</a>
                        <a href="/admin/auditoria" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><span className="material-symbols-outlined text-[20px] text-slate-400">fact_check</span>Auditoría</a>
                        <a href="/admin/practicas" className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-slate-50"><span className="material-symbols-outlined text-[20px]" style={{ color: "#f97316" }}>workspace_premium</span>Prácticas</a>
                    </div>
                )}
                <button onClick={handleLogout} className="text-sm font-semibold text-white px-3 md:px-4 py-2 rounded-lg hover:opacity-90 shrink-0" style={{ backgroundColor: "#0d1c32" }}>
                    <span className="hidden sm:inline">Cerrar sesión</span>
                    <span className="sm:hidden material-symbols-outlined text-[18px] align-middle">logout</span>
                </button>
            </nav>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-20 pb-12 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de prácticas</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Coordinación académica · convenios, evaluaciones y liberación de estudiantes</p>
                </div>

                {/* Entrevistas */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-500" style={{ color: "#f97316" }}>event_available</span>
                        <h2 className="text-base font-semibold text-slate-800">Entrevistas</h2>
                        {entrevistasActivas.length > 0 && <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f97316" }}>{entrevistasActivas.length}</span>}
                    </div>
                    {loading ? (
                        <p className="text-sm text-slate-400">Cargando...</p>
                    ) : entrevistasActivas.length === 0 ? (
                        <p className="text-sm text-slate-400">No hay entrevistas. Cuando una empresa seleccione a un estudiante, aparecerá aquí para que la confirmes.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {entrevistasActivas.map((e) => {
                                const info = ENT_LABEL[e.estado] || ENT_LABEL.solicitada;
                                const cuando = `${e.fecha ? new Date(e.fecha).toLocaleDateString("es-CO") : ""} ${e.hora || ""}`.trim();
                                const yaConvenio = tieneConvenioEnt(e);
                                return (
                                    <div key={e.id} className="flex flex-col gap-2 border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 text-sm">{e.estudiante_nombre}</p>
                                                <p className="text-xs text-slate-500">{e.vacante_titulo} · {e.empresa_nombre}</p>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">{e.tipo === "virtual" ? "videocam" : "location_on"}</span>
                                                    {e.tipo === "virtual" ? "Virtual" : "Presencial"} · {cuando}
                                                    {e.tipo === "virtual" && e.enlace && <a href={e.enlace} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">enlace</a>}
                                                    {e.tipo === "presencial" && e.lugar && <span className="ml-1">· {e.lugar}</span>}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${info.style}`}>{info.label}</span>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2">
                                            {(e.estado === "solicitada" || e.estado === "programada" || (e.estado === "confirmada" && !yaConvenio)) && (
                                                <button onClick={() => rechazarEntrevista(e)} className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                                    No seleccionado
                                                </button>
                                            )}
                                            {e.estado === "solicitada" && (
                                                <button onClick={() => confirmarEntrevista(e)} className="text-xs font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1.5" style={{ backgroundColor: "#0d1c32" }}>
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    Confirmar y notificar al estudiante
                                                </button>
                                            )}
                                            {e.estado === "confirmada" && !yaConvenio && (
                                                <button onClick={() => convenioDesdeEntrevista(e)} className="text-xs font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1.5" style={{ backgroundColor: "#f97316" }}>
                                                    <span className="material-symbols-outlined text-[14px]">handshake</span>
                                                    Crear convenio
                                                </button>
                                            )}
                                            {e.estado === "confirmada" && yaConvenio && (
                                                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">task_alt</span>Convenio creado</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Convenios */}
                <section className="flex flex-col gap-3">
                    <h2 className="text-base font-semibold text-slate-800">Convenios de práctica ({convenios.length})</h2>
                    {convenios.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-12 flex flex-col items-center gap-2 text-slate-400">
                            <span className="material-symbols-outlined text-[40px]">workspace_premium</span>
                            <p className="text-sm">Aún no has creado convenios.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {convenios.map((c) => {
                                const finalizado = c.estado === "finalizado";
                                return (
                                    <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className={`h-1.5 w-full ${finalizado ? "bg-purple-500" : "bg-emerald-500"}`} />
                                        <div className="p-5 flex flex-col gap-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{c.estudiante_nombre}</p>
                                                    <p className="text-xs text-slate-500">{c.vacante_titulo} · {c.empresa_nombre}</p>
                                                </div>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${finalizado ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"}`}>{finalizado ? "Finalizada" : "Activa"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span>Evaluaciones: {c.evaluaciones?.length || 0}</span>
                                                {c.fecha_inicio && <span>· {new Date(c.fecha_inicio).toLocaleDateString("es-CO")} → {c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString("es-CO") : "—"}</span>}
                                            </div>
                                            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                                                <button onClick={() => setEvaluar(c)} className="flex-1 min-w-[100px] text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg py-1.5 flex items-center justify-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">assignment</span>
                                                    {finalizado ? "Ver cortes" : "Evaluar"}
                                                </button>
                                                {finalizado && (
                                                    <button onClick={() => liberar(c)} className="flex-1 min-w-[100px] text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg py-1.5 flex items-center justify-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">logout</span>
                                                        Liberar
                                                    </button>
                                                )}
                                                {!finalizado && c.estado !== "cancelado" && (
                                                    <button onClick={() => cancelarConvenio(c)} className="flex-1 min-w-[100px] text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg py-1.5 flex items-center justify-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                        Cerrar convenio
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Filtro de estudiantes por semestre */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-slate-800">Estudiantes</h2>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-500">Semestre:</label>
                            <select value={semFiltro} onChange={(e) => setSemFiltro(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-500">
                                <option value="">Todos</option>
                                {[4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>{s}° semestre</option>)}
                            </select>
                        </div>
                    </div>
                    {(() => {
                        const convPorUser = new Map(convenios.map((c) => [c.estudiante_user_id, c]));
                        const lista = estudiantes.filter((e) => !semFiltro || String(e.semestre) === semFiltro);
                        if (lista.length === 0) return <p className="text-sm text-slate-400">No hay estudiantes para ese filtro.</p>;
                        return (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-slate-500 border-b border-slate-200">
                                        <tr>
                                            <th className="py-2 font-medium">Estudiante</th>
                                            <th className="py-2 font-medium text-center">Semestre</th>
                                            <th className="py-2 font-medium">Empresa</th>
                                            <th className="py-2 font-medium">Inicio práctica</th>
                                            <th className="py-2 font-medium">Fin práctica</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lista.map((e) => {
                                            const conv = convPorUser.get(e.user_id);
                                            return (
                                                <tr key={e.id} className="border-b border-slate-50">
                                                    <td className="py-2.5">
                                                        <p className="font-medium text-slate-800">{e.nombre}</p>
                                                        <p className="text-xs text-slate-400">{e.programa}</p>
                                                    </td>
                                                    <td className="py-2.5 text-center text-slate-700">{e.semestre || "—"}</td>
                                                    <td className="py-2.5 text-slate-700">{e.contratado ? (e.empresa_contratante || conv?.empresa_nombre || "—") : <span className="text-slate-400">Sin práctica</span>}</td>
                                                    <td className="py-2.5 text-slate-700">{conv?.fecha_inicio ? new Date(conv.fecha_inicio).toLocaleDateString("es-CO") : "—"}</td>
                                                    <td className="py-2.5 text-slate-700">{conv?.fecha_fin ? new Date(conv.fecha_fin).toLocaleDateString("es-CO") : "—"}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}
                </section>
            </main>

            {solicitud && <CrearConvenioModal solicitud={solicitud} onClose={() => setSolicitud(null)} onCreated={(m) => { showToast(m); cargar(); }} />}
            {evaluar && <EvaluarModal convenio={evaluar} onClose={() => setEvaluar(null)} onChanged={(m) => { showToast(m); cargar(); }} />}
        </div>
    );
}
