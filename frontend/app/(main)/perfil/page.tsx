"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../lib/api";
import ConfirmModal from "../../components/ui/ConfirmModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Postulacion {
    id: string;
    vacanteId: string;
    cartaMotivacion: string;
    expectativaSalarial: string;
    disponibilidad: string;
    estado: string;
    esFavorita: boolean;
    fecha: string;
    vacanteTitle?: string;
    vacanteEmpresa?: string;
    vacanteModalidad?: string;
    vacanteCiudad?: string;
}

interface Perfil {
    nombre: string;
    email: string;
    universidad?: string;
    programa?: string;
    semestre?: number;
    bio?: string;
    habilidades?: string[];
    completitud: number;
    contratado?: boolean;
    empresa_contratante?: string;
    linkedin_url?: string;
    cv_url?: string;
}

interface Evaluacion {
    id: string;
    tipo: "primer_corte" | "segundo_corte" | "tercer_corte";
    calificacion: number;
    observaciones?: string;
    created_at: string;
}

interface Convenio {
    id: string;
    empresa_nombre: string;
    vacante_titulo?: string;
    tutor_empresarial?: string;
    tutor_academico?: string;
    modalidad?: string;
    funciones?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    estado: string;
    estudiante_nombre: string;
    evaluaciones?: Evaluacion[];
}

interface Entrevista {
    id: string;
    empresa_nombre: string;
    vacante_titulo?: string;
    tipo: "virtual" | "presencial";
    enlace?: string;
    lugar?: string;
    fecha?: string;
    hora?: string;
    estado: string;
}

interface Notificacion {
    id: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    leida: boolean;
    created_at: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string; color: string }> = {
    enviada:    { label: "Enviada",       bg: "bg-slate-100",   text: "text-slate-600",    icon: "schedule",      color: "bg-slate-200"    },
    vista:      { label: "Vista",         bg: "bg-amber-50",   text: "text-amber-700",   icon: "visibility",    color: "bg-amber-400"   },
    entrevista: { label: "En proceso",    bg: "bg-blue-50",    text: "text-blue-700",    icon: "groups",        color: "bg-blue-400"    },
    aceptada:   { label: "Aceptada ✓",   bg: "bg-emerald-50", text: "text-emerald-700", icon: "check_circle",  color: "bg-emerald-400" },
    rechazada:  { label: "Rechazada",     bg: "bg-red-50",     text: "text-red-600",     icon: "cancel",        color: "bg-red-400"     },
    confirmada: { label: "Confirmada", bg: "bg-purple-50", text: "text-purple-700", icon: "verified", color: "bg-purple-400" },
};

const HABILIDADES_SUGERIDAS = [
    "JavaScript","TypeScript","React","Next.js","Node.js","Python","Java","SQL",
    "Git","Docker","CSS","HTML","Vue.js","Angular","MongoDB","PostgreSQL","AWS","Figma",
];

const UNIVERSIDADES = ["Corporación Universitaria Alexander von Humboldt"];
const PROGRAMAS = ["Ingeniería de Software"];
// La práctica profesional inicia en 4° semestre
const SEMESTRES = [4, 5, 6, 7, 8];

function estadoCfg(e: string) { return ESTADO_CONFIG[e] ?? ESTADO_CONFIG.enviada; }

// ── Component ─────────────────────────────────────────────────────────────────
export default function PerfilPage() {
    const router = useRouter();

    // State
    const [perfil,           setPerfil]           = useState<Perfil | null>(null);
    const [postulaciones,    setPostulaciones]     = useState<Postulacion[]>([]);
    const [notificaciones,   setNotificaciones]    = useState<Notificacion[]>([]);
    const [noLeidas,         setNoLeidas]          = useState(0);
    const [convenios,        setConvenios]         = useState<Convenio[]>([]);
    const [entrevistas,      setEntrevistas]       = useState<Entrevista[]>([]);
    const [loadingPerfil,    setLoadingPerfil]     = useState(true);
    const [loadingPostul,    setLoadingPostul]     = useState(true);
    const [tab,              setTab]               = useState<"postulaciones" | "perfil" | "notificaciones" | "practica">("postulaciones");
    const [showNotifPanel,   setShowNotifPanel]    = useState(false);
    const [showMobileMenu,   setShowMobileMenu]    = useState(false);

    // Edit profile state
    const [editMode,         setEditMode]          = useState(false);
    const [saving,           setSaving]            = useState(false);
    const [saveError,        setSaveError]         = useState("");
    const [saveOk,           setSaveOk]            = useState(false);
    const [editForm,         setEditForm]          = useState({
        nombre: "", universidad: "", programa: "", semestre: "", habilidades: [] as string[], bio: "", linkedinUrl: "",
    });
    const [cvFile,           setCvFile]            = useState<File | null>(null);
    const [habilidadInput,   setHabilidadInput]    = useState("");
    const [modalConfirmar, setModalConfirmar] = useState<{
        postulacionId: string; empresaNombre: string;
    } | null>(null);
    const [modalExito, setModalExito] = useState(false);

    // ── Fetch helpers ────────────────────────────────────────────────────────
    const fetchPerfil = useCallback(async (token: string) => {
        const r = await fetch(`${API_URLS.perfiles}/perfiles/me`, { headers: authHeaders(token) });
        if (r.ok) {
            const d: Perfil = await r.json();
            setPerfil(d);
            setEditForm({
                nombre:      d.nombre      || "",
                universidad: d.universidad || "",
                programa:    d.programa    || "",
                semestre:    d.semestre    ? String(d.semestre) : "",
                habilidades: d.habilidades || [],
                bio:         d.bio         || "",
                linkedinUrl: d.linkedin_url || "",
            });
        }
        setLoadingPerfil(false);
    }, []);

    const fetchPostulaciones = useCallback(async (token: string) => {
        const r = await fetch(`${API_URLS.perfiles}/postulaciones/me`, { headers: authHeaders(token) });
        if (!r.ok) { setLoadingPostul(false); return; }
        const lista: Postulacion[] = await r.json();
        const enriquecidas = await Promise.all(
            lista.map(async (p) => {
                try {
                    const vr = await fetch(`${API_URLS.vacantes}/vacantes/${p.vacanteId}`, { headers: authHeaders(token) });
                    if (vr.ok) {
                        const v = await vr.json();
                        return { ...p, vacanteTitle: v.titulo, vacanteEmpresa: v.empresa, vacanteModalidad: v.modalidad, vacanteCiudad: v.ciudad };
                    }
                } catch {}
                return p;
            })
        );
        setPostulaciones(enriquecidas);
        setLoadingPostul(false);
    }, []);

    const fetchNotificaciones = useCallback(async (token: string) => {
        try {
            const r = await fetch(`${API_URLS.perfiles}/notificaciones`, { headers: authHeaders(token) });
            if (r.ok) {
                const d = await r.json();
                setNotificaciones(d.notificaciones || []);
                setNoLeidas(d.noLeidas || 0);
            }
        } catch {}
    }, []);

    const fetchConvenios = useCallback(async (token: string) => {
        try {
            const r = await fetch(`${API_URLS.practicas}/convenios/me`, { headers: authHeaders(token) });
            if (r.ok) setConvenios(await r.json());
        } catch {}
    }, []);

    const fetchEntrevistas = useCallback(async (token: string) => {
        try {
            const r = await fetch(`${API_URLS.perfiles}/entrevistas/me`, { headers: authHeaders(token) });
            if (r.ok) setEntrevistas(await r.json());
        } catch {}
    }, []);

    const handleConfirmarAsistencia = async (id: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const r = await fetch(`${API_URLS.perfiles}/entrevistas/${id}/confirmar-asistencia`, {
                method: "PATCH", headers: authHeaders(token),
            });
            if (r.ok) {
                setEntrevistas((prev) => prev.map((e) => e.id === id ? { ...e, estado: "confirmada" } : e));
            }
        } catch {}
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        fetchPerfil(token);
        fetchPostulaciones(token);
        fetchNotificaciones(token);
        fetchConvenios(token);
        fetchEntrevistas(token);
        // Poll notificaciones cada 30 segundos
        const interval = setInterval(() => fetchNotificaciones(token), 30000);
        return () => clearInterval(interval);
    }, [router, fetchPerfil, fetchPostulaciones, fetchNotificaciones, fetchConvenios, fetchEntrevistas]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleLogout = () => {
        localStorage.clear();
        document.cookie = "token=; path=/; max-age=0";
        router.push("/login");
    };

    const handleSavePerfil = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        if (!token) return;
        setSaving(true); setSaveError(""); setSaveOk(false);
        try {
            const formData = new FormData();
            formData.append("nombre",      editForm.nombre);
            formData.append("universidad", editForm.universidad);
            formData.append("programa",    editForm.programa);
            formData.append("bio",         editForm.bio);
            formData.append("linkedinUrl", editForm.linkedinUrl);
            if (editForm.semestre) formData.append("semestre", editForm.semestre);
            formData.append("habilidades", JSON.stringify(editForm.habilidades));
            if (cvFile) {
                formData.append("cv", cvFile);
            } else if (perfil?.cv_url) {
                formData.append("existingCvUrl", perfil.cv_url);
            }

            const res = await fetch(`${API_URLS.auth}/auth/perfil`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) { const d = await res.json(); setSaveError(d.message || "Error al guardar"); return; }
            const updated: Perfil = await res.json();
            setPerfil(updated);
            setCvFile(null);
            setSaveOk(true);
            setEditMode(false);
            setTimeout(() => setSaveOk(false), 3000);
        } catch { setSaveError("Error de conexión"); }
        finally { setSaving(false); }
    };

    const handleToggleHabilidad = (h: string) => {
        setEditForm((prev) => ({
            ...prev,
            habilidades: prev.habilidades.includes(h)
                ? prev.habilidades.filter((x) => x !== h)
                : [...prev.habilidades, h],
        }));
    };

    const handleAddHabilidadCustom = () => {
        const h = habilidadInput.trim();
        if (!h || editForm.habilidades.includes(h)) { setHabilidadInput(""); return; }
        setEditForm((prev) => ({ ...prev, habilidades: [...prev.habilidades, h] }));
        setHabilidadInput("");
    };

    const handleMarcarFavorita = async (postulacionId: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones/${postulacionId}/favorita`, {
                method: "PATCH", headers: authHeaders(token),
            });
            if (res.ok) {
                setPostulaciones((prev) =>
                    prev.map((p) => ({ ...p, esFavorita: p.id === postulacionId }))
                );
            }
        } catch {}
    };    const handleConfirmarOferta = (postulacionId: string, empresaNombre: string) => {
        setModalConfirmar({ postulacionId, empresaNombre });
    };

    const ejecutarConfirmacion = async () => {
        if (!modalConfirmar) return;
        const { postulacionId } = modalConfirmar;
        setModalConfirmar(null);
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones/${postulacionId}/confirmar`, {
                method: "POST", headers: authHeaders(token),
            });
            if (res.ok) {
                setModalExito(true);
                await fetchPerfil(token);
                await fetchPostulaciones(token);
                await fetchNotificaciones(token);
            }
        } catch { /* silencioso */ }
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

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">

            {/* Navbar */}
            <nav className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 fixed top-0 w-full z-50">
                <div className="flex items-center gap-3 md:gap-6 min-w-0">
                    <button onClick={() => setShowMobileMenu((v) => !v)}
                            className="md:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-lg hover:bg-slate-100 shrink-0">
                        <span className="material-symbols-outlined text-slate-700">{showMobileMenu ? "close" : "menu"}</span>
                    </button>
          <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
            Empleo<span style={{ color: "#f97316" }}>Uni</span>
          </span>
                    <div className="hidden md:flex gap-5 text-sm font-medium text-slate-500">
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                        <a href="/vacantes" className="hover:text-slate-900 transition-colors">Vacantes</a>
                        <a href="/perfil" className="text-slate-900 font-semibold">Mi Perfil</a>
                    </div>
                </div>

                {/* Menú móvil desplegable */}
                {showMobileMenu && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg flex flex-col py-1.5">
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                        <a href="/vacantes" className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                            <span className="material-symbols-outlined text-[20px] text-slate-400">work</span>Vacantes
                        </a>
                        <a href="/perfil" className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-slate-50">
                            <span className="material-symbols-outlined text-[20px]" style={{ color: "#f97316" }}>person</span>Mi Perfil
                        </a>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    {/* Campana de notificaciones */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifPanel((v) => !v)}
                            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[22px] text-slate-600">notifications</span>
                            {noLeidas > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                                      style={{ backgroundColor: "#f97316" }}>
                  {noLeidas > 9 ? "9+" : noLeidas}
                </span>
                            )}
                        </button>

                        {/* Panel de notificaciones */}
                        {showNotifPanel && (
                            <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-12 w-auto sm:w-96 max-w-none sm:max-w-[24rem] bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-900 text-sm">Notificaciones</h3>
                                    {noLeidas > 0 && (
                                        <button onClick={handleMarcarTodasLeidas}
                                                className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                                            Marcar todas como leídas
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
                                            <button
                                                key={n.id}
                                                onClick={() => handleMarcarNotifLeida(n.id)}
                                                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${!n.leida ? "bg-orange-50" : ""}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                        n.tipo === "contratado" ? "bg-emerald-100" :
                                                            n.tipo === "postulacion_nueva" ? "bg-blue-100" : "bg-slate-100"
                                                    }`}>
                            <span className={`material-symbols-outlined text-[16px] ${
                                n.tipo === "contratado" ? "text-emerald-600" :
                                    n.tipo === "postulacion_nueva" ? "text-blue-600" : "text-slate-600"
                            }`}>
                              {n.tipo === "contratado" ? "celebration" :
                                  n.tipo === "postulacion_nueva" ? "person_add" : "update"}
                            </span>
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

                    <button onClick={handleLogout}
                            className="text-sm font-semibold text-white px-3 md:px-4 py-2 rounded-lg hover:opacity-90 shrink-0"
                            style={{ backgroundColor: "#0d1c32" }}>
                        <span className="hidden sm:inline">Cerrar sesión</span>
                        <span className="sm:hidden material-symbols-outlined text-[18px] align-middle">logout</span>
                    </button>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 pt-20 pb-12 flex flex-col gap-6">

                {/* Toast de guardado */}
                {saveOk && (
                    <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Perfil actualizado correctamente
                    </div>
                )}

                {/* Aviso para completar el perfil al 100% */}
                {!loadingPerfil && perfil && perfil.completitud < 100 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className="material-symbols-outlined text-orange-500 text-[28px]">tips_and_updates</span>
                        <div className="flex-1">
                            <p className="font-semibold text-orange-800 text-sm">Tu perfil está al {perfil.completitud}%</p>
                            <p className="text-orange-700 text-xs mt-0.5">
                                Completa tu bio, habilidades, LinkedIn y hoja de vida en “Datos académicos” para llegar al 100% y mejorar tus recomendaciones de vacantes.
                            </p>
                        </div>
                        <button
                            onClick={() => { setTab("perfil"); setEditMode(true); }}
                            className="shrink-0 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90"
                            style={{ backgroundColor: "#f97316" }}
                        >
                            Completar perfil
                        </button>
                    </div>
                )}

                {/* Header del perfil */}
                {!loadingPerfil && perfil && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center md:items-start gap-5">
                        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                            <span className="text-2xl font-bold text-white">{perfil.nombre?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-1 text-center md:text-left">
                            <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                                <h1 className="text-xl font-bold text-slate-900">{perfil.nombre}</h1>
                                {perfil.contratado && (
                                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="material-symbols-outlined text-[13px]">business_center</span>
                    Contratado · {perfil.empresa_contratante}
                  </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500">{perfil.email}</p>
                            {(perfil.universidad || perfil.programa) && (
                                <p className="text-sm text-slate-500">
                                    {perfil.programa}{perfil.programa && perfil.universidad ? " · " : ""}{perfil.universidad}
                                    {perfil.semestre ? ` · Semestre ${perfil.semestre}` : ""}
                                </p>
                            )}
                            {perfil.habilidades && perfil.habilidades.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2 justify-center md:justify-start">
                                    {perfil.habilidades.map((h) => (
                                        <span key={h} className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{h}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Completitud + botón editar */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                            <div className="relative w-16 h-16">
                                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                    <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                                    <circle cx="32" cy="32" r="26" fill="none" stroke="#0d1c32" strokeWidth="6"
                                            strokeDasharray={`${2 * Math.PI * 26 * (perfil.completitud / 100)} ${2 * Math.PI * 26}`}
                                            strokeLinecap="round" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">{perfil.completitud}%</span>
                            </div>
                            <span className="text-xs text-slate-500">Perfil</span>
                            <button
                                onClick={() => { setEditMode(true); setTab("perfil"); }}
                                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                Editar
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
                    {([
                        { id: "postulaciones", label: "Mis postulaciones", icon: "work_history" },
                        { id: "practica",      label: "Mi práctica",       icon: "workspace_premium" },
                        { id: "perfil",        label: "Datos académicos",  icon: "school"       },
                        { id: "notificaciones",label: "Notificaciones",    icon: "notifications" },
                    ] as const).map(({ id, label, icon }) => (
                        <button
                            key={id} onClick={() => { setTab(id); setShowNotifPanel(false); }}
                            className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all relative shrink-0 ${
                                tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{icon}</span>
                            <span className="hidden sm:inline">{label}</span>
                            {id === "notificaciones" && noLeidas > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                                      style={{ backgroundColor: "#f97316" }}>
                  {noLeidas}
                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── TAB: POSTULACIONES ──────────────────────────────────────────── */}
                {tab === "postulaciones" && (
                    <div className="flex flex-col gap-4">
                        {/* Entrevistas */}
                        {entrevistas.filter((e) => e.estado !== "rechazada").length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]" style={{ color: "#f97316" }}>event_available</span>
                                    Mis entrevistas
                                </h2>
                                {entrevistas.filter((e) => e.estado !== "rechazada").map((e) => {
                                    const cuando = `${e.fecha ? new Date(e.fecha).toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long" }) : ""} ${e.hora || ""}`.trim();
                                    return (
                                        <div key={e.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 text-sm">¡Has sido seleccionado por {e.empresa_nombre}!</p>
                                                    <p className="text-xs text-slate-500">{e.vacante_titulo}</p>
                                                </div>
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start shrink-0 ${e.estado === "confirmada" ? "bg-emerald-50 text-emerald-700" : e.estado === "programada" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                                                    {e.estado === "confirmada" ? "Asistencia confirmada" : e.estado === "programada" ? "Por confirmar" : "En coordinación"}
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1.5 text-sm">
                                                <p className="flex items-center gap-2 text-slate-700">
                                                    <span className="material-symbols-outlined text-[16px] text-slate-400">{e.tipo === "virtual" ? "videocam" : "location_on"}</span>
                                                    Entrevista <strong>{e.tipo === "virtual" ? "virtual" : "presencial"}</strong>
                                                </p>
                                                <p className="flex items-center gap-2 text-slate-700">
                                                    <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                                                    {cuando || "Fecha por confirmar"}
                                                </p>
                                                {e.tipo === "virtual" && e.enlace && (
                                                    <p className="flex items-center gap-2 text-slate-700">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">link</span>
                                                        <a href={e.enlace} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{e.enlace}</a>
                                                    </p>
                                                )}
                                                {e.tipo === "presencial" && e.lugar && (
                                                    <p className="flex items-center gap-2 text-slate-700">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">place</span>{e.lugar}
                                                    </p>
                                                )}
                                            </div>
                                            {e.estado === "programada" && (
                                                <button onClick={() => handleConfirmarAsistencia(e.id)}
                                                        className="self-end text-sm font-semibold text-white px-5 py-2 rounded-lg hover:opacity-90 flex items-center gap-1.5"
                                                        style={{ backgroundColor: "#0d1c32" }}>
                                                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                    Confirmar mi asistencia
                                                </button>
                                            )}
                                            {e.estado === "confirmada" && (
                                                <p className="self-end text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                                                    Confirmaste tu asistencia
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-slate-800">
                                Postulaciones realizadas
                                {!loadingPostul && <span className="ml-2 text-sm font-normal text-slate-400">({postulaciones.length})</span>}
                            </h2>
                            <button onClick={() => router.push("/vacantes")}
                                    className="text-sm font-semibold flex items-center gap-1 text-orange-500 hover:text-orange-600">
                                <span className="material-symbols-outlined text-[16px]">search</span>
                                Buscar vacantes
                            </button>
                        </div>

                        {/* Banner contratado */}
                        {perfil?.contratado && (
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                                <span className="material-symbols-outlined text-[28px] text-emerald-600">celebration</span>
                                <div>
                                    <p className="font-semibold text-emerald-800 text-sm">¡Ya tienes empresa!</p>
                                    <p className="text-emerald-700 text-xs mt-0.5">Estás contratado por <strong>{perfil.empresa_contratante}</strong>. No puedes postularte a nuevas vacantes.</p>
                                </div>
                            </div>
                        )}

                        {/* Tip de favorita */}
                        {!loadingPostul && postulaciones.length > 1 && (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                                <span className="material-symbols-outlined text-[18px] text-blue-500">info</span>
                                <p className="text-xs text-blue-700">
                                    <strong>Tip:</strong> Marca con ⭐ la vacante que más te interesa para que la empresa lo sepa.
                                </p>
                            </div>
                        )}

                        {loadingPostul ? (
                            <div className="flex justify-center py-16">
                                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : postulaciones.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined text-[48px] text-slate-300">work_outline</span>
                                <p className="text-slate-500 text-sm">Aún no te has postulado a ninguna vacante.</p>
                                <button onClick={() => router.push("/vacantes")}
                                        className="mt-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl hover:opacity-90"
                                        style={{ backgroundColor: "#0d1c32" }}>
                                    Ver vacantes disponibles
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {postulaciones
                                    .filter(p => p.estado !== "rechazada_por_estudiante") // ← oculta las rechazadas por el estudiante
                                    .map((p) => {
                                    const cfg = estadoCfg(p.estado);
                                    return (
                                        <div key={p.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                                            p.esFavorita ? "border-orange-300 ring-1 ring-orange-200" : "border-slate-200"
                                        }`}>
                                            <div className={`h-1 w-full ${cfg.color}`} />
                                            <div className="p-5 flex flex-col gap-4">
                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                            <span className="font-bold text-slate-700">{(p.vacanteEmpresa ?? "?").charAt(0).toUpperCase()}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-900 text-sm">{p.vacanteTitle ?? "Cargando..."}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {p.vacanteEmpresa ?? ""}
                                                                {p.vacanteCiudad ? ` · ${p.vacanteCiudad}` : ""}
                                                                {p.vacanteModalidad ? ` · ${p.vacanteModalidad}` : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                                                        {/* Botón favorita */}
                                                        <button
                                                            onClick={() => handleMarcarFavorita(p.id)}
                                                            title={p.esFavorita ? "Vacante favorita" : "Marcar como favorita"}
                                                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                                                                p.esFavorita
                                                                    ? "bg-orange-50 border-orange-300 text-orange-600 font-semibold"
                                                                    : "bg-white border-slate-200 text-slate-400 hover:text-orange-500 hover:border-orange-200"
                                                            }`}
                                                        >
                              <span className="material-symbols-outlined text-[14px]">
                                {p.esFavorita ? "star" : "star_border"}
                              </span>
                                                            {p.esFavorita ? "Favorita" : "Favorita"}
                                                        </button>
                                                        {/* Badge estado */}
                                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                                                            <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                                            {cfg.label}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                    <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Carta de motivación</p>
                                                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                                                        {p.cartaMotivacion?.replace(/\\r\\n|\\n|\\r/g, " ").trim() || "—"}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">payments</span>
                                                        <span className="text-xs text-slate-500">Expectativa:</span>
                                                        <span className="text-xs font-semibold text-slate-800">{p.expectativaSalarial || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">event_available</span>
                                                        <span className="text-xs text-slate-500">Disponible:</span>
                                                        <span className="text-xs font-semibold text-slate-800">{p.disponibilidad || "—"}</span>
                                                    </div>
                                                    <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                        {new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                                                    </div>
                                                </div>
                                                {/* Botón de confirmación solo si está aceptada y el estudiante no está contratado */}
                                                {!perfil?.contratado && p.estado === "aceptada" && (
                                                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                                                        <button
                                                            onClick={() => handleConfirmarOferta(p.id, p.vacanteEmpresa ?? "esta empresa")}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm"
                                                        >
                                                            Elegir esta empresa para mi practica
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: DATOS ACADÉMICOS / EDITAR PERFIL ──────────────────────── */}
                {tab === "perfil" && (
                    <div className="flex flex-col gap-4">
                        {/* Header del tab con botón editar */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-slate-800">Datos académicos</h2>
                            {!editMode && (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
                                    style={{ backgroundColor: "#0d1c32" }}
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    Editar perfil
                                </button>
                            )}
                        </div>

                        {loadingPerfil ? (
                            <div className="flex justify-center py-10">
                                <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : editMode ? (
                            /* ── FORMULARIO DE EDICIÓN ── */
                            <form onSubmit={handleSavePerfil} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-orange-500">manage_accounts</span>
                                    Editar información del perfil
                                </h3>

                                {saveError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{saveError}</div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Nombre */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Nombre completo</label>
                                        <input
                                            type="text" value={editForm.nombre} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                                            className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-500"
                                            placeholder="Tu nombre completo"
                                        />
                                    </div>

                                    {/* Universidad */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Universidad</label>
                                        <select
                                            value={editForm.universidad}
                                            onChange={(e) => setEditForm((f) => ({ ...f, universidad: e.target.value }))}
                                            className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-500 bg-white"
                                        >
                                            <option value="">Selecciona</option>
                                            {UNIVERSIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>

                                    {/* Programa */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Programa académico</label>
                                        <select
                                            value={editForm.programa}
                                            onChange={(e) => setEditForm((f) => ({ ...f, programa: e.target.value }))}
                                            className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-500 bg-white"
                                        >
                                            <option value="">Selecciona</option>
                                            {PROGRAMAS.map((p) => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>

                                    {/* Semestre */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Semestre actual</label>
                                        <select
                                            value={editForm.semestre}
                                            onChange={(e) => setEditForm((f) => ({ ...f, semestre: e.target.value }))}
                                            className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-500 bg-white"
                                        >
                                            <option value="">Selecciona</option>
                                            {SEMESTRES.map((s) => <option key={s} value={s}>{s}° semestre</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Sobre mí</label>
                                    <textarea
                                        rows={3}
                                        value={editForm.bio}
                                        onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                                        className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-500 resize-none"
                                        placeholder="Cuéntanos un poco sobre ti..."
                                    />
                                </div>

                                {/* LinkedIn + CV */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">LinkedIn URL</label>
                                        <input
                                            type="url"
                                            value={editForm.linkedinUrl}
                                            onChange={(e) => setEditForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                                            className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-500"
                                            placeholder="https://linkedin.com/in/tu-perfil"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">
                                            Hoja de vida (PDF)
                                            {perfil?.cv_url && <span className="ml-2 text-xs font-normal text-emerald-600">✓ ya tienes CV</span>}
                                        </label>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                            className="border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                        />
                                    </div>
                                </div>

                                {/* Habilidades */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700">Habilidades técnicas</label>
                                    <div className="flex flex-wrap gap-2">
                                        {HABILIDADES_SUGERIDAS.map((h) => (
                                            <button
                                                key={h} type="button" onClick={() => handleToggleHabilidad(h)}
                                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                                    editForm.habilidades.includes(h)
                                                        ? "bg-blue-600 text-white border-blue-600"
                                                        : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                                                }`}
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Habilidad personalizada */}
                                    <div className="flex gap-2 mt-1">
                                        <input
                                            type="text" value={habilidadInput}
                                            onChange={(e) => setHabilidadInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddHabilidadCustom())}
                                            placeholder="Agregar otra habilidad..."
                                            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
                                        />
                                        <button type="button" onClick={handleAddHabilidadCustom}
                                                className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">
                                            Agregar
                                        </button>
                                    </div>
                                    {/* Habilidades seleccionadas */}
                                    {editForm.habilidades.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {editForm.habilidades.map((h) => (
                                                <span key={h} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {h}
                                                    <button type="button" onClick={() => handleToggleHabilidad(h)}
                                                            className="text-blue-400 hover:text-blue-700 ml-0.5">✕</button>
                        </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button" onClick={() => { setEditMode(false); setSaveError(""); }}
                                        className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit" disabled={saving}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                        style={{ backgroundColor: "#0d1c32" }}
                                    >
                                        {saving
                                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                                            : <><span className="material-symbols-outlined text-[16px]">save</span>Guardar cambios</>}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* ── VISTA DE DATOS ── */
                            perfil && (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { icon: "person",         label: "Nombre",       value: perfil.nombre      },
                                            { icon: "mail",           label: "Correo",       value: perfil.email       },
                                            { icon: "school",         label: "Universidad",  value: perfil.universidad },
                                            { icon: "menu_book",      label: "Programa",     value: perfil.programa    },
                                            { icon: "calendar_month", label: "Semestre",     value: perfil.semestre ? `Semestre ${perfil.semestre}` : null },
                                        ].filter((f) => f.value).map(({ icon, label, value }) => (
                                            <div key={label} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="material-symbols-outlined text-[20px] text-slate-400 mt-0.5">{icon}</span>
                                                <div>
                                                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                                                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {(perfil.bio || perfil.linkedin_url || perfil.cv_url || (perfil.habilidades && perfil.habilidades.length > 0)) && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                                            {perfil.bio && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 mb-1">Sobre mí</p>
                                                    <p className="text-sm text-slate-700">{perfil.bio}</p>
                                                </div>
                                            )}
                                            {(perfil.linkedin_url || perfil.cv_url) && (
                                                <div className="flex flex-wrap gap-3">
                                                    {perfil.linkedin_url && (
                                                        <a href={perfil.linkedin_url} target="_blank" rel="noopener noreferrer"
                                                           className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                                                            <span className="material-symbols-outlined text-[14px]">link</span>
                                                            LinkedIn
                                                        </a>
                                                    )}
                                                    {perfil.cv_url && (
                                                        <a href={perfil.cv_url} target="_blank" rel="noopener noreferrer"
                                                           className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                                                            <span className="material-symbols-outlined text-[14px]">description</span>
                                                            Descargar CV
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {perfil.habilidades && perfil.habilidades.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 mb-2">Habilidades</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {perfil.habilidades.map((h) => (
                                                            <span key={h} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{h}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* ── TAB: MI PRÁCTICA ────────────────────────────────────────────── */}
                {tab === "practica" && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-base font-semibold text-slate-800">Mi práctica profesional</h2>
                        {convenios.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined text-[48px] text-slate-300">workspace_premium</span>
                                <p className="text-slate-500 text-sm text-center px-6">
                                    Aún no tienes un convenio de práctica.<br />
                                    Cuando confirmes una oferta y la empresa formalice el convenio, aparecerá aquí.
                                </p>
                            </div>
                        ) : (
                            convenios.map((c) => {
                                const finalizado = c.estado === "finalizado";
                                const cortesC = c.evaluaciones || [];
                                const PESOS_C: Record<string, number> = { primer_corte: 0.3, segundo_corte: 0.3, tercer_corte: 0.4 };
                                let sC = 0, pC = 0;
                                for (const e of cortesC) { const pp = PESOS_C[e.tipo] || 0; sC += pp * Number(e.calificacion); pC += pp; }
                                const notaFinalC = pC > 0 ? Math.round((sC / pC) * 10) / 10 : 0;
                                const evalFinal = cortesC.find((e) => e.tipo === "tercer_corte");
                                const CORTE_LBL: Record<string, string> = { primer_corte: "1er corte", segundo_corte: "2do corte", tercer_corte: "3er corte" };
                                return (
                                    <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className={`h-1.5 w-full ${finalizado ? "bg-purple-500" : "bg-emerald-500"}`} />
                                        <div className="p-6 flex flex-col gap-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-bold text-slate-900">{c.vacante_titulo || "Práctica profesional"}</h3>
                                                    <p className="text-sm text-slate-500">{c.empresa_nombre}</p>
                                                </div>
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${finalizado ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"}`}>
                                                    {finalizado ? "Finalizada" : "En curso"}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-100 pt-3">
                                                <div><p className="text-xs text-slate-500">Tutor empresarial</p><p className="font-semibold text-slate-800">{c.tutor_empresarial || "—"}</p></div>
                                                <div><p className="text-xs text-slate-500">Tutor académico</p><p className="font-semibold text-slate-800">{c.tutor_academico || "—"}</p></div>
                                                <div><p className="text-xs text-slate-500">Modalidad</p><p className="font-semibold text-slate-800">{c.modalidad || "—"}</p></div>
                                                <div><p className="text-xs text-slate-500">Periodo</p><p className="font-semibold text-slate-800">
                                                    {c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString("es-CO") : "—"} → {c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString("es-CO") : "—"}
                                                </p></div>
                                            </div>

                                            {c.funciones && (
                                                <div className="border-t border-slate-100 pt-3">
                                                    <p className="text-xs text-slate-500 mb-1">Funciones</p>
                                                    <p className="text-sm text-slate-700">{c.funciones}</p>
                                                </div>
                                            )}

                                            {/* Evaluaciones */}
                                            <div className="border-t border-slate-100 pt-3">
                                                <p className="text-xs font-semibold text-slate-500 mb-2">Evaluaciones</p>
                                                {!c.evaluaciones || c.evaluaciones.length === 0 ? (
                                                    <p className="text-sm text-slate-400">Sin evaluaciones registradas.</p>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        {c.evaluaciones.map((e) => (
                                                            <div key={e.id} className="flex items-center gap-3 text-sm">
                                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.tipo === "tercer_corte" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                                                                    {CORTE_LBL[e.tipo] || e.tipo}
                                                                </span>
                                                                <span className="font-semibold text-slate-800">{e.calificacion}/5.0</span>
                                                                {e.observaciones && <span className="text-slate-500 truncate">— {e.observaciones}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Certificado (RF14, HU16) */}
                                            {finalizado && evalFinal && (
                                                <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-3">
                                                    <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[18px]">verified</span>
                                                        Práctica completada · nota final {notaFinalC}/5.0
                                                    </p>
                                                    <button
                                                        onClick={() => router.push(`/practica/certificado/${c.id}`)}
                                                        className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90"
                                                        style={{ backgroundColor: "#0d1c32" }}
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">download</span>
                                                        Ver certificado
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ── TAB: NOTIFICACIONES ─────────────────────────────────────────── */}
                {tab === "notificaciones" && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-slate-800">
                                Notificaciones
                                {noLeidas > 0 && <span className="ml-2 text-sm font-normal text-orange-500">({noLeidas} sin leer)</span>}
                            </h2>
                            {noLeidas > 0 && (
                                <button onClick={handleMarcarTodasLeidas}
                                        className="text-sm font-semibold text-orange-500 hover:text-orange-600">
                                    Marcar todas como leídas
                                </button>
                            )}
                        </div>

                        {notificaciones.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined text-[48px] text-slate-300">notifications_none</span>
                                <p className="text-slate-500 text-sm">No tienes notificaciones aún.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {notificaciones.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleMarcarNotifLeida(n.id)}
                                        className={`w-full text-left bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all p-5 flex items-start gap-4 ${
                                            !n.leida ? "border-orange-200 bg-orange-50" : "border-slate-200"
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                            n.tipo === "contratado" ? "bg-emerald-100" :
                                                n.tipo === "postulacion_nueva" ? "bg-blue-100" : "bg-slate-100"
                                        }`}>
                      <span className={`material-symbols-outlined text-[20px] ${
                          n.tipo === "contratado" ? "text-emerald-600" :
                              n.tipo === "postulacion_nueva" ? "text-blue-600" : "text-slate-600"
                      }`}>
                        {n.tipo === "contratado" ? "celebration" :
                            n.tipo === "postulacion_nueva" ? "person_add" : "update"}
                      </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-semibold ${!n.leida ? "text-slate-900" : "text-slate-600"}`}>{n.titulo}</p>
                                                {!n.leida && <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: "#f97316" }} />}
                                            </div>
                                            <p className="text-sm text-slate-500 mt-0.5">{n.mensaje}</p>
                                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">schedule</span>
                                                {new Date(n.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── Modales ── */}
            <ConfirmModal
                show={!!modalConfirmar}
                tipo="warning"
                titulo="Confirmar practica"
                mensaje={`¿Confirmas que deseas realizar tu practica con ${modalConfirmar?.empresaNombre}? No podras cambiarlo despues.`}
                labelConfirm="Confirmar"
                onConfirm={ejecutarConfirmacion}
                onCancel={() => setModalConfirmar(null)}
            />
            <ConfirmModal
                show={modalExito}
                tipo="success"
                titulo="Practica confirmada"
                mensaje="Has confirmado tu practica exitosamente. La empresa sera notificada."
                labelConfirm="Entendido"
                onConfirm={() => setModalExito(false)}
            />

            <footer className="border-t border-slate-200 bg-white py-5 px-8 flex flex-col md:flex-row justify-between items-center gap-3">
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