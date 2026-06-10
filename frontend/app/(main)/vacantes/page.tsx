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
}

export default function VacantesPage() {
    const [vacantes, setVacantes] = useState<Vacante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        fetch("http://localhost:3003/vacantes", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
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
    }, [router]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">Cargando vacantes...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-red-500 text-center">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Vacantes disponibles</h1>
                {vacantes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500">No hay vacantes activas en este momento.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {vacantes.map((vac) => (
                            <div key={vac.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">{vac.titulo}</h2>
                                <p className="text-gray-600 mb-2">{vac.empresa}</p>
                                <p className="text-sm text-gray-500 mb-1">{vac.modalidad} • {vac.tipo}</p>
                                <p className="text-sm text-gray-500 mb-1">{vac.ciudad} • {vac.area}</p>
                                {vac.salario && <p className="text-sm font-medium text-green-600">{vac.salario}</p>}
                                <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                                    Ver detalles
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}