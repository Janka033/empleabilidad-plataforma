"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../lib/api";

interface VacanteInfo {
    id: string;
    titulo: string;
    empresa: string;
    modalidad: string;
    ciudad: string;
    salario?: string;
    descripcion: string;
    requisitos?: string[];
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
            <nav className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-8 fixed top-0 w-full z-50">
        <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
          Empleo<span style={{ color: "#f97316" }}>Uni</span>
        </span>
            </nav>
            <div className="flex-1 flex items-start justify-center px-4 pt-24 pb-12">
                <div className="w-full max-w-2xl animate-pulse flex flex-col gap-6">
                    <div className="h-8 bg-gray-200 rounded-xl w-1/3" />
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-4">
                        <div className="h-6 bg-gray-200 rounded-lg w-2/3" />
                        <div className="h-4 bg-gray-100 rounded-lg w-1/2" />
                        <div className="h-40 bg-gray-100 rounded-xl" />
                        <div className="h-10 bg-gray-200 rounded-xl" />
                        <div className="h-10 bg-gray-200 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Pantalla: ya tiene empresa ────────────────────────────────────────────────
function PantallaContratado({ empresa, onBack }: { empresa: string; onBack: () => void }) {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
            <nav className="h-14 border-b border-gray-200 bg-white flex items-center px-8 fixed top-0 w-full z-50">
        <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
          Empleo<span style={{ color: "#f97316" }}>Uni</span>
        </span>
            </nav>
            <div className="flex-1 flex items-center justify-center px-4 pt-14">
                <div className="w-full max-w-md bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="h-2 w-full bg-amber-400" />
                    <div className="p-8 flex flex-col items-center text-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-amber-500">business_center</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Ya tienes empresa</h2>
                            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                                Ya estás contratado por{" "}
                                <strong className="text-gray-800">{empresa}</strong> y no puedes
                                postularte a más vacantes.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={onBack}
                                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Ver vacantes
                            </button>
                            <button
                                onClick={() => router.push("/perfil")}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                                style={{ backgroundColor: "#0d1c32" }}
                            >
                                Mi perfil
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Pantalla de éxito ─────────────────────────────────────────────────────────
function PantallaExito({ vacante }: { vacante: VacanteInfo }) {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
            <nav className="h-14 border-b border-gray-200 bg-white flex items-center px-8 fixed top-0 w-full z-50">
        <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
          Empleo<span style={{ color: "#f97316" }}>Uni</span>
        </span>
            </nav>
            <div className="flex-1 flex items-start justify-center px-4 pt-24 pb-12">
                <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="h-2 w-full bg-gradient-to-r from-green-400 to-emerald-500" />
                    <div className="p-8 md:p-10 flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[40px] text-green-600">check_circle</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                                ¡Postulación enviada!
                            </h1>
                            <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
                                Tu perfil fue enviado exitosamente a{" "}
                                <span className="font-semibold text-gray-800">{vacante.empresa}</span>.
                                La empresa revisará tu candidatura pronto.
                            </p>
                        </div>

                        {/* Resumen de la vacante */}
                        <div className="w-full rounded-xl bg-gray-50 border border-gray-200 p-4 flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-xl font-bold text-gray-700">
                  {vacante.empresa.charAt(0).toUpperCase()}
                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{vacante.titulo}</p>
                                <p className="text-sm text-gray-500">
                                    {vacante.empresa} · {vacante.ciudad}
                                </p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Enviada
              </span>
                        </div>

                        {/* Pasos */}
                        <div className="w-full grid grid-cols-3 gap-3">
                            {[
                                { icon: "mark_email_read", label: "Postulación enviada",  desc: "Tu perfil está en revisión",  done: true  },
                                { icon: "visibility",      label: "Revisión de empresa",  desc: "La empresa verá tu perfil",   done: false },
                                { icon: "handshake",       label: "Respuesta",            desc: "En 3–7 días hábiles",         done: false },
                            ].map(({ icon, label, desc, done }) => (
                                <div
                                    key={label}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center ${
                                        done ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
                                    }`}
                                >
                  <span className={`material-symbols-outlined text-[22px] ${done ? "text-emerald-600" : "text-gray-400"}`}>
                    {icon}
                  </span>
                                    <span className={`text-xs font-semibold ${done ? "text-emerald-700" : "text-gray-600"}`}>
                    {label}
                  </span>
                                    <span className="text-xs text-gray-400">{desc}</span>
                                </div>
                            ))}
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button
                                onClick={() => router.push("/vacantes")}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 text-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">search</span>
                                Ver más vacantes
                            </button>
                            <button
                                onClick={() => router.push("/perfil")}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-white text-gray-700 font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 text-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                                Mis postulaciones
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PostularPage() {
    const router = useRouter();

    const [vacante,        setVacante]        = useState<VacanteInfo | null>(null);
    const [ready,          setReady]          = useState(false);   // evita flash de null
    const [showSuccess,    setShowSuccess]    = useState(false);
    const [loading,        setLoading]        = useState(false);
    const [error,          setError]          = useState<string | null>(null);
    const [carta,          setCarta]          = useState("");
    const [expectativa,    setExpectativa]    = useState("");
    const [disponibilidad, setDisponibilidad] = useState("inmediata");
    const [bloqueado,      setBloqueado]      = useState(false);
    const [empresaBloq,    setEmpresaBloq]    = useState("");
    const [yaPostulado,    setYaPostulado]    = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }

        const raw = localStorage.getItem("vacantePostular");
        if (!raw) { router.push("/vacantes"); return; }

        try {
            setVacante(JSON.parse(raw));
            setReady(true);
        } catch {
            router.push("/vacantes");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!carta.trim() || !expectativa.trim()) {
            setError("Completa todos los campos obligatorios.");
            return;
        }
        const token = localStorage.getItem("token");
        if (!token || !vacante) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URLS.perfiles}/postulaciones`, {
                method: "POST",
                headers: authHeaders(token),
                body: JSON.stringify({
                    vacanteId:          vacante.id,
                    cartaMotivacion:    carta,
                    expectativaSalarial: expectativa,
                    disponibilidad,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.contratado) {
                    setBloqueado(true);
                    setEmpresaBloq(data.empresa || "otra empresa");
                    return;
                }
                // 409 = ya postulado a esta vacante
                if (res.status === 409) {
                    setYaPostulado(true);
                    localStorage.removeItem("vacantePostular");
                    return;
                }
                setError(data.message || "Error al enviar la postulación.");
                return;
            }

            localStorage.removeItem("vacantePostular");
            setShowSuccess(true);
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    // ── Guardias de estado ────────────────────────────────────────────────────
    if (!ready) return <LoadingSkeleton />;

    if (bloqueado) {
        return (
            <PantallaContratado
                empresa={empresaBloq}
                onBack={() => router.push("/vacantes")}
            />
        );
    }

    if (yaPostulado) {
        return (
            <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
                <nav className="h-14 border-b border-gray-200 bg-white flex items-center px-8 fixed top-0 w-full z-50">
          <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
            Empleo<span style={{ color: "#f97316" }}>Uni</span>
          </span>
                </nav>
                <div className="flex-1 flex items-center justify-center px-4 pt-14">
                    <div className="w-full max-w-md bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
                        <div className="h-2 w-full bg-blue-400" />
                        <div className="p-8 flex flex-col items-center text-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[32px] text-blue-500">info</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Ya te postulaste</h2>
                                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                                    Ya enviaste una postulación a{" "}
                                    <strong className="text-gray-800">{vacante?.empresa}</strong> para esta vacante.
                                    Puedes seguir el estado desde tu perfil.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => router.push("/vacantes")}
                                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Ver vacantes
                                </button>
                                <button
                                    onClick={() => router.push("/perfil")}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                                    style={{ backgroundColor: "#0d1c32" }}
                                >
                                    Mis postulaciones
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (showSuccess && vacante) return <PantallaExito vacante={vacante} />;

    if (!vacante) return <LoadingSkeleton />;

    // ── Formulario principal ──────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col">

            {/* Navbar fijo */}
            <nav className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 md:px-8 fixed top-0 w-full z-50">
        <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
          Empleo<span style={{ color: "#f97316" }}>Uni</span>
        </span>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Volver
                </button>
            </nav>

            {/* Contenido — padding-top = altura del navbar */}
            <div className="flex-1 flex items-start justify-center px-4 pt-20 pb-12">
                <div className="w-full max-w-2xl flex flex-col gap-6">

                    {/* Breadcrumb / contexto */}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <button
                            onClick={() => router.push("/vacantes")}
                            className="hover:text-gray-700 transition-colors"
                        >
                            Vacantes
                        </button>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-gray-600 font-medium truncate">{vacante.titulo}</span>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-gray-900 font-semibold">Postular</span>
                    </div>

                    {/* Card principal */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Barra de color superior */}
                        <div
                            className="h-1.5 w-full"
                            style={{ backgroundImage: "linear-gradient(to right, #0d1c32, #f97316)" }}
                        />

                        <div className="p-6 md:p-8 flex flex-col gap-6">

                            {/* Header: info de la vacante */}
                            <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-gray-700">
                    {vacante.empresa.charAt(0).toUpperCase()}
                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-lg font-bold text-gray-900 truncate">{vacante.titulo}</h1>
                                    <p className="text-sm text-gray-500 truncate">
                                        {vacante.empresa} · {vacante.ciudad} · {vacante.modalidad}
                                    </p>
                                </div>
                            </div>

                            <h2 className="text-base font-semibold text-gray-800">Completa tu postulación</h2>

                            {/* Error */}
                            {error && (
                                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">error</span>
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}

                            {/* Formulario */}
                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                                {/* Carta de motivación */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Carta de motivación{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={carta}
                                        onChange={(e) => setCarta(e.target.value)}
                                        required
                                        rows={6}
                                        maxLength={2000}
                                        placeholder="Cuéntale a la empresa por qué eres el candidato ideal para esta posición..."
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500 resize-none transition-colors"
                                    />
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-gray-400">Sé específico: menciona habilidades y por qué te interesa esta empresa.</p>
                                        <span className={`text-xs font-medium ${carta.length > 1500 ? "text-amber-600" : "text-gray-400"}`}>
                      {carta.length}/2000
                    </span>
                                    </div>
                                </div>

                                {/* Expectativa y disponibilidad */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">
                                            Expectativa salarial{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                      </span>
                                            <input
                                                type="text"
                                                value={expectativa}
                                                onChange={(e) => setExpectativa(e.target.value)}
                                                required
                                                placeholder="Ej: $1.500.000"
                                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Disponibilidad</label>
                                        <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <span className="material-symbols-outlined text-[16px]">event_available</span>
                      </span>
                                            <select
                                                value={disponibilidad}
                                                onChange={(e) => setDisponibilidad(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-gray-500 bg-white appearance-none transition-colors"
                                            >
                                                <option value="inmediata">Inmediata</option>
                                                <option value="15 días">En 15 días</option>
                                                <option value="1 mes">En 1 mes</option>
                                                <option value="negociable">Negociable</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[16px]">
                        expand_more
                      </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Aviso de perfil */}
                                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-[18px] text-blue-500 shrink-0">info</span>
                                    <p className="text-xs text-blue-700">
                                        Tu perfil académico (universidad, programa, semestre y habilidades) se adjuntará automáticamente a esta postulación.
                                    </p>
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="flex-1 py-3 px-5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !carta.trim() || !expectativa.trim()}
                                        className="flex-[2] py-3 px-8 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                                        style={{ backgroundColor: "#0d1c32" }}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[16px]">send</span>
                                                Enviar postulación
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}