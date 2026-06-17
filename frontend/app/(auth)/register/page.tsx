"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URLS } from "../../lib/api";
import { saveSession } from "../../lib/auth";
import GoogleButton from "../../components/GoogleButton";

type UserRole = "estudiante" | "empresa";

interface RegisterForm {
    nombre: string;
    email: string;
    password: string;
    confirmPassword: string;
    rol: UserRole;
    universidad?: string;
    programa?: string;
    semestre?: string;
    razonSocial?: string;
    nit?: string;
}

const heading = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" } as const;
const NAVY = "#0d1c32";
const ORANGE = "#f97316";

const UNIVERSIDAD_FIJA = "Corporación Universitaria Alexander von Humboldt";
const PROGRAMA_FIJO = "Ingeniería de Software";
const SEMESTRES = [4, 5, 6, 7, 8];

const inputCls = "px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition";

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState<RegisterForm>({
        nombre: "", email: "", password: "", confirmPassword: "",
        rol: "estudiante", universidad: UNIVERSIDAD_FIJA, programa: PROGRAMA_FIJO, semestre: "",
        razonSocial: "", nit: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleNext = () => {
        if (step === 2) {
            if (formData.password !== formData.confirmPassword) { setError("Las contraseñas no coinciden"); return; }
            if (formData.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
        }
        setError("");
        setStep(step + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const payload = {
                nombre: formData.nombre, email: formData.email,
                password: formData.password, rol: formData.rol,
                ...(formData.rol === "estudiante"
                    ? { universidad: formData.universidad, programa: formData.programa, semestre: Number(formData.semestre) }
                    : { razonSocial: formData.razonSocial, nit: formData.nit }),
            };
            const res = await fetch(`${API_URLS.auth}/auth/register`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Error al registrarse"); return; }
            saveSession(data.token, data.role, data.user);
            router.push(data.role === "empresa" ? "/empresa/dashboard" : "/perfil");
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const stepTitles = ["Elige tu rol", "Crea tu cuenta", "Completa tu perfil"];
    const stepLabels = ["Rol", "Cuenta", "Perfil"];

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Panel de marca */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
                 style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #16284a 60%, #1b3a6b 100%)` }}>
                <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{ background: ORANGE, transform: "translate(-40%,40%)" }} />
                <Link href="/" className="relative text-2xl font-bold text-white" style={heading}>
                    Empleo<span style={{ color: ORANGE }}>Uni</span>
                </Link>
                <div className="relative">
                    {/* Stepper */}
                    <div className="flex items-center mb-8">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                     style={{ backgroundColor: s < step ? ORANGE : s === step ? "#fff" : "rgba(255,255,255,0.15)", color: s < step ? "#fff" : s === step ? NAVY : "rgba(255,255,255,0.5)", ...heading }}>
                                    {s < step ? "✓" : s}
                                </div>
                                {s < 3 && <div className="w-12 h-0.5" style={{ backgroundColor: s < step ? ORANGE : "rgba(255,255,255,0.15)" }} />}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-10 mb-8">
                        {stepLabels.map((l, i) => (
                            <span key={l} className="text-xs" style={{ color: i + 1 <= step ? "#fff" : "rgba(255,255,255,0.4)" }}>{l}</span>
                        ))}
                    </div>
                    <h1 className="text-4xl font-bold text-white leading-tight mb-3" style={heading}>
                        {step === 1 && <>¿Cómo<br /><span style={{ color: ORANGE }}>participas?</span></>}
                        {step === 2 && <>Crea tu<br /><span style={{ color: ORANGE }}>cuenta.</span></>}
                        {step === 3 && <>Completa tu<br /><span style={{ color: ORANGE }}>{formData.rol === "estudiante" ? "perfil." : "empresa."}</span></>}
                    </h1>
                    <p className="text-slate-300 max-w-[28rem] leading-relaxed">
                        {step === 1 && "¿Eres estudiante buscando práctica o empresa buscando talento?"}
                        {step === 2 && "Tu correo y contraseña para acceder a la plataforma."}
                        {step === 3 && formData.rol === "estudiante" && "Información académica para encontrar vacantes compatibles con tu perfil."}
                        {step === 3 && formData.rol === "empresa" && "Datos de tu organización para publicar vacantes."}
                    </p>
                </div>
                <p className="relative text-xs text-slate-500">© 2026 EmpleoUni — CUE Alexander von Humboldt</p>
            </div>

            {/* Formulario */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
                <div className="w-full max-w-[28rem]">
                    <Link href="/" className="lg:hidden block text-2xl font-bold mb-6 text-center" style={{ ...heading, color: NAVY }}>
                        Empleo<span style={{ color: ORANGE }}>Uni</span>
                    </Link>
                    <div className="mb-7">
                        <h2 className="text-2xl font-bold text-slate-900" style={heading}>{stepTitles[step - 1]}</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            ¿Ya tienes cuenta?{" "}
                            <Link href="/login" className="font-semibold hover:underline" style={{ color: NAVY }}>Inicia sesión</Link>
                        </p>
                    </div>

                    {/* PASO 1 */}
                    {step === 1 && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                {(["estudiante", "empresa"] as UserRole[]).map((rol) => (
                                    <button key={rol} type="button" onClick={() => setFormData({ ...formData, rol })}
                                            className={`p-5 rounded-2xl text-left transition-all border-2 ${formData.rol === rol ? "bg-slate-50" : "bg-white hover:border-slate-300 border-slate-200"}`}
                                            style={formData.rol === rol ? { borderColor: NAVY } : {}}>
                                        <span className="material-symbols-outlined text-[28px] mb-2" style={{ color: formData.rol === rol ? ORANGE : "#94a3b8" }}>
                                            {rol === "estudiante" ? "school" : "business"}
                                        </span>
                                        <p className="font-bold text-sm text-slate-900 capitalize">{rol}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{rol === "estudiante" ? "Busco práctica" : "Publico vacantes"}</p>
                                    </button>
                                ))}
                            </div>
                            <button type="button" onClick={() => setStep(2)}
                                    className="w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: NAVY }}>
                                Continuar
                            </button>
                            <GoogleButton rol={formData.rol} />
                        </div>
                    )}

                    {/* PASO 2 */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4">
                            {[
                                { id: "nombre", label: "Nombre completo", type: "text", ph: "Juan Pérez" },
                                { id: "email", label: "Correo electrónico", type: "email", ph: "tu@correo.com" },
                                { id: "password", label: "Contraseña", type: "password", ph: "Mínimo 8 caracteres" },
                                { id: "confirmPassword", label: "Confirmar contraseña", type: "password", ph: "Repite tu contraseña" },
                            ].map(({ id, label, type, ph }) => (
                                <div key={id} className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-slate-700">{label}</label>
                                    <input id={id} name={id} type={type} required placeholder={ph}
                                           value={formData[id as keyof RegisterForm] as string} onChange={handleChange} className={inputCls} />
                                </div>
                            ))}
                            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50">Atrás</button>
                                <button type="button" onClick={handleNext} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90" style={{ backgroundColor: NAVY }}>Continuar</button>
                            </div>
                        </div>
                    )}

                    {/* PASO 3 */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {formData.rol === "estudiante" ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Universidad</label>
                                        <input type="text" value={UNIVERSIDAD_FIJA} readOnly className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Programa académico</label>
                                        <input type="text" value={PROGRAMA_FIJO} readOnly className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Semestre actual</label>
                                        <select id="semestre" name="semestre" required value={formData.semestre} onChange={handleChange} className={`${inputCls} bg-white`}>
                                            <option value="">Selecciona tu semestre</option>
                                            {SEMESTRES.map((s) => <option key={s} value={s}>{s}° semestre</option>)}
                                        </select>
                                        <p className="text-xs text-slate-400">La práctica profesional inicia en 4° semestre.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Razón social</label>
                                        <input id="razonSocial" name="razonSocial" type="text" required placeholder="Empresa S.A.S." value={formData.razonSocial} onChange={handleChange} className={inputCls} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-slate-700">NIT</label>
                                        <input id="nit" name="nit" type="text" required placeholder="900.123.456-7" value={formData.nit} onChange={handleChange} className={inputCls} />
                                    </div>
                                </>
                            )}

                            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

                            <label className="flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed">
                                <input type="checkbox" required className="mt-0.5 w-4 h-4 accent-slate-900" />
                                <span>Acepto los <Link href="/terminos" className="underline text-slate-700">Términos de uso</Link> y la <Link href="/privacidad" className="underline text-slate-700">Política de privacidad</Link>, conforme a la Ley 1581 de 2012 (Habeas Data).</span>
                            </label>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50">Atrás</button>
                                <button type="submit" disabled={loading}
                                        className="flex-1 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                                        style={{ backgroundColor: ORANGE }}>
                                    {loading ? "Registrando..." : "Crear cuenta"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
