"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
}

export default function VacantesPage() {
    const [vacantes, setVacantes] = useState<Vacante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filtroModalidad, setFiltroModalidad] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");
    const [vacanteSeleccionada, setVacanteSeleccionada] = useState<Vacante | null>(null);
    const router = useRouter();

    const VACANTES_URL = process.env.NEXT_PUBLIC_VACANTES_URL || "http://localhost:3003";

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const params = new URLSearchParams();
        if (filtroModalidad) params.append("modalidad", filtroModalidad);
        if (filtroTipo) params.append("tipo", filtroTipo);

        fetch(`${VACANTES_URL}/vacantes?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (!res.ok) {
                    if (res.status === 401) {
                        localStorage.removeItem("token");
                        router.push("/login");
                    }
                    throw new Error("Error al cargar vacantes");
                }
                return res.json();
            })
            .then((data) => {
                setVacantes(data.vacantes || []);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [router, filtroModalidad, filtroTipo, VACANTES_URL]);

    const handlePostular = (vacante: Vacante) => {
        localStorage.setItem("vacantePostular", JSON.stringify(vacante));
        router.push("/postular");
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="text-red-500 text-center bg-red-50 p-6 rounded-lg">{error}</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">Vacantes disponibles</h1>
                    <div className="flex gap-3">
                        <select
                            value={filtroModalidad}
                            onChange={(e) => setFiltroModalidad(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Todas las modalidades</option>
                            <option value="Presencial">Presencial</option>
                            <option value="Remoto">Remoto</option>
                            <option value="Híbrido">Híbrido</option>
                        </select>
                        <select
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Todos los tipos</option>
                            <option value="Práctica">Práctica</option>
                            <option value="Tiempo completo">Tiempo completo</option>
                            <option value="Medio tiempo">Medio tiempo</option>
                        </select>
                    </div>
                </div>

                {vacantes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500">No hay vacantes activas con los filtros seleccionados.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {vacantes.map((vac) => (
                            <div key={vac.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 flex flex-col">
                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-1">{vac.titulo}</h2>
                                    <p className="text-blue-600 font-medium mb-2">{vac.empresa}</p>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{vac.modalidad}</span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{vac.tipo}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-1">📍 {vac.ciudad}</p>
                                    <p className="text-sm text-gray-500 mb-2">💼 {vac.area}</p>
                                    {vac.salario && <p className="text-sm font-semibold text-green-600">💰 {vac.salario}</p>}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => setVacanteSeleccionada(vac)}
                                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition-colors text-sm"
                                    >
                                        Ver detalles
                                    </button>
                                    <button
                                        onClick={() => handlePostular(vac)}
                                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        Postularme
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal detalle vacante */}
            {vacanteSeleccionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">{vacanteSeleccionada.titulo}</h2>
                            <button onClick={() => setVacanteSeleccionada(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <p className="text-blue-600 font-semibold mb-4">{vacanteSeleccionada.empresa}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{vacanteSeleccionada.modalidad}</span>
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">{vacanteSeleccionada.tipo}</span>
                        </div>
                        <p className="text-gray-600 mb-4">{vacanteSeleccionada.descripcion}</p>
                        {vacanteSeleccionada.requisitos && vacanteSeleccionada.requisitos.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-800 mb-2">Requisitos:</h3>
                                <ul className="list-disc list-inside space-y-1">
                                    {vacanteSeleccionada.requisitos.map((req, i) => (
                                        <li key={i} className="text-sm text-gray-600">{req}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <p className="text-sm text-gray-500 mb-1">📍 {vacanteSeleccionada.ciudad} • {vacanteSeleccionada.area}</p>
                        {vacanteSeleccionada.salario && <p className="text-green-600 font-semibold mb-4">💰 {vacanteSeleccionada.salario}</p>}
                        <button
                            onClick={() => { handlePostular(vacanteSeleccionada); setVacanteSeleccionada(null); }}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Postularme a esta vacante
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
