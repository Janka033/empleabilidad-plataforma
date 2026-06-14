"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "../../../components/ui/Navbar";
import { API_URLS, authHeaders, parseApiError } from "../../../lib/api";

interface Vacante {
    id: string;
    titulo: string;
    empresa: string;
    descripcion: string;
    modalidad: string;
    tipo: string;
    ciudad: string;
    area: string;
    salario?: string;
    requisitos?: string[];
    activa: boolean;
    created_at?: string;
}

function getRolFromToken(token: string): string | null {
    try { return JSON.parse(atob(token.split(".")[1])).rol ?? null; }
    catch { return null; }
}

const MODALIDAD_COLOR: Record<string, string> = {
    Remoto:    "bg-[#e0e7ff] text-[#3730a3]",
    Híbrido:   "bg-[#dcfce7] text-[#166534]",
    Presencial: "bg-[#fef9c3] text-[#854d0e]",
};

export default function VacanteDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id     = params?.id as string;

    const [vacante,  setVacante]  = useState<Vacante | null>(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState<string | null>(null);
    const [rol,      setRol]      = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }

        setRol(getRolFromToken(token));

        (async () => {
            try {
                const res = await fetch(`${API_URLS.vacantes}/vacantes/${id}`, {
                    headers: authHeaders(token),
                });
                if (!res.ok) throw new Error(await parseApiError(res, "Vacante no encontrada"));
                setVacante(await res.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error de conexión");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, router]);

    const handlePostular = () => {
        if (!vacante) return;
        localStorage.setItem("vacantePostular", JSON.stringify({
            id:          vacante.id,
            titulo:      vacante.titulo,
            empresa:     vacante.empresa,
            modalidad:   vacante.modalidad,
            ciudad:      vacante.ciudad,
            salario:     vacante.salario || "No especificado",
            descripcion: vacante.descripcion,
            requisitos:  vacante.requisitos || [],
        }));
        router.push("/postular");
    };

    const formatSalary = (s?: string) => {
        if (!s) return "No especificado";
        if (/[a-zA-Z$\-]/.test(s)) return s;
        const n = parseInt(s.replace(/[^0-9]/g, ""));
        return isNaN(n) || n === 0
            ? "No especificado"
            : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
    };

    // ── Estados ───────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-on-surface-variant font-body-md text-body-md">Cargando vacante...</p>
            </div>
        </div>
    );

    if (error || !vacante) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">error_outline</span>
            <p className="text-on-surface-variant font-body-md text-body-md">{error ?? "Vacante no encontrada"}</p>
            <button
                onClick={() => router.back()}
                className="px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded hover:opacity-90 transition-opacity"
            >
                Volver
            </button>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="bg-background text-on-background min-h-screen flex flex-col pt-16 font-sans">
            <Navbar />

            <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-xl py-lg md:py-xl flex flex-col gap-lg">

                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-xs font-label-md text-label-md text-on-surface-variant border border-outline-variant px-3 py-1.5 rounded-full hover:bg-surface-variant transition-colors w-fit"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Volver a vacantes
                </button>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">

                    {/* ── LEFT: detail ────────────────────────────────── */}
                    <div className="lg:col-span-2 flex flex-col gap-lg">

                        {/* Header card */}
                        <div className="bg-surface border border-outline-variant rounded-xl shadow-level-1 p-lg flex flex-col gap-md">
                            <div className="flex items-start gap-md">
                                {/* Company avatar */}
                                <div className="w-16 h-16 bg-primary-container rounded-xl border border-outline-variant flex items-center justify-center shrink-0">
                                    <span className="font-headline-lg text-headline-lg text-primary font-bold">
                                        {vacante.empresa.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-body-md text-body-md text-on-surface-variant mb-1">{vacante.empresa}</p>
                                    <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight">
                                        {vacante.titulo}
                                    </h1>
                                </div>
                                {/* Activa badge */}
                                <span className={`hidden md:flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                                    vacante.activa ? "bg-[#e8f5e9] text-[#1b5e20]" : "bg-surface-variant text-on-surface-variant"
                                }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                                    {vacante.activa ? "Activa" : "Cerrada"}
                                </span>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-xs">
                                <span className={`${MODALIDAD_COLOR[vacante.modalidad] ?? "bg-surface-variant text-on-surface-variant"} font-label-sm text-label-sm px-2.5 py-1 rounded-full`}>
                                    {vacante.modalidad}
                                </span>
                                <span className="bg-surface-variant text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">work</span> {vacante.tipo}
                                </span>
                                <span className="bg-surface-variant text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">location_on</span> {vacante.ciudad}
                                </span>
                                <span className="bg-surface-variant text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">category</span> {vacante.area}
                                </span>
                            </div>
                        </div>

                        {/* Descripción */}
                        <div className="bg-surface border border-outline-variant rounded-xl shadow-level-1 p-lg flex flex-col gap-sm">
                            <h2 className="font-title-lg text-on-surface font-semibold flex items-center gap-xs">
                                <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                                Descripción del cargo
                            </h2>
                            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">
                                {vacante.descripcion}
                            </p>
                        </div>

                        {/* Requisitos */}
                        {vacante.requisitos && vacante.requisitos.length > 0 && (
                            <div className="bg-surface border border-outline-variant rounded-xl shadow-level-1 p-lg flex flex-col gap-sm">
                                <h2 className="font-title-lg text-on-surface font-semibold flex items-center gap-xs">
                                    <span className="material-symbols-outlined text-primary text-[20px]">checklist</span>
                                    Requisitos
                                </h2>
                                <ul className="flex flex-col gap-sm">
                                    {vacante.requisitos.map((req, i) => (
                                        <li key={i} className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 shrink-0">check_circle</span>
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT: sticky action card ────────────────────── */}
                    <div className="lg:sticky lg:top-24 flex flex-col gap-md">
                        <div className="bg-surface border border-outline-variant rounded-xl shadow-level-2 p-lg flex flex-col gap-lg">

                            {/* Salary */}
                            <div className="flex flex-col gap-xs">
                                <span className="font-label-md text-label-md text-on-surface-variant">Salario mensual</span>
                                <span className="font-headline-md text-headline-md text-primary font-bold">
                                    {formatSalary(vacante.salario)}
                                </span>
                            </div>

                            <div className="h-px bg-outline-variant" />

                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-md text-sm">
                                {[
                                    ["work", "Modalidad",  vacante.modalidad],
                                    ["schedule", "Tipo",   vacante.tipo],
                                    ["location_on", "Ciudad", vacante.ciudad],
                                    ["category", "Área",  vacante.area],
                                ].map(([icon, label, val]) => (
                                    <div key={label} className="flex flex-col gap-1">
                                        <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">{icon}</span> {label}
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface font-medium">{val}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="h-px bg-outline-variant" />

                            {/* CTA — solo estudiantes */}
                            {rol !== "empresa" && (
                                <>
                                    {vacante.activa ? (
                                        <button
                                            onClick={handlePostular}
                                            className="w-full font-label-md text-label-md font-bold px-lg py-3 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-level-1 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">send</span>
                                            Postularme
                                        </button>
                                    ) : (
                                        <div className="w-full text-center py-3 rounded-lg bg-surface-variant text-on-surface-variant font-label-md text-label-md">
                                            Vacante cerrada
                                        </div>
                                    )}
                                    <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
                                        Tu perfil académico se adjuntará automáticamente
                                    </p>
                                </>
                            )}

                            {/* Empresa ve info */}
                            {rol === "empresa" && (
                                <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-2">
                                    Esta es una vista previa de la vacante
                                </div>
                            )}
                        </div>

                        {/* Published date */}
                        {vacante.created_at && (
                            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
                                Publicada el{" "}
                                {new Date(vacante.created_at).toLocaleDateString("es-CO", {
                                    day: "2-digit", month: "long", year: "numeric",
                                })}
                            </p>
                        )}
                    </div>
                </div>
            </main>

            <footer className="w-full py-lg px-margin-mobile md:px-xl flex flex-col md:flex-row justify-between items-center gap-md bg-surface-container-highest mt-auto">
                <span className="font-headline-md text-headline-md font-bold" style={{ color: "#0d1c32" }}>
                    Empleo<span style={{ color: "#f97316" }}>Uni</span>
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                    © 2024 EmpleoUni - Talento Universitario Colombiano
                </p>
            </footer>
        </div>
    );
}
