// frontend/app/(main)/postular/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Define the shape of the Vacante object
interface Vacante {
    id: string;
    titulo: string;
    empresa: string;
    modalidad: string;
    ubicacion: string;
    salario: string;
    descripcion: string;
    requisitos: string[];
    logoUrl?: string;
}

// Tipo para el error
interface ApiError {
    message?: string;
}

export default function PostularPage() {
    const router = useRouter();

    const [vacante, setVacante] = useState<Vacante | null>(null);
    const [shortCoverLetter, setShortCoverLetter] = useState("");
    const [cartaMotivacion, setCartaMotivacion] = useState("");
    const [expectativaSalarial, setExpectativaSalarial] = useState("");
    const [disponibilidad, setDisponibilidad] = useState("");
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [charCountShortCoverLetter, setCharCountShortCoverLetter] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [shouldRedirect, setShouldRedirect] = useState(false);

    // Constants
    const PERFILES_URL = process.env.NEXT_PUBLIC_PERFILES_URL || "http://localhost:3002";

    // Efecto para cargar la vacante (corregido - sin setState síncrono conflictivo)
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const vacantePostularString = localStorage.getItem("vacantePostular");
        if (vacantePostularString) {
            try {
                const parsedVacante: Vacante = JSON.parse(vacantePostularString);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setVacante(parsedVacante);
            } catch (e) {
                console.error("Error parsing vacantePostular from localStorage", e);
                setError("Error al cargar la información de la vacante.");
            }
        } else {
            setError("No se encontró la vacante para postular.");
            setShouldRedirect(true);
        }
    }, [router]);

    // Efecto separado para la redirección (evita el warning)
    useEffect(() => {
        if (shouldRedirect) {
            router.push("/vacantes");
        }
    }, [shouldRedirect, router]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!vacante) {
            setError("No hay vacante seleccionada para postular.");
            return;
        }
        if (!disponibilidad) {
            setError("Por favor, selecciona tu disponibilidad de inicio.");
            return;
        }
        if (!expectativaSalarial) {
            setError("Por favor, ingresa tu expectativa salarial.");
            return;
        }
        if (!cartaMotivacion) {
            setError("Por favor, cuéntanos por qué eres el candidato ideal.");
            return;
        }

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
            const response = await fetch(`${PERFILES_URL}/postulaciones`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    vacanteId: vacante.id,
                    cartaMotivacion,
                    expectativaSalarial: parseFloat(expectativaSalarial),
                    disponibilidad,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json() as ApiError;
                throw new Error(errorData.message || `Error: ${response.status} ${response.statusText}`);
            }

            // Clear form fields and show success modal
            setShortCoverLetter("");
            setCartaMotivacion("");
            setExpectativaSalarial("");
            setDisponibilidad("");
            setCvFile(null);
            setCharCountShortCoverLetter(0);
            setShowSuccessModal(true);
            localStorage.removeItem("vacantePostular");
        } catch (err: unknown) {
            // ⚠️ Error corregido: en lugar de 'any', usamos 'unknown' y verificamos el tipo
            if (err instanceof Error) {
                setError(err.message || "Ocurrió un error inesperado al enviar la postulación.");
            } else {
                setError("Ocurrió un error inesperado al enviar la postulación.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!vacante && !error && !shouldRedirect) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
                <p className="text-primary">Cargando información de la vacante...</p>
            </div>
        );
    }

    if (error && !vacante) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
                <p className="text-error">{error}</p>
                <button
                    onClick={() => router.push("/vacantes")}
                    className="ml-4 px-4 py-2 bg-primary text-on-primary rounded"
                >
                    Volver a Vacantes
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="bg-background text-on-background min-h-screen flex flex-col pt-16 font-sans">
                {/* TopNavBar Component */}
                <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-xl h-16 max-w-container-max mx-auto bg-surface border-b border-outline-variant shadow-sm transition-transform">
                    <div className="flex items-center gap-md">
            <span className="font-headline-md text-headline-md font-bold text-primary">
              EmpleoUni
            </span>
                    </div>
                    <div className="hidden md:flex items-center gap-lg">
                        <a
                            className="font-body-md text-body-md text-primary border-b-2 border-primary pb-1 scale-95 active:scale-90 transition-transform"
                            href="/vacantes"
                        >
                            Vacantes
                        </a>
                        <a
                            className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors scale-95 active:scale-90 transition-transform"
                            href="/perfil"
                        >
                            Mi Perfil
                        </a>
                    </div>
                    <div className="flex items-center gap-md">
                        <button
                            onClick={() => {
                                localStorage.removeItem("token");
                                router.push("/login");
                            }}
                            className="font-label-md text-label-md bg-primary-container text-on-primary px-4 py-2 rounded font-bold hover:opacity-90 transition-opacity"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </nav>

                {/* Main Content Canvas */}
                <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-xl py-lg md:py-xl flex flex-col gap-lg">
                    <header className="w-full">
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-xs font-label-md text-label-md text-on-surface-variant border border-outline-variant px-3 py-1.5 rounded-full hover:bg-surface-variant transition-colors bg-transparent w-fit"
                        >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Volver a vacantes
                        </button>
                    </header>

                    {/* Two Column Layout Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-lg md:gap-xl items-start">
                        {/* LEFT COLUMN: Job Detail Card */}
                        <aside className="col-span-1 md:col-span-5 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm p-md flex flex-col gap-md h-auto md:sticky md:top-24">
                            <div className="flex flex-col gap-sm">
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low flex items-center justify-center">
                                    <img
                                        alt={vacante?.empresa || "Company Logo placeholder"}
                                        className="object-cover w-full h-full"
                                        src={
                                            vacante?.logoUrl ||
                                            "https://lh3.googleusercontent.com/aida-public/AB6AXuA072duUR-a5tlnppt8_GJKK6mMgnlUMFAeHwnPNsBYEV8ABDrjVrXbGA-Dgmxy9wzN7lHGAmKABaS5kjntlcydj0pnP1JKVRNc0p-7WsbShvr97evGypi8glrwogYpdkj-0K612k5-X1hRMhqVkjfPqnafnlAVnE000YgAiBXrm3jSDD1QUvdm-JjjcDKoAFbkSxGC37AwPsbF1vzsCrOE9JwpReKl-1iEE3C82sVxptj-BIFgmv2LKR1SOiYPFEV_SAHoFx3l5K4"
                                        }
                                    />
                                </div>
                                <div>
                                    <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-1">
                                        {vacante?.titulo}
                                    </h1>
                                    <p className="font-body-md text-body-md text-on-surface-variant">
                                        {vacante?.empresa}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-xs">
                <span className="px-2 py-1 rounded bg-surface-variant text-on-surface font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">work</span>{" "}
                    {vacante?.modalidad}
                </span>
                                <span className="px-2 py-1 rounded bg-surface-variant text-on-surface font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>{" "}
                                    {vacante?.ubicacion}
                </span>
                                <span className="px-2 py-1 rounded bg-[#e8f5e9] text-[#1b5e20] font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">payments</span>{" "}
                                    {vacante?.salario}
                </span>
                            </div>
                            <hr className="border-outline-variant w-full" />

                            <div className="flex flex-col gap-xs">
                                <h3 className="font-label-md text-label-md text-primary">
                                    Descripción del rol
                                </h3>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">
                                    {vacante?.descripcion}
                                </p>
                            </div>

                            <div className="flex flex-col gap-xs">
                                <h3 className="font-label-md text-label-md text-primary">
                                    Requisitos clave
                                </h3>
                                <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
                                    {vacante?.requisitos && vacante.requisitos.map((req, index) => (
                                        <li key={index} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary-container mt-0.5">
                        check_circle
                      </span>
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </aside>

                        {/* RIGHT COLUMN: Application Form */}
                        <section className="col-span-1 md:col-span-7">
                            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-md md:p-lg flex flex-col gap-lg">
                                <div className="flex flex-col gap-xs">
                                    <h2 className="font-headline-md text-headline-md text-primary">
                                        Completa tu postulación
                                    </h2>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        Revisa cuidadosamente la información antes de enviarla. Tu perfil
                                        académico será adjuntado automáticamente.
                                    </p>
                                </div>

                                {error && (
                                    <div className="text-error font-bold text-center p-2 rounded-md bg-error-container">
                                        {error}
                                    </div>
                                )}

                                <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
                                    {/* File Upload */}
                                    <div className="flex flex-col gap-xs">
                                        <label className="font-label-md text-label-md text-primary">
                                            Subir hoja de vida <span className="text-error">*</span>
                                        </label>
                                        <div className="w-full border-2 border-dashed border-outline-variant rounded-lg bg-surface-container-low hover:bg-surface-variant transition-colors p-lg flex flex-col items-center justify-center gap-sm group">
                      <span className="material-symbols-outlined text-[40px] text-on-surface-variant group-hover:text-primary-container transition-colors">
                        picture_as_pdf
                      </span>
                                            <div className="text-center flex flex-col gap-1">
                        <span className="font-body-md text-body-md text-primary">
                          {cvFile ? cvFile.name : "Selecciona un archivo PDF"}
                        </span>
                                                <span className="font-body-sm text-body-sm text-on-surface-variant">
                          o arrástralo y suéltalo aquí (Max 5MB)
                        </span>
                                            </div>
                                            <input
                                                accept=".pdf"
                                                className="hidden"
                                                type="file"
                                                onChange={(e) => setCvFile(e.target.files ? e.target.files[0] : null)}
                                            />
                                        </div>
                                    </div>

                                    {/* Disponibilidad de inicio */}
                                    <div className="flex flex-col gap-xs">
                                        <label className="font-label-md text-label-md text-primary" htmlFor="disponibilidad">
                                            Disponibilidad de inicio <span className="text-error">*</span>
                                        </label>
                                        <div className="relative w-full md:w-1/2">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                        calendar_month
                      </span>
                                            <input
                                                className="w-full pl-10 pr-4 py-3 rounded border border-outline-variant bg-surface-container-lowest font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                                                id="disponibilidad"
                                                required
                                                type="date"
                                                value={disponibilidad}
                                                onChange={(e) => setDisponibilidad(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Expectativa Salarial */}
                                    <div className="flex flex-col gap-xs">
                                        <label className="font-label-md text-label-md text-primary" htmlFor="expectativaSalarial">
                                            Expectativa Salarial (COP) <span className="text-error">*</span>
                                        </label>
                                        <input
                                            className="w-full px-4 py-3 rounded border border-outline-variant bg-surface-container-lowest font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                                            id="expectativaSalarial"
                                            required
                                            type="number"
                                            placeholder="Ej: 3000000"
                                            value={expectativaSalarial}
                                            onChange={(e) => setExpectativaSalarial(e.target.value)}
                                        />
                                    </div>

                                    {/* Carta de presentación breve */}
                                    <div className="flex flex-col gap-xs">
                                        <div className="flex justify-between items-end">
                                            <label className="font-label-md text-label-md text-primary" htmlFor="shortCoverLetter">
                                                Carta de presentación (Breve)
                                            </label>
                                            <span className="font-label-sm text-label-sm text-on-surface-variant" id="char-count-1">
                        {charCountShortCoverLetter}/300
                      </span>
                                        </div>
                                        <textarea
                                            className="w-full px-4 py-3 rounded border border-outline-variant bg-surface-container-lowest font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all resize-none"
                                            id="shortCoverLetter"
                                            maxLength={300}
                                            rows={3}
                                            placeholder="Destaca brevemente tu interés en esta empresa..."
                                            value={shortCoverLetter}
                                            onChange={(e) => {
                                                setShortCoverLetter(e.target.value);
                                                setCharCountShortCoverLetter(e.target.value.length);
                                            }}
                                        ></textarea>
                                    </div>

                                    {/* ¿Por qué eres el candidato ideal? */}
                                    <div className="flex flex-col gap-xs">
                                        <label className="font-label-md text-label-md text-primary" htmlFor="idealCandidate">
                                            ¿Por qué eres el candidato ideal? <span className="text-error">*</span>
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-3 rounded border border-outline-variant bg-surface-container-lowest font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all resize-y"
                                            id="idealCandidate"
                                            placeholder="Cuéntanos sobre tus habilidades, proyectos académicos relevantes o experiencias previas que te hacen el fit perfecto para este rol..."
                                            required
                                            rows={5}
                                            value={cartaMotivacion}
                                            onChange={(e) => setCartaMotivacion(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="w-full flex items-center gap-sm my-xs">
                                        <div className="flex-grow h-px bg-outline-variant"></div>
                                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Paso final
                    </span>
                                        <div className="flex-grow h-px bg-outline-variant"></div>
                                    </div>

                                    <div className="flex justify-end pt-xs">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full md:w-auto font-label-md text-label-md font-bold px-xl py-3 rounded bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm hover:shadow-lg flex items-center justify-center gap-2"
                                        >
                                            {loading ? "Enviando..." : "Enviar postulación"}
                                            <span className="material-symbols-outlined text-[18px]">send</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </section>
                    </div>
                </main>

                {/* Success Modal */}
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[100] bg-inverse-surface/80 backdrop-blur-sm flex items-center justify-center p-margin-mobile">
                        <div className="bg-surface-container-lowest rounded-xl shadow-xl p-xl w-full max-w-md flex flex-col items-center text-center gap-md transform scale-100 transition-transform">
                            <div className="w-16 h-16 rounded-full bg-[#e8f5e9] flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-[32px] text-[#1b5e20]">
                  check_circle
                </span>
                            </div>
                            <h3 className="font-headline-md text-headline-md text-primary">
                                ¡Postulación enviada exitosamente!
                            </h3>
                            <p className="font-body-md text-body-md text-on-surface-variant">
                                Tu perfil ha sido enviado a {vacante?.empresa}. Puedes hacer
                                seguimiento del proceso en tu panel de control.
                            </p>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    router.push("/vacantes");
                                }}
                                className="mt-4 font-label-md text-label-md px-lg py-2 rounded border border-outline-variant text-primary hover:bg-surface-variant transition-colors w-full"
                            >
                                Ver más vacantes
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <footer className="w-full py-lg px-margin-mobile md:px-xl flex flex-col md:flex-row justify-between items-center gap-md bg-surface-container-highest mt-auto">
                    <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-headline-md text-headline-md font-bold text-primary">
              EmpleoUni
            </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
              © 2024 EmpleoUni - Talento Universitario Colombiano
            </span>
                    </div>
                    <div className="flex items-center gap-md">
                        <a className="font-body-sm text-body-sm text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">
                            Contacto
                        </a>
                        <a className="font-body-sm text-body-sm text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">
                            Términos y Condiciones
                        </a>
                        <a className="font-body-sm text-body-sm text-on-surface-variant hover:underline transition-all opacity-80 hover:opacity-100" href="#">
                            Privacidad
                        </a>
                    </div>
                </footer>
            </div>
        </>
    );
}