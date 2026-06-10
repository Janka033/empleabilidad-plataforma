"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Perfil {
    id: string;
    nombre: string;
    email: string;
    universidad?: string;
    programa?: string;
    semestre?: number;
    bio?: string;
    habilidades?: string[];
    completitud: number;
}

interface Postulacion {
    id: string;
    vacante_id: string;
    estado: string;
    carta_motivacion: string;
    created_at: string;
}

export default function PerfilPage() {
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
    const [editando, setEditando] = useState(false);
    const [form, setForm] = useState({ universidad: "", programa: "", semestre: "", bio: "", habilidades: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const router = useRouter();

    const PERFILES_URL = process.env.NEXT_PUBLIC_PERFILES_URL || "http://localhost:3002";

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }

        Promise.all([
            fetch(`${PERFILES_URL}/perfiles/me`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${PERFILES_URL}/postulaciones/me`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
            .then(async ([rPerfil, rPost]) => {
                if (rPerfil.ok) {
                    const p = await rPerfil.json();
                    setPerfil(p);
                    setForm({
                        universidad: p.universidad || "",
                        programa: p.programa || "",
                        semestre: p.semestre?.toString() || "",
                        bio: p.bio || "",
                        habilidades: (p.habilidades || []).join(", "),
                    });
                }
                if (rPost.ok) {
                    const data = await rPost.json();
                    setPostulaciones(data.postulaciones || []);
                }
            })
            .finally(() => setLoading(false));
    }, [router, PERFILES_URL]);

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem("token");

        const res = await fetch(`${PERFILES_URL}/perfiles/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                universidad: form.universidad,
                programa: form.programa,
                semestre: form.semestre ? parseInt(form.semestre) : undefined,
                bio: form.bio,
                habilidades: form.habilidades.split(",").map(h => h.trim()).filter(Boolean),
            }),
        });

        if (res.ok) {
            const updated = await res.json();
            setPerfil(updated);
            setEditando(false);
            setMsg("Perfil actualizado correctamente");
            setTimeout(() => setMsg(""), 3000);
        }
        setSaving(false);
    };

    const estadoColor: Record<string, string> = {
        enviada: "bg-yellow-100 text-yellow-800",
        vista: "bg-blue-100 text-blue-800",
        entrevista: "bg-purple-100 text-purple-800",
        aceptada: "bg-green-100 text-green-800",
        rechazada: "bg-red-100 text-red-800",
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 space-y-6">
                {msg && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{msg}</div>
                )}

                {/* Tarjeta perfil */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{perfil?.nombre}</h1>
                            <p className="text-gray-500">{perfil?.email}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500 mb-1">Completitud del perfil</div>
                            <div className="flex items-center gap-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{ width: `${perfil?.completitud || 0}%` }}
                                    />
                                </div>
                                <span className="text-sm font-medium text-blue-600">{perfil?.completitud || 0}%</span>
                            </div>
                        </div>
                    </div>

                    {!editando ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-500">Universidad:</span> <span className="font-medium">{perfil?.universidad || "—"}</span></div>
                                <div><span className="text-gray-500">Programa:</span> <span className="font-medium">{perfil?.programa || "—"}</span></div>
                                <div><span className="text-gray-500">Semestre:</span> <span className="font-medium">{perfil?.semestre || "—"}</span></div>
                            </div>
                            {perfil?.bio && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{perfil.bio}</p>}
                            {perfil?.habilidades && perfil.habilidades.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {perfil.habilidades.map((h, i) => (
                                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{h}</span>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => setEditando(true)} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                                Editar perfil
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleGuardar} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Universidad</label>
                                    <input type="text" value={form.universidad} onChange={e => setForm({...form, universidad: e.target.value})}
                                           className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Programa</label>
                                    <input type="text" value={form.programa} onChange={e => setForm({...form, programa: e.target.value})}
                                           className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
                                    <input type="number" min="1" max="12" value={form.semestre} onChange={e => setForm({...form, semestre: e.target.value})}
                                           className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                <textarea rows={3} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                                          placeholder="Cuéntanos sobre ti..."
                                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Habilidades (separadas por coma)</label>
                                <input type="text" value={form.habilidades} onChange={e => setForm({...form, habilidades: e.target.value})}
                                       placeholder="React, Node.js, Python, SQL..."
                                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" disabled={saving}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium">
                                    {saving ? "Guardando..." : "Guardar cambios"}
                                </button>
                                <button type="button" onClick={() => setEditando(false)}
                                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Postulaciones */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Mis postulaciones ({postulaciones.length})</h2>
                    {postulaciones.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-gray-500 mb-3">Aún no te has postulado a ninguna vacante.</p>
                            <button onClick={() => router.push("/vacantes")} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                Ver vacantes disponibles
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {postulaciones.map((p) => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Postulación #{p.id.slice(0, 8)}</p>
                                        <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString("es-CO")}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${estadoColor[p.estado] || "bg-gray-100 text-gray-800"}`}>
                                        {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
