"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Vacante {
    id: string;
    titulo: string;
    empresa: string;
    modalidad: string;
    tipo: string;
}

export default function PostularPage() {
    const [vacante, setVacante] = useState<Vacante | null>(null);
    const [form, setForm] = useState({
        cartaMotivacion: "",
        expectativaSalarial: "",
        disponibilidad: "inmediata",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const PERFILES_URL = process.env.NEXT_PUBLIC_PERFILES_URL || "http://localhost:3002";

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }

        const saved = localStorage.getItem("vacantePostular");
        if (saved) {
            setVacante(JSON.parse(saved));
        } else {
            router.push("/vacantes");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token || !vacante) return;

        try {
            const res = await fetch(`${PERFILES_URL}/postulaciones`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    vacanteId: vacante.id,
                    cartaMotivacion: form.cartaMotivacion,
                    expectativaSalarial: form.expectativaSalarial,
                    disponibilidad: form.disponibilidad,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error al postularse");
            }

            setSuccess(true);
            localStorage.removeItem("vacantePostular");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    if (success) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Postulación enviada!</h2>
                <p className="text-gray-500 mb-6">Tu postulación fue registrada exitosamente. La empresa revisará tu perfil.</p>
                <button onClick={() => router.push("/vacantes")} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Ver más vacantes
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4">
                <button onClick={() => router.push("/vacantes")} className="flex items-center text-gray-500 hover:text-gray-700 mb-6 text-sm">
                    ← Volver a vacantes
                </button>

                {vacante && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-600 font-medium">Postulando a:</p>
                        <h2 className="text-xl font-bold text-blue-900">{vacante.titulo}</h2>
                        <p className="text-blue-700">{vacante.empresa} · {vacante.modalidad} · {vacante.tipo}</p>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-md p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Formulario de postulación</h1>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Carta de motivación <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                rows={5}
                                value={form.cartaMotivacion}
                                onChange={(e) => setForm({ ...form, cartaMotivacion: e.target.value })}
                                placeholder="Cuéntanos por qué eres el candidato ideal para esta posición..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Expectativa salarial
                            </label>
                            <input
                                type="text"
                                value={form.expectativaSalarial}
                                onChange={(e) => setForm({ ...form, expectativaSalarial: e.target.value })}
                                placeholder="Ej: $1.200.000 - $1.500.000"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Disponibilidad
                            </label>
                            <select
                                value={form.disponibilidad}
                                onChange={(e) => setForm({ ...form, disponibilidad: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="inmediata">Inmediata</option>
                                <option value="15 días">15 días</option>
                                <option value="1 mes">1 mes</option>
                                <option value="2 meses">2 meses</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                        >
                            {loading ? "Enviando postulación..." : "Enviar postulación"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
