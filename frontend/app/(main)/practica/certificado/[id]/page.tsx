"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_URLS, authHeaders } from "../../../../lib/api";

interface Evaluacion {
    id: string;
    tipo: "primer_corte" | "segundo_corte" | "tercer_corte";
    calificacion: number;
    observaciones?: string;
    created_at: string;
}

interface Convenio {
    id: string;
    estudiante_nombre: string;
    empresa_nombre: string;
    vacante_titulo?: string;
    tutor_empresarial?: string;
    tutor_academico?: string;
    modalidad?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    estado: string;
    evaluaciones?: Evaluacion[];
}

function fmt(d?: string) {
    return d ? new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}

export default function CertificadoPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [convenio, setConvenio] = useState<Convenio | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        (async () => {
            try {
                const res = await fetch(`${API_URLS.practicas}/convenios/${id}`, { headers: authHeaders(token) });
                if (!res.ok) { setError("No se pudo cargar el convenio"); return; }
                setConvenio(await res.json());
            } catch { setError("Error de conexión"); }
            finally { setLoading(false); }
        })();
    }, [id, router]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error || !convenio) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc]">
            <p className="text-slate-600">{error || "Convenio no encontrado"}</p>
            <button onClick={() => router.back()} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">Volver</button>
        </div>
    );

    const cortes = convenio.evaluaciones || [];
    const tercer = cortes.find((e) => e.tipo === "tercer_corte");
    const finalizado = convenio.estado === "finalizado" && !!tercer;
    // Nota final ponderada: 30% primer + 30% segundo + 40% tercer corte
    const PESOS: Record<string, number> = { primer_corte: 0.3, segundo_corte: 0.3, tercer_corte: 0.4 };
    let suma = 0, pesoTotal = 0;
    for (const e of cortes) { const p = PESOS[e.tipo] || 0; suma += p * Number(e.calificacion); pesoTotal += p; }
    const notaFinal = pesoTotal > 0 ? Math.round((suma / pesoTotal) * 10) / 10 : 0;
    const evalFinal = tercer; // para la fecha de expedición

    if (!finalizado) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc] px-6 text-center">
            <span className="material-symbols-outlined text-[48px] text-slate-300">pending</span>
            <p className="text-slate-600">El certificado estará disponible cuando la empresa registre la evaluación final de tu práctica.</p>
            <button onClick={() => router.back()} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">Volver</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] py-8 px-4 flex flex-col items-center gap-6">
            {/* Barra de acciones — no se imprime */}
            <div className="print:hidden w-full max-w-3xl flex justify-between items-center">
                <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Volver
                </button>
                <button onClick={() => window.print()}
                        className="flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-2.5 rounded-lg hover:opacity-90"
                        style={{ backgroundColor: "#0d1c32" }}>
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    Imprimir / Guardar PDF
                </button>
            </div>

            {/* Certificado */}
            <div className="bg-white w-full max-w-3xl shadow-lg print:shadow-none border-[6px] border-double border-[#0d1c32] p-10 md:p-14 flex flex-col items-center text-center gap-6">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xl font-bold" style={{ color: "#0d1c32" }}>
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </span>
                    <p className="text-xs text-slate-500 tracking-widest uppercase">Corporación Universitaria Alexander von Humboldt</p>
                </div>

                <div className="flex flex-col items-center gap-1 mt-2">
                    <span className="material-symbols-outlined text-[40px]" style={{ color: "#f97316" }}>workspace_premium</span>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Certificado de Práctica Profesional</h1>
                </div>

                <p className="text-slate-600 text-sm md:text-base max-w-[36rem]">
                    Se certifica que
                </p>
                <p className="text-2xl font-bold text-slate-900 border-b-2 border-slate-200 pb-2 px-8">
                    {convenio.estudiante_nombre}
                </p>

                <p className="text-slate-600 text-sm md:text-base max-w-[36rem] leading-relaxed">
                    realizó y culminó satisfactoriamente su práctica profesional
                    {convenio.vacante_titulo ? ` en el cargo de "${convenio.vacante_titulo}"` : ""} en la
                    empresa <strong>{convenio.empresa_nombre}</strong>, en modalidad {convenio.modalidad || "no especificada"},
                    durante el periodo comprendido entre el <strong>{fmt(convenio.fecha_inicio)}</strong> y
                    el <strong>{fmt(convenio.fecha_fin)}</strong>.
                </p>

                <div className="bg-slate-50 rounded-xl px-6 py-4 flex items-center gap-8">
                    {/* Cortes: 30% / 30% / 40% */}
                    <div className="flex gap-4 text-center">
                        {([["primer_corte", "1er corte"], ["segundo_corte", "2do corte"], ["tercer_corte", "3er corte"]] as const).map(([t, lbl]) => {
                            const c = cortes.find((e) => e.tipo === t);
                            return (
                                <div key={t}>
                                    <p className="text-[10px] text-slate-400 uppercase">{lbl}</p>
                                    <p className="text-lg font-bold text-slate-700">{c ? c.calificacion : "—"}</p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-center border-l border-slate-200 pl-8">
                        <p className="text-xs text-slate-500">Calificación final</p>
                        <p className="text-3xl font-bold" style={{ color: "#0d1c32" }}>{notaFinal}<span className="text-lg text-slate-400">/5.0</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-10 mt-6 w-full max-w-[28rem]">
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-full border-t border-slate-400 pt-1" />
                        <p className="text-xs text-slate-500">Tutor empresarial</p>
                        <p className="text-sm font-semibold text-slate-800">{convenio.tutor_empresarial || "—"}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-full border-t border-slate-400 pt-1" />
                        <p className="text-xs text-slate-500">Tutor académico</p>
                        <p className="text-sm font-semibold text-slate-800">{convenio.tutor_academico || "—"}</p>
                    </div>
                </div>

                <p className="text-xs text-slate-400 mt-4">
                    Expedido el {fmt(evalFinal!.created_at)} · Código de verificación: {convenio.id.slice(0, 8).toUpperCase()}
                </p>
            </div>
        </div>
    );
}
