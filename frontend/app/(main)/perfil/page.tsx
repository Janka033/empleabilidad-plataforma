// frontend/app/(main)/perfil/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Interface for User Profile Data
interface UserProfile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  universidad: string;
  programa: string;
  semestre: string;
  bio: string;
  habilidades: string[];
  // Add other profile fields as needed
}

// Interface for Postulation Data
interface Postulacion {
  id: string;
  vacante: string;
  empresa: string;
  fecha: string; // Date string
  estado: "enviada" | "vista" | "entrevista" | "aceptada" | "rechazada" | string;
  // Add other postulation fields as needed
}

export default function PerfilPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // States for editable fields
  const [editUniversidad, setEditUniversidad] = useState("");
  const [editPrograma, setEditPrograma] = useState("");
  const [editSemestre, setEditSemestre] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHabilidades, setEditHabilidades] = useState<string[]>([]);
  const [newHabilidad, setNewHabilidad] = useState("");

  const PERFILES_URL = process.env.NEXT_PUBLIC_PERFILES_URL || "http://localhost:3002";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }

        const profileResponse = await fetch(`${PERFILES_URL}/perfiles/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Si no existe perfil, crearlo automáticamente
        if (profileResponse.status === 404) {
          const createResponse = await fetch(`${PERFILES_URL}/perfiles`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          });
          if (!createResponse.ok) {
            throw new Error("No se pudo crear el perfil.");
          }
          const newProfile: UserProfile = await createResponse.json();
          setProfile(newProfile);
          setEditUniversidad(newProfile.universidad || "");
          setEditPrograma(newProfile.programa || "");
          setEditSemestre(newProfile.semestre || "");
          setEditBio(newProfile.bio || "");
          setEditHabilidades(newProfile.habilidades || []);
        } else if (!profileResponse.ok) {
          throw new Error("Error al cargar el perfil.");
        } else {
          const profileData: UserProfile = await profileResponse.json();
          setProfile(profileData);
          setEditUniversidad(profileData.universidad || "");
          setEditPrograma(profileData.programa || "");
          setEditSemestre(profileData.semestre || "");
          setEditBio(profileData.bio || "");
          setEditHabilidades(profileData.habilidades || []);
        }

        // Postulaciones — si falla no rompe la página
        try {
          const postResponse = await fetch(`${PERFILES_URL}/postulaciones/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (postResponse.ok) {
            const postData: Postulacion[] = await postResponse.json();
            setPostulaciones(postData);
          }
        } catch { /* postulaciones vacías por ahora */ }

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, PERFILES_URL]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("No autorizado. Por favor, inicia sesión de nuevo.");
      setLoading(false);
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(`${PERFILES_URL}/perfiles/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          universidad: editUniversidad,
          programa: editPrograma,
          semestre: editSemestre,
          bio: editBio,
          habilidades: editHabilidades,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el perfil.");
      }

      const updatedProfile: UserProfile = await response.json();
      setProfile(updatedProfile); // Update local state with the saved profile
      setIsEditing(false); // Exit edit mode
    }  catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Ocurrió un error inesperado al guardar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddHabilidad = () => {
    if (newHabilidad.trim() !== "" && !editHabilidades.includes(newHabilidad.trim())) {
      setEditHabilidades([...editHabilidades, newHabilidad.trim()]);
      setNewHabilidad("");
    }
  };

  const handleRemoveHabilidad = (habilidadToRemove: string) => {
    setEditHabilidades(editHabilidades.filter(h => h !== habilidadToRemove));
  };

  const getPostulationStatusClasses = (estado: Postulacion["estado"]) => {
    switch (estado) {
      case "enviada":
        return "bg-primary-fixed text-on-primary-fixed-variant"; // Blueish
      case "vista":
        return "bg-tertiary-fixed text-on-tertiary-fixed-variant"; // Orange/Brownish
      case "entrevista":
        return "bg-surface-tint text-on-primary"; // Darker Blue/Purple
      case "aceptada":
        return "bg-[#e8f5e9] text-[#1b5e20]"; // Green
      case "rechazada":
        return "bg-error-container text-on-error-container"; // Red
      default:
        return "bg-secondary-container text-on-secondary-container"; // Default neutral
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <p className="text-primary">Cargando datos del perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <p className="text-error p-4 bg-error-container rounded-md">{error}</p>
        <button onClick={() => router.push("/login")} className="ml-4 px-4 py-2 bg-primary text-on-primary rounded">
          Volver a Iniciar Sesión
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <p className="text-error">No se pudo cargar la información del perfil.</p>
      </div>
    );
  }

  // Calculate profile completion percentage (mock data for now)
  const profileCompletion = 85; // Placeholder value

  return (
    <>
      <div className="bg-background text-on-background antialiased font-body-md text-body-md">
        {/* TopNavBar */}
        <header className="bg-surface border-b border-outline-variant shadow-sm fixed top-0 w-full z-50">
          <div className="flex justify-between items-center px-margin-mobile md:px-xl h-16 max-w-container-max mx-auto">
            {/* Brand */}
            <div className="font-headline-md text-headline-md font-bold text-primary">
              EmpleoUni
            </div>
            {/* Navigation */}
            <nav className="hidden md:flex gap-lg h-full items-center">
              <a
                className="text-on-surface-variant font-body-md text-body-md hover:text-primary transition-colors flex items-center h-full pt-1"
                href="/vacantes"
              >
                Vacantes
              </a>
              <a
                className="text-primary font-body-md text-body-md border-b-2 border-primary pb-1 flex items-center h-full pt-[6px]"
                href="/perfil"
              >
                Mi Perfil
              </a>
            </nav>
            {/* Actions */}
            <div className="flex items-center gap-md">
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  router.push("/login");
                }}
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors scale-95 active:scale-90"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="pt-24 pb-xl px-margin-mobile md:px-xl max-w-container-max mx-auto min-h-screen">
          {/* Profile Header */}
          <section className="bg-primary-container rounded-xl p-md md:p-lg flex flex-col md:flex-row items-center md:items-start gap-md shadow-lg relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-surface-tint opacity-20 rounded-full blur-3xl pointer-events-none"></div>
            {/* Avatar */}
            <div className="w-24 h-24 shrink-0 rounded-full bg-inverse-primary flex items-center justify-center font-headline-lg text-headline-lg text-primary-container shadow-sm border-2 border-surface">
              {profile.nombre ? profile.nombre.charAt(0).toUpperCase() : ""}{profile.apellido ? profile.apellido.charAt(0).toUpperCase() : ""}
            </div>
            {/* Info */}
            <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full z-10">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={`${profile.nombre} ${profile.apellido}`}
                    readOnly
                    className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-primary mb-xs bg-transparent border-none focus:ring-0"
                  />
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-xs md:gap-md text-inverse-primary font-body-sm text-body-sm">
                    <div className="flex items-center gap-base">
                      <span className="material-symbols-outlined text-[16px]">school</span>
                      <input
                        type="text"
                        value={editUniversidad}
                        onChange={(e) => setEditUniversidad(e.target.value)}
                        className="bg-transparent border-b border-inverse-primary focus:outline-none focus:border-white text-inverse-primary"
                      />
                    </div>
                    <div className="hidden md:block w-1 h-1 rounded-full bg-inverse-primary/50"></div>
                    <div className="flex items-center gap-base">
                      <span className="material-symbols-outlined text-[16px]">book</span>
                      <input
                        type="text"
                        value={editPrograma}
                        onChange={(e) => setEditPrograma(e.target.value)}
                        className="bg-transparent border-b border-inverse-primary focus:outline-none focus:border-white text-inverse-primary"
                      />
                    </div>
                    <div className="hidden md:block w-1 h-1 rounded-full bg-inverse-primary/50"></div>
                    <div className="flex items-center gap-base">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <input
                        type="text"
                        value={editSemestre}
                        onChange={(e) => setEditSemestre(e.target.value)}
                        className="bg-transparent border-b border-inverse-primary focus:outline-none focus:border-white text-inverse-primary"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-primary mb-xs">
                    {profile.nombre} {profile.apellido}
                  </h1>
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-xs md:gap-md text-inverse-primary font-body-sm text-body-sm">
                    <div className="flex items-center gap-base">
                      <span className="material-symbols-outlined text-[16px]">school</span>
                      {profile.universidad}
                    </div>
                    <div className="hidden md:block w-1 h-1 rounded-full bg-inverse-primary/50"></div>
                    <div className="flex items-center gap-base">
                      <span className="material-symbols-outlined text-[16px]">book</span>
                      {profile.programa}
                    </div>
                    <div className="hidden md:block w-1 h-1 rounded-full bg-inverse-primary/50"></div>
                    <div className="flex items-center gap-base">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {profile.semestre}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* CTA */}
            <div className="mt-sm md:mt-0 z-10">
              {isEditing ? (
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-base border border-inverse-primary bg-inverse-primary text-primary-container px-sm py-xs rounded transition-all font-label-md text-label-md hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-base border border-inverse-primary text-inverse-primary hover:bg-inverse-primary hover:text-primary-container px-sm py-xs rounded transition-all font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Editar perfil
                </button>
              )}
            </div>
          </section>

          {/* Stats Row */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-md mt-md">
            {/* Stat 1 */}
            <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-xs text-on-surface-variant font-label-md text-label-md mb-xs">
                <span className="material-symbols-outlined text-[20px]">send</span>
                Postulaciones
              </div>
              <div className="font-headline-lg text-headline-lg text-on-surface">{postulaciones.length}</div>
            </div>
            {/* Stat 2 */}
            <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-xs text-on-surface-variant font-label-md text-label-md mb-xs">
                <span className="material-symbols-outlined text-[20px]">visibility</span>
                Vacantes vistas
              </div>
              <div className="font-headline-lg text-headline-lg text-on-surface">45</div> {/* Placeholder */}
            </div>
            {/* Stat 3: Progress */}
            <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md mb-sm">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  Perfil completo
                </div>
                <span className="text-primary-container font-bold">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden mt-auto">
                <div
                  className="bg-primary-container h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
            </div>
          </section>

          {/* Main Layout: 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-lg">
            {/* Left Column: Bio & Skills & Experience */}
            <div className="md:col-span-1 flex flex-col gap-lg">
              {/* Bio Section */}
              <section className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant shadow-sm">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Acerca de mí</h2>
                {isEditing ? (
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full h-32 p-2 border border-outline-variant rounded-md bg-surface-container-low text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  />
                ) : (
                  <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap">
                    {profile.bio || "No hay biografía disponible. ¡Edita tu perfil para agregar una!"}
                  </p>
                )}
              </section>

              {/* Skills Section */}
              <section className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant shadow-sm">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Habilidades</h2>
                <div className="flex flex-wrap gap-xs">
                  {isEditing ? (
                    <>
                      {editHabilidades.map((habilidad, index) => (
                        <span key={index} className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                          {habilidad}
                          <button onClick={() => handleRemoveHabilidad(habilidad)} className="ml-1 text-on-secondary-container/70 hover:text-on-secondary-container">
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))}
                      <div className="flex items-center gap-xs">
                        <input
                          type="text"
                          value={newHabilidad}
                          onChange={(e) => setNewHabilidad(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddHabilidad();
                            }
                          }}
                          placeholder="Nueva habilidad"
                          className="p-1 border border-outline-variant rounded-md bg-surface-container-low text-on-surface text-label-sm focus:outline-none focus:border-primary-container"
                        />
                        <button onClick={handleAddHabilidad} className="border border-outline border-dashed text-on-surface-variant px-3 py-1 rounded-full font-label-sm text-label-sm hover:bg-surface-variant transition-colors flex items-center gap-base">
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          Agregar
                        </button>
                      </div>
                    </>
                  ) : (
                    profile.habilidades && profile.habilidades.length > 0 ? (
                      profile.habilidades.map((habilidad, index) => (
                        <span key={index} className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-label-sm">
                          {habilidad}
                        </span>
                      ))
                    ) : (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">No hay habilidades registradas.</p>
                    )
                  )}
                </div>
              </section>

              {/* Work Experience (Static for now, as no edit logic requested) */}
              <section className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant shadow-sm">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Experiencia</h2>
                <div className="relative pl-sm border-l-2 border-surface-variant">
                  {/* Timeline Item 1 */}
                  <div className="mb-md relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 bg-primary-container rounded-full ring-4 ring-surface-container-lowest"></div>
                    <h3 className="font-label-md text-label-md text-on-surface">Desarrollador Junior</h3>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-base">Tech Solutions</div>
                    <div className="font-body-sm text-body-sm text-outline mt-base">Ene 2023 - Presente</div>
                  </div>
                  {/* Timeline Item 2 */}
                  <div className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 bg-surface-variant rounded-full ring-4 ring-surface-container-lowest"></div>
                    <h3 className="font-label-md text-label-md text-on-surface">Pasante de TI</h3>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-base">Innovatech SAS</div>
                    <div className="font-body-sm text-body-sm text-outline mt-base">Jun 2022 - Dic 2022</div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Postulation History Table */}
            <div className="md:col-span-2">
              <section className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-md border-b border-surface-variant flex justify-between items-center bg-surface-bright">
                  <h2 className="font-headline-md text-headline-md text-on-surface">Historial de Postulaciones</h2>
                  <button onClick={() => router.push("/postulaciones")} className="text-primary font-label-sm text-label-sm hover:underline">Ver todas</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface text-on-surface-variant font-label-md text-label-md border-b border-surface-variant">
                        <th className="p-sm font-semibold">Vacante</th>
                        <th className="p-sm font-semibold">Empresa</th>
                        <th className="p-sm font-semibold">Fecha</th>
                        <th className="p-sm font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-surface-variant">
                      {postulaciones.length > 0 ? (
                        postulaciones.map((postulacion) => (
                          <tr key={postulacion.id} className="hover:bg-surface-container-low transition-colors">
                            <td className="p-sm font-medium">{postulacion.vacante}</td>
                            <td className="p-sm">{postulacion.empresa}</td>
                            <td className="p-sm text-on-surface-variant">{new Date(postulacion.fecha).toLocaleDateString("es-ES")}</td>
                            <td className="p-sm">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-sm text-label-sm ${getPostulationStatusClasses(postulacion.estado)}`}>
                                {postulacion.estado.charAt(0).toUpperCase() + postulacion.estado.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-sm text-center text-on-surface-variant">
                            No tienes postulaciones recientes.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-surface-container-highest w-full mt-auto">
          <div className="w-full py-lg px-margin-mobile md:px-xl flex flex-col md:flex-row justify-between items-center gap-md max-w-container-max mx-auto">
            <div className="font-headline-md text-headline-md font-bold text-primary text-center md:text-left">
              EmpleoUni
              <div className="font-body-sm text-body-sm text-on-surface font-normal mt-base">
                © 2024 EmpleoUni - Talento Universitario Colombiano
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-md font-body-sm text-body-sm text-on-surface-variant">
              <a className="hover:underline transition-all opacity-80 hover:opacity-100" href="#">Contacto</a>
              <a className="hover:underline transition-all opacity-80 hover:opacity-100" href="#">Términos y Condiciones</a>
              <a className="hover:underline transition-all opacity-80 hover:opacity-100" href="#">Privacidad</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
