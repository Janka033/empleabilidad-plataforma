"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URLS, authHeaders, parseApiError } from "../../lib/api";

interface Postulacion {
  id: string;
  vacanteId: string;
  cartaMotivacion: string;
  expectativaSalarial: string;
  disponibilidad: string;
  estado: string;
  fecha: string;
}

interface Perfil {
  id: string;
  user_id: string;
  nombre: string;
  email: string;
  bio?: string;
  universidad?: string;
  programa?: string;
  semestre?: number;
  habilidades?: string[];
  completitud: number;
  updated_at?: string;
}

export default function PerfilPage() {
  const router = useRouter();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [bio, setBio] = useState("");
  const [universidad, setUniversidad] = useState("");
  const [programa, setPrograma] = useState("");
  const [semestre, setSemestre] = useState<string>("");
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [habilidadInput, setHabilidadInput] = useState("");

  // Postulaciones del estudiante
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [postulacionesLoading, setPostulacionesLoading] = useState(false);

  // ── CARGA DEL PERFIL ─────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadPerfil = async () => {
      try {
        const res = await fetch(`${API_URLS.perfiles}/perfiles/me`, {
          headers: authHeaders(token),
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        if (res.status === 404) {
          // Perfil todavía no creado (puede ocurrir si ms-perfiles estuvo caído al registrarse)
          setError("Tu perfil aún no ha sido creado. Cierra sesión, vuelve a registrarte o contacta soporte.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error(await parseApiError(res, "Error al cargar el perfil"));
        }

        const data: Perfil = await res.json();
        setPerfil(data);

        // Poblar el formulario con los datos actuales
        setNombre(data.nombre ?? "");
        setBio(data.bio ?? "");
        setUniversidad(data.universidad ?? "");
        setPrograma(data.programa ?? "");
        setSemestre(data.semestre?.toString() ?? "");
        setHabilidades(data.habilidades ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error de conexión con el servidor");
      } finally {
        setLoading(false);
      }
    };

    loadPerfil();
  }, [router]);

  // ── CARGA DE POSTULACIONES ────────────────────────────────────────────────
  const loadPostulaciones = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setPostulacionesLoading(true);
    try {
      const res = await fetch(`${API_URLS.perfiles}/postulaciones/me`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        setPostulaciones(data);
      }
    } catch { /* silenciar */ } finally {
      setPostulacionesLoading(false);
    }
  }, []);

  useEffect(() => { loadPostulaciones(); }, [loadPostulaciones]);
  const handleSave = async () => {
    if (!perfil) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_URLS.perfiles}/perfiles/${perfil.id}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          nombre:      nombre || undefined,
          bio:         bio || undefined,
          universidad: universidad || undefined,
          programa:    programa || undefined,
          semestre:    semestre ? parseInt(semestre) : undefined,
          habilidades: habilidades.length > 0 ? habilidades : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res, "No se pudieron guardar los cambios"));
      }

      const updated: Perfil = await res.json();
      setPerfil(updated);
      setSuccessMsg("Perfil actualizado correctamente");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── HABILIDADES ──────────────────────────────────────────────────────────
  const addHabilidad = (value: string) => {
    const trimmed = value.replace(/,/g, "").trim();
    if (trimmed && !habilidades.includes(trimmed)) {
      setHabilidades([...habilidades, trimmed]);
    }
    setHabilidadInput("");
  };

  const removeHabilidad = (h: string) => {
    setHabilidades(habilidades.filter((x) => x !== h));
  };

  // ── COLOR DE COMPLETITUD ─────────────────────────────────────────────────
  const getCompletitudColor = (pct: number) => {
    if (pct >= 80) return "bg-[#16a34a]"; // verde
    if (pct >= 50) return "bg-primary";    // azul
    return "bg-orange";                    // naranja
  };

  // ── PANTALLA DE CARGA ────────────────────────────────────────────────────
  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-on-surface-variant font-body-md text-body-md">Cargando perfil...</p>
          </div>
        </div>
    );
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
      <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pt-16">

        {/* NavBar */}
        <nav className="bg-surface border-b border-outline-variant shadow-sm fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-xl h-16 max-w-container-max mx-auto left-0 right-0">
          <div className="flex items-center gap-xl">
            <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">EmpleoUni</span>
            <div className="hidden md:flex gap-md font-body-md text-body-md">
              <a className="text-on-surface-variant hover:text-primary transition-colors" href="/vacantes">Vacantes</a>
              <a className="text-primary border-b-2 border-primary pb-1" href="/perfil">Mi Perfil</a>
            </div>
          </div>
          <button
              onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}
              className="font-label-md text-label-md text-on-primary bg-primary rounded px-md py-xs hover:bg-on-surface-variant transition-colors shadow-level-1"
          >
            Cerrar sesión
          </button>
        </nav>

        <main className="flex-1 w-full max-w-container-max mx-auto px-margin-mobile md:px-xl py-lg">

          {/* Encabezado con completitud */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-lg gap-sm">
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Mi Perfil</h1>

            {perfil && (
                <div className="flex items-center gap-sm bg-surface border border-outline-variant rounded-lg px-md py-sm shadow-level-1">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Completitud</span>
                  <div className="w-32 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${getCompletitudColor(perfil.completitud)}`}
                        style={{ width: `${perfil.completitud}%` }}
                    />
                  </div>
                  <span className="font-label-md text-label-md font-semibold text-primary">
                                {perfil.completitud}%
                            </span>
                </div>
            )}
          </div>

          {/* Mensajes de estado */}
          {error && !perfil && (
              <div className="mb-lg p-md bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm">
                {error}
              </div>
          )}

          {perfil ? (
              <div className="flex flex-col gap-lg">
                {/* Feedback de guardado */}
                {error && (
                    <div className="p-sm bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {error}
                    </div>
                )}
                {successMsg && (
                    <div className="p-sm bg-[#dcfce7] text-[#166534] rounded-lg font-body-sm text-body-sm flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {successMsg}
                    </div>
                )}

                {/* Tarjeta principal del formulario */}
                <div className="bg-surface border border-outline-variant rounded-xl shadow-level-1 p-lg flex flex-col gap-lg">

                  {/* Correo (solo lectura) */}
                  <div>
                    <label className="font-label-md text-label-md text-on-surface-variant block mb-xs">
                      Correo electrónico
                    </label>
                    <div className="bg-surface-container rounded px-sm py-xs font-body-md text-body-md text-on-surface-variant border border-outline-variant">
                      {perfil.email}
                    </div>
                  </div>

                  {/* Nombre */}
                  <div>
                    <label htmlFor="nombre" className="font-label-md text-label-md text-on-surface-variant block mb-xs">
                      Nombre completo
                    </label>
                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Tu nombre completo"
                        className="w-full border border-outline-variant rounded px-sm py-xs font-body-md text-body-md text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label htmlFor="bio" className="font-label-md text-label-md text-on-surface-variant block mb-xs">
                      Sobre mí
                    </label>
                    <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Cuéntanos sobre ti, tus intereses y objetivos profesionales..."
                        rows={4}
                        className="w-full border border-outline-variant rounded px-sm py-xs font-body-md text-body-md text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                      +15% de completitud al agregar tu bio
                    </p>
                  </div>

                  {/* Universidad y Programa */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div>
                      <label htmlFor="universidad" className="font-label-md text-label-md text-on-surface-variant block mb-xs">
                        Universidad
                      </label>
                      <input
                          id="universidad"
                          type="text"
                          value={universidad}
                          onChange={(e) => setUniversidad(e.target.value)}
                          placeholder="Ej: Corporación Universitaria Alexander Von Humboldt"
                          className="w-full border border-outline-variant rounded px-sm py-xs font-body-md text-body-md text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="programa" className="font-label-md text-label-md text-on-surface-variant block mb-xs">
                        Programa académico
                      </label>
                      <input
                          id="programa"
                          type="text"
                          value={programa}
                          onChange={(e) => setPrograma(e.target.value)}
                          placeholder="Ej: Ingeniería de Software"
                          className="w-full border border-outline-variant rounded px-sm py-xs font-body-md text-body-md text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Semestre */}
                  <div>
                    <label htmlFor="semestre" className="font-label-md text-label-md text-on-surface-variant block mb-xs">
                      Semestre actual
                    </label>
                    <select
                        id="semestre"
                        value={semestre}
                        onChange={(e) => setSemestre(e.target.value)}
                        className="w-36 border border-outline-variant rounded px-sm py-xs font-body-md text-body-md text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Selecciona</option>
                      {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}° semestre
                          </option>
                      ))}
                    </select>
                  </div>

                  {/* Habilidades (tag input) */}
                  <div>
                    <label className="font-label-md text-label-md text-on-surface-variant block mb-xs">
                      Habilidades técnicas
                    </label>

                    {/* Tags existentes */}
                    {habilidades.length > 0 && (
                        <div className="flex flex-wrap gap-xs mb-sm" role="list" aria-label="Habilidades agregadas">
                          {habilidades.map((h) => (
                              <span
                                  key={h}
                                  role="listitem"
                                  className="flex items-center gap-[2px] bg-primary-container text-on-primary-container font-label-sm text-label-sm px-2 py-1 rounded-full"
                              >
                                                {h}
                                <button
                                    type="button"
                                    onClick={() => removeHabilidad(h)}
                                    aria-label={`Eliminar habilidad ${h}`}
                                    className="ml-[2px] hover:text-error transition-colors"
                                >
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            </span>
                          ))}
                        </div>
                    )}

                    {/* Input para agregar */}
                    <div className="flex gap-xs">
                      <input
                          type="text"
                          value={habilidadInput}
                          onChange={(e) => setHabilidadInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              addHabilidad(habilidadInput);
                            }
                          }}
                          placeholder="Ej: React, TypeScript, Docker..."
                          aria-label="Agregar habilidad"
                          className="flex-1 border border-outline-variant rounded px-sm py-xs font-body-md text-body-md text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                          type="button"
                          onClick={() => addHabilidad(habilidadInput)}
                          className="px-sm py-xs bg-surface border border-outline-variant text-on-surface font-label-md text-label-md rounded hover:bg-surface-container-low transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                      Presiona Enter o coma para agregar · 3+ habilidades suman +20% de completitud
                    </p>
                  </div>

                  {/* Botón guardar */}
                  <div className="flex justify-end pt-sm border-t border-outline-variant">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-lg py-sm bg-primary text-on-primary font-label-lg text-label-lg rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-xs"
                    >
                      {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                            Guardando...
                          </>
                      ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Guardar cambios
                          </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Tarjeta de tips de completitud */}
                <div className="bg-surface border border-outline-variant rounded-xl shadow-level-1 p-md">
                  <h2 className="font-title-md text-title-md font-semibold text-on-surface mb-sm flex items-center gap-xs">
                    <span className="material-symbols-outlined text-primary text-[18px]">tips_and_updates</span>
                    Mejora tu perfil
                  </h2>
                  <ul className="flex flex-col gap-xs font-body-sm text-body-sm text-on-surface-variant">
                    <li className={`flex items-center gap-xs ${bio ? "line-through opacity-50" : ""}`}>
                      <span className="material-symbols-outlined text-[14px]">{bio ? "check_circle" : "radio_button_unchecked"}</span>
                      Agrega una descripción sobre ti (+15%)
                    </li>
                    <li className={`flex items-center gap-xs ${universidad ? "line-through opacity-50" : ""}`}>
                      <span className="material-symbols-outlined text-[14px]">{universidad ? "check_circle" : "radio_button_unchecked"}</span>
                      Indica tu universidad (+10%)
                    </li>
                    <li className={`flex items-center gap-xs ${programa ? "line-through opacity-50" : ""}`}>
                      <span className="material-symbols-outlined text-[14px]">{programa ? "check_circle" : "radio_button_unchecked"}</span>
                      Agrega tu programa académico (+10%)
                    </li>
                    <li className={`flex items-center gap-xs ${semestre ? "line-through opacity-50" : ""}`}>
                      <span className="material-symbols-outlined text-[14px]">{semestre ? "check_circle" : "radio_button_unchecked"}</span>
                      Indica tu semestre actual (+5%)
                    </li>
                    <li className={`flex items-center gap-xs ${habilidades.length >= 3 ? "line-through opacity-50" : ""}`}>
                      <span className="material-symbols-outlined text-[14px]">{habilidades.length >= 3 ? "check_circle" : "radio_button_unchecked"}</span>
                      Agrega al menos 3 habilidades (+20%)
                    </li>
                  </ul>
                </div>
              </div>
          ) : (
              /* Perfil no encontrado */
              <div className="bg-surface border border-outline-variant rounded-xl p-lg text-center flex flex-col items-center gap-md">
                <span className="material-symbols-outlined text-on-surface-variant text-[48px]">person_off</span>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {error ?? "No se encontró el perfil."}
                </p>
                <button
                    onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}
                    className="px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded hover:opacity-90 transition-opacity"
                >
                  Volver al inicio de sesión
                </button>
              </div>
          )}\r\n\r\n          {/* ── MIS POSTULACIONES ─────────────────────────────────────────── */}
          <div className="bg-surface border border-outline-variant rounded-xl shadow-level-1 p-md">
            <h2 className="font-title-md text-title-md font-semibold text-on-surface mb-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary text-[18px]">work_history</span>
              Mis postulaciones
            </h2>

            {postulacionesLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : postulaciones.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px]">inbox</span>
                  <p className="font-body-sm text-body-sm">Aún no te has postulado a ninguna vacante.</p>
                  <a href="/vacantes" className="text-sm font-semibold text-primary hover:underline">Ver vacantes disponibles</a>
                </div>
            ) : (
                <div className="flex flex-col gap-sm">
                  {postulaciones.map((p) => (
                      <div key={p.id} className="border border-outline-variant rounded-lg p-sm flex flex-col md:flex-row md:items-center md:justify-between gap-xs bg-surface-container-low">
                        <div className="flex flex-col gap-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        ID vacante: <span className="font-mono text-xs">{p.vacanteId}</span>
                      </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Disponibilidad: {p.disponibilidad}
                      </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Expectativa salarial: {p.expectativaSalarial}
                      </span>
                        </div>
                        <div className="flex items-center gap-sm">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          p.estado === "aceptada"   ? "bg-[#e8f5e9] text-[#1b5e20]" :
                              p.estado === "rechazada"  ? "bg-[#ffdad6] text-[#93000a]" :
                                  p.estado === "entrevista" ? "bg-[#e0e7ff] text-[#3730a3]" :
                                      p.estado === "vista"      ? "bg-[#fef9c3] text-[#854d0e]" :
                                          "bg-surface-variant text-on-surface-variant"
                      }`}>
                        {p.estado === "enviada"    ? "Enviada" :
                            p.estado === "vista"      ? "Vista por la empresa" :
                                p.estado === "entrevista" ? "En proceso" :
                                    p.estado === "aceptada"   ? "Aceptada ✓" :
                                        p.estado === "rechazada"  ? "No seleccionado" : p.estado}
                      </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                        </div>
                      </div>
                  ))}
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
            <a className="text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">Contacto</a>
            <a className="text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">Términos y Condiciones</a>
            <a className="text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">Privacidad</a>
          </div>
        </footer>
      </div>
  );
}