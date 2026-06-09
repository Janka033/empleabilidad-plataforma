"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserRole = "estudiante" | "empresa";

interface RegisterForm {
    nombre: string;
    email: string;
    password: string;
    confirmPassword: string;
    rol: UserRole;
    // Estudiante
    universidad?: string;
    programa?: string;
    semestre?: string;
    // Empresa
    razonSocial?: string;
    nit?: string;
}

const UNIVERSIDADES = [
    "Corporación Universitaria Alexander von Humboldt",
    "Universidad del Quindío",
    "Universidad La Gran Colombia",
    "SENA",
    "Otra",
];

const PROGRAMAS = [
    "Ingeniería de Software",
    "Ingeniería de Sistemas",
    "Administración de Empresas",
    "Diseño Gráfico",
    "Contaduría Pública",
    "Derecho",
    "Otro",
];

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: rol, 2: datos básicos, 3: datos específicos
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState<RegisterForm>({
        nombre: "",
        email: "",
        password: "",
        confirmPassword: "",
        rol: "estudiante",
        universidad: "",
        programa: "",
        semestre: "",
        razonSocial: "",
        nit: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleNext = () => {
        if (step === 2) {
            if (formData.password !== formData.confirmPassword) {
                setError("Las contraseñas no coinciden");
                return;
            }
            if (formData.password.length < 8) {
                setError("La contraseña debe tener al menos 8 caracteres");
                return;
            }
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
                nombre: formData.nombre,
                email: formData.email,
                password: formData.password,
                rol: formData.rol,
                ...(formData.rol === "estudiante"
                    ? {
                        universidad: formData.universidad,
                        programa: formData.programa,
                        semestre: Number(formData.semestre),
                    }
                    : {
                        razonSocial: formData.razonSocial,
                        nit: formData.nit,
                    }),
            };

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_AUTH_URL}/auth/register`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Error al registrarse");
                return;
            }

            localStorage.setItem("token", data.token);
            router.push("/vacantes");
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full px-4 py-3 bg-white border border-[#c5c6cd] rounded-lg text-sm text-[#1b1b1d] placeholder-[#75777e] " +
        "focus:outline-none focus:border-[#0d1c32] focus:ring-2 focus:ring-[#0d1c32]/10 transition-all";

    const labelClass = "block text-sm font-semibold text-[#1b1b1d] mb-1.5";

    return (
        <div className="min-h-screen flex">
            {/* Panel izquierdo — navy */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0d1c32] flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
          <span className="text-white text-2xl font-bold tracking-tight">
            Empleo<span className="text-[#f97316]">Uni</span>
          </span>
                    <p className="text-[#b9c7e4] text-sm mt-1">
                        Plataforma de empleabilidad universitaria
                    </p>
                </div>

                <div className="relative z-10">
                    {/* Progress indicator */}
                    <div className="mb-10">
                        <div className="flex items-center gap-0">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                            s < step
                                                ? "bg-[#f97316] text-white"
                                                : s === step
                                                    ? "bg-white text-[#0d1c32]"
                                                    : "bg-white/20 text-white/50"
                                        }`}
                                    >
                                        {s < step ? "✓" : s}
                                    </div>
                                    {s < 3 && (
                                        <div
                                            className={`h-0.5 w-12 transition-all ${
                                                s < step ? "bg-[#f97316]" : "bg-white/20"
                                            }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-[52px] mt-2">
                            {["Rol", "Cuenta", "Perfil"].map((label, i) => (
                                <span
                                    key={label}
                                    className={`text-xs ${
                                        i + 1 <= step ? "text-white" : "text-white/40"
                                    }`}
                                >
                  {label}
                </span>
                            ))}
                        </div>
                    </div>

                    <h2 className="text-white text-3xl font-bold leading-tight mb-4">
                        {step === 1 && (
                            <>
                                Elige cómo
                                <br />
                                <span className="text-[#f97316]">participas.</span>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                Crea tu
                                <br />
                                <span className="text-[#f97316]">cuenta.</span>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                Completa
                                <br />
                                tu{" "}
                                <span className="text-[#f97316]">
                  {formData.rol === "estudiante" ? "perfil." : "empresa."}
                </span>
                            </>
                        )}
                    </h2>
                    <p className="text-[#76849f] text-sm leading-relaxed max-w-xs">
                        {step === 1 &&
                            "¿Eres estudiante buscando oportunidades o empresa buscando talento?"}
                        {step === 2 &&
                            "Tu email y contraseña para acceder a la plataforma."}
                        {step === 3 &&
                            formData.rol === "estudiante" &&
                            "Información académica para encontrar vacantes compatibles con tu perfil."}
                        {step === 3 &&
                            formData.rol === "empresa" &&
                            "Datos de tu organización para publicar vacantes y prácticas."}
                    </p>
                </div>

                <div className="relative z-10">
                    <p className="text-[#44474d] text-xs">
                        © 2025 EmpleoUni — CUE Armenia, Quindío
                    </p>
                </div>
            </div>

            {/* Panel derecho — formulario */}
            <div className="flex-1 flex flex-col justify-center items-center bg-[#fbf9fb] px-6 py-12">
                {/* Logo mobile */}
                <div className="lg:hidden mb-8">
          <span className="text-[#0d1c32] text-2xl font-bold tracking-tight">
            Empleo<span className="text-[#f97316]">Uni</span>
          </span>
                </div>

                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-[#1b1b1d] tracking-tight">
                            {step === 1 && "Crear cuenta"}
                            {step === 2 && "Datos de acceso"}
                            {step === 3 && "Información de perfil"}
                        </h1>
                        <p className="text-[#44474d] text-sm mt-1">
                            ¿Ya tienes cuenta?{" "}
                            <Link
                                href="/login"
                                className="text-[#0d1c32] font-semibold hover:text-[#f97316] transition-colors"
                            >
                                Inicia sesión
                            </Link>
                        </p>
                    </div>

                    {/* PASO 1: Selección de rol */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-[#1b1b1d] mb-3">
                                Soy...
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {(["estudiante", "empresa"] as UserRole[]).map((rol) => (
                                    <button
                                        key={rol}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, rol })}
                                        className={`p-5 rounded-xl border-2 text-left transition-all ${
                                            formData.rol === rol
                                                ? "border-[#0d1c32] bg-[#0d1c32]/5"
                                                : "border-[#c5c6cd] bg-white hover:border-[#75777e]"
                                        }`}
                                    >
                                        <div className="text-2xl mb-2">
                                            {rol === "estudiante" ? "🎓" : "🏢"}
                                        </div>
                                        <p
                                            className={`font-semibold text-sm capitalize ${
                                                formData.rol === rol
                                                    ? "text-[#0d1c32]"
                                                    : "text-[#1b1b1d]"
                                            }`}
                                        >
                                            {rol}
                                        </p>
                                        <p className="text-xs text-[#44474d] mt-0.5">
                                            {rol === "estudiante"
                                                ? "Busco prácticas y empleos"
                                                : "Publico vacantes"}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="w-full mt-4 py-3 px-4 bg-[#0d1c32] text-white font-semibold text-sm rounded-lg
                           hover:bg-[#1a2f4a] active:scale-[0.98] transition-all
                           shadow-[0px_2px_4px_rgba(0,0,0,0.05)]"
                            >
                                Continuar
                            </button>
                        </div>
                    )}

                    {/* PASO 2: Datos básicos */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="nombre" className={labelClass}>
                                    Nombre completo
                                </label>
                                <input
                                    id="nombre"
                                    name="nombre"
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    placeholder="Juan Pérez"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className={labelClass}>
                                    Correo electrónico
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="tu@correo.com"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className={labelClass}>
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Mínimo 8 caracteres"
                                    className={inputClass}
                                />
                                {/* Password strength indicator */}
                                {formData.password && (
                                    <div className="mt-2 flex gap-1">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-all ${
                                                    formData.password.length >= i * 3
                                                        ? i <= 1
                                                            ? "bg-[#ba1a1a]"
                                                            : i <= 2
                                                                ? "bg-[#f97316]"
                                                                : i <= 3
                                                                    ? "bg-yellow-400"
                                                                    : "bg-green-500"
                                                        : "bg-[#c5c6cd]"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className={labelClass}>
                                    Confirmar contraseña
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Repite tu contraseña"
                                    className={inputClass}
                                />
                            </div>

                            {error && (
                                <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-lg px-4 py-3">
                                    <p className="text-[#93000a] text-sm">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 px-4 bg-white text-[#1b1b1d] font-semibold text-sm rounded-lg
                             border border-[#c5c6cd] hover:border-[#0d1c32] hover:bg-[#f5f3f5]
                             active:scale-[0.98] transition-all"
                                >
                                    Atrás
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex-1 py-3 px-4 bg-[#0d1c32] text-white font-semibold text-sm rounded-lg
                             hover:bg-[#1a2f4a] active:scale-[0.98] transition-all
                             shadow-[0px_2px_4px_rgba(0,0,0,0.05)]"
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: Datos específicos */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {formData.rol === "estudiante" ? (
                                <>
                                    <div>
                                        <label htmlFor="universidad" className={labelClass}>
                                            Universidad
                                        </label>
                                        <select
                                            id="universidad"
                                            name="universidad"
                                            required
                                            value={formData.universidad}
                                            onChange={handleChange}
                                            className={inputClass}
                                        >
                                            <option value="">Selecciona tu universidad</option>
                                            {UNIVERSIDADES.map((u) => (
                                                <option key={u} value={u}>
                                                    {u}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="programa" className={labelClass}>
                                            Programa académico
                                        </label>
                                        <select
                                            id="programa"
                                            name="programa"
                                            required
                                            value={formData.programa}
                                            onChange={handleChange}
                                            className={inputClass}
                                        >
                                            <option value="">Selecciona tu programa</option>
                                            {PROGRAMAS.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="semestre" className={labelClass}>
                                            Semestre actual
                                        </label>
                                        <select
                                            id="semestre"
                                            name="semestre"
                                            required
                                            value={formData.semestre}
                                            onChange={handleChange}
                                            className={inputClass}
                                        >
                                            <option value="">Selecciona tu semestre</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                                                <option key={s} value={s}>
                                                    {s}° semestre
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="razonSocial" className={labelClass}>
                                            Razón social
                                        </label>
                                        <input
                                            id="razonSocial"
                                            name="razonSocial"
                                            type="text"
                                            required
                                            value={formData.razonSocial}
                                            onChange={handleChange}
                                            placeholder="Empresa S.A.S."
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="nit" className={labelClass}>
                                            NIT
                                        </label>
                                        <input
                                            id="nit"
                                            name="nit"
                                            type="text"
                                            required
                                            value={formData.nit}
                                            onChange={handleChange}
                                            placeholder="900.123.456-7"
                                            className={inputClass}
                                        />
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-lg px-4 py-3">
                                    <p className="text-[#93000a] text-sm">{error}</p>
                                </div>
                            )}

                            {/* Checkbox aceptación */}
                            <div className="flex gap-3 items-start">
                                <input
                                    type="checkbox"
                                    id="terminos"
                                    required
                                    className="mt-0.5 w-4 h-4 border-[#c5c6cd] rounded accent-[#0d1c32]"
                                />
                                <label
                                    htmlFor="terminos"
                                    className="text-xs text-[#44474d] leading-relaxed"
                                >
                                    Acepto los{" "}
                                    <Link href="/terminos" className="underline text-[#1b1b1d]">
                                        Términos de uso
                                    </Link>{" "}
                                    y la{" "}
                                    <Link href="/privacidad" className="underline text-[#1b1b1d]">
                                        Política de privacidad
                                    </Link>
                                    , conforme a la Ley 1581 de 2012 (Habeas Data).
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-3 px-4 bg-white text-[#1b1b1d] font-semibold text-sm rounded-lg
                             border border-[#c5c6cd] hover:border-[#0d1c32] hover:bg-[#f5f3f5]
                             active:scale-[0.98] transition-all"
                                >
                                    Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 bg-[#f97316] text-white font-semibold text-sm rounded-lg
                             hover:bg-[#ea6b1e] active:scale-[0.98] transition-all
                             disabled:opacity-60 disabled:cursor-not-allowed
                             shadow-[0px_2px_4px_rgba(0,0,0,0.05)]"
                                >
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