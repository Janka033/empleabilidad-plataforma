"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders } from "../../lib/api";

interface Postulacion {
  id: string;
  vacanteId: string;
  cartaMotivacion: string;
  expectativaSalarial: string;
  disponibilidad: string;
  estado: string;
  fecha: string;
  // enriquecido en cliente
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
  habilidades?: string[];
  completitud: number;
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  enviada:    { label: "Enviada",    bg: "bg-gray-100",         text: "text-gray-600",     icon: "schedule"       },
  vista:      { label: "Vista",      bg: "bg-amber-50",         text: "text-amber-700",    icon: "visibility"     },
  entrevista: { label: "En proceso", bg: "bg-blue-50",          text: "text-blue-700",     icon: "groups"         },
  aceptada:   { label: "Aceptada",   bg: "bg-emerald-50",       text: "text-emerald-700",  icon: "check_circle"   },
  rechazada:  { label: "Rechazada",  bg: "bg-red-50",           text: "text-red-600",      icon: "cancel"         },
};

function estadoCfg(e: string) {
  return ESTADO_CONFIG[e] ?? ESTADO_CONFIG.enviada;
}

export default function PerfilPage() {
  const router = useRouter();
  const [perfil,            setPerfil]            = useState<Perfil | null>(null);
  const [postulaciones,     setPostulaciones]     = useState<Postulacion[]>([]);
  const [loadingPerfil,     setLoadingPerfil]     = useState(true);
  const [loadingPostul,     setLoadingPostul]     = useState(true);
  const [tab,               setTab]               = useState<"perfil" | "postulaciones">("postulaciones");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    // Cargar perfil
    fetch(`${API_URLS.perfiles}/perfiles/me`, { headers: authHeaders(token) })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setPerfil(d); })
        .finally(() => setLoadingPerfil(false));

    // Cargar postulaciones y enriquecer con título de vacante
    fetch(`${API_URLS.perfiles}/postulaciones/me`, { headers: authHeaders(token) })
        .then((r) => r.ok ? r.json() : [])
        .then(async (lista: Postulacion[]) => {
          // Para cada postulación, buscar la vacante en paralelo (máximo 6 simultáneos)
          const enriquecidas = await Promise.all(
              lista.map(async (p) => {
                try {
                  const vr = await fetch(`${API_URLS.vacantes}/vacantes/${p.vacanteId}`, {
                    headers: authHeaders(token),
                  });
                  if (vr.ok) {
                    const v = await vr.json();
                    return {
                      ...p,
                      vacanteTitle:    v.titulo,
                      vacanteEmpresa:  v.empresa,
                      vacanteModalidad: v.modalidad,
                      vacanteCiudad:   v.ciudad,
                    };
                  }
                } catch {}
                return p;
              })
          );
          setPostulaciones(enriquecidas);
        })
        .finally(() => setLoadingPostul(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "token=; path=/; max-age=0";
    router.push("/login");
  };

  return (
      <div className="min-h-screen bg-[#f8f9fb] flex flex-col">

        {/* Navbar */}
        <nav className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-8 fixed top-0 w-full z-50">
          <div className="flex items-center gap-6">
                    <span className="text-base font-bold" style={{ color: "#0d1c32" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
            <div className="hidden md:flex gap-5 text-sm font-medium text-gray-500">
              <a href="/vacantes" className="hover:text-gray-900 transition-colors">Vacantes</a>
              <a href="/perfil" className="text-gray-900 font-semibold">Mi Perfil</a>
            </div>
          </div>
          <button onClick={handleLogout}
                  className="text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#0d1c32" }}>
            Cerrar sesión
          </button>
        </nav>

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 pt-20 pb-12 flex flex-col gap-6">

          {/* Encabezado del perfil */}
          {!loadingPerfil && perfil && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row items-center md:items-start gap-5">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                            <span className="text-2xl font-bold text-white">
                                {perfil.nombre?.charAt(0).toUpperCase()}
                            </span>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center md:text-left">
                  <h1 className="text-xl font-bold text-gray-900">{perfil.nombre}</h1>
                  <p className="text-sm text-gray-500">{perfil.email}</p>
                  {(perfil.universidad || perfil.programa) && (
                      <p className="text-sm text-gray-500">
                        {perfil.programa}{perfil.programa && perfil.universidad ? " · " : ""}{perfil.universidad}
                        {perfil.semestre ? ` · Semestre ${perfil.semestre}` : ""}
                      </p>
                  )}
                  {perfil.habilidades && perfil.habilidades.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 justify-center md:justify-start">
                        {perfil.habilidades.map((h) => (
                            <span key={h} className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                            {h}
                                        </span>
                        ))}
                      </div>
                  )}
                </div>
                {/* Barra de completitud */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#0d1c32" strokeWidth="6"
                              strokeDasharray={`${2 * Math.PI * 26 * (perfil.completitud / 100)} ${2 * Math.PI * 26}`}
                              strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                                    {perfil.completitud}%
                                </span>
                  </div>
                  <span className="text-xs text-gray-500">Perfil</span>
                </div>
              </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {([
              { id: "postulaciones", label: "Mis postulaciones", icon: "work_history" },
              { id: "perfil",        label: "Datos académicos",  icon: "school"       },
            ] as const).map(({ id, label, icon }) => (
                <button
                    key={id} onClick={() => setTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === id
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  {label}
                </button>
            ))}
          </div>

          {/* ── TAB: POSTULACIONES ────────────────────────────────────────────── */}
          {tab === "postulaciones" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800">
                    Postulaciones realizadas
                    {!loadingPostul && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
                                        ({postulaciones.length})
                                    </span>
                    )}
                  </h2>
                  <button onClick={() => router.push("/vacantes")}
                          className="text-sm font-semibold flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">search</span>
                    Buscar vacantes
                  </button>
                </div>

                {loadingPostul ? (
                    <div className="flex justify-center py-16">
                      <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : postulaciones.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-16 flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-[48px] text-gray-300">work_outline</span>
                      <p className="text-gray-500 text-sm">Aún no te has postulado a ninguna vacante.</p>
                      <button onClick={() => router.push("/vacantes")}
                              className="mt-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: "#0d1c32" }}>
                        Ver vacantes disponibles
                      </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                      {postulaciones.map((p) => {
                        const cfg = estadoCfg(p.estado);
                        return (
                            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                              {/* Línea de color según estado */}
                              <div className={`h-1 w-full ${
                                  p.estado === "aceptada"   ? "bg-emerald-400" :
                                      p.estado === "rechazada"  ? "bg-red-400"     :
                                          p.estado === "entrevista" ? "bg-blue-400"    :
                                              p.estado === "vista"      ? "bg-amber-400"   :
                                                  "bg-gray-200"
                              }`} />

                              <div className="p-5 flex flex-col gap-4">
                                {/* Header: empresa + badge estado */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                                            <span className="font-bold text-gray-700">
                                                                {(p.vacanteEmpresa ?? "?").charAt(0).toUpperCase()}
                                                            </span>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900 text-sm">
                                        {p.vacanteTitle ?? "Cargando vacante..."}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {p.vacanteEmpresa ?? ""}
                                        {p.vacanteCiudad ? ` · ${p.vacanteCiudad}` : ""}
                                        {p.vacanteModalidad ? ` · ${p.vacanteModalidad}` : ""}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Badge de estado */}
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${cfg.bg} ${cfg.text}`}>
                                    <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                    {cfg.label}
                                  </div>
                                </div>

                                {/* Carta de motivación */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Carta de motivación</p>
                                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                                    {p.cartaMotivacion?.replace(/\\r\\n|\\n|\\r/g, " ").trim() || "—"}
                                  </p>
                                </div>

                                {/* Detalles: salario y disponibilidad */}
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-gray-400">payments</span>
                                    <span className="text-xs text-gray-500">Expectativa:</span>
                                    <span className="text-xs font-semibold text-gray-800">{p.expectativaSalarial || "—"}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-gray-400">event_available</span>
                                    <span className="text-xs text-gray-500">Disponible:</span>
                                    <span className="text-xs font-semibold text-gray-800">{p.disponibilidad || "—"}</span>
                                  </div>
                                  <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    {new Date(p.fecha).toLocaleDateString("es-CO", {
                                      day: "2-digit", month: "short", year: "numeric",
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>
                )}
              </div>
          )}

          {/* ── TAB: DATOS ACADÉMICOS ─────────────────────────────────────────── */}
          {tab === "perfil" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                {loadingPerfil ? (
                    <div className="flex justify-center py-10">
                      <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : perfil ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { icon: "person",       label: "Nombre",       value: perfil.nombre      },
                        { icon: "mail",         label: "Correo",       value: perfil.email       },
                        { icon: "school",       label: "Universidad",  value: perfil.universidad },
                        { icon: "menu_book",    label: "Programa",     value: perfil.programa    },
                        { icon: "calendar_month", label: "Semestre",   value: perfil.semestre ? `Semestre ${perfil.semestre}` : null },
                      ].filter((f) => f.value).map(({ icon, label, value }) => (
                          <div key={label} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="material-symbols-outlined text-[20px] text-gray-400 mt-0.5">{icon}</span>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">{label}</p>
                              <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
                            </div>
                          </div>
                      ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No se pudo cargar el perfil.</p>
                )}
              </div>
          )}
        </main>

        <footer className="border-t border-gray-200 bg-white py-5 px-8 flex flex-col md:flex-row justify-between items-center gap-3">
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
