"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URLS } from "../../lib/api";

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

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "white",
    border: "1px solid #c5c6cd",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#1b1b1d",
    boxSizing: "border-box",
    outline: "none",
};

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#1b1b1d",
    marginBottom: "6px",
};

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState<RegisterForm>({
        nombre: "", email: "", password: "", confirmPassword: "",
        rol: "estudiante", universidad: "", programa: "", semestre: "",
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
            localStorage.setItem("token", data.token);
            router.push("/vacantes");
        } catch {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const stepTitles = ["Crear cuenta", "Datos de acceso", "Información de perfil"];

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>

            {/* Panel izquierdo — navy */}
            <div style={{ width: "50%", backgroundColor: "#0d1c32", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px", position: "relative", overflow: "hidden" }}
                 className="hidden lg:flex">
                <div style={{ position: "absolute", top: 0, right: 0, width: "384px", height: "384px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "9999px", transform: "translate(50%,-50%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "256px", height: "256px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "9999px", transform: "translate(-50%,50%)" }} />

                <div style={{ position: "relative", zIndex: 10 }}>
          <span style={{ color: "white", fontSize: "24px", fontWeight: "700" }}>
            Empleo<span style={{ color: "#f97316" }}>Uni</span>
          </span>
                    <p style={{ color: "#b9c7e4", fontSize: "14px", marginTop: "4px" }}>Plataforma de empleabilidad universitaria</p>
                </div>

                <div style={{ position: "relative", zIndex: 10 }}>
                    {/* Steps */}
                    <div style={{ marginBottom: "40px" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            {[1, 2, 3].map((s) => (
                                <div key={s} style={{ display: "flex", alignItems: "center" }}>
                                    <div style={{
                                        width: "32px", height: "32px", borderRadius: "9999px",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "12px", fontWeight: "700",
                                        backgroundColor: s < step ? "#f97316" : s === step ? "white" : "rgba(255,255,255,0.2)",
                                        color: s < step ? "white" : s === step ? "#0d1c32" : "rgba(255,255,255,0.5)",
                                    }}>
                                        {s < step ? "✓" : s}
                                    </div>
                                    {s < 3 && (
                                        <div style={{ height: "2px", width: "48px", backgroundColor: s < step ? "#f97316" : "rgba(255,255,255,0.2)" }} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: "40px", marginTop: "8px" }}>
                            {["Rol", "Cuenta", "Perfil"].map((label, i) => (
                                <span key={label} style={{ fontSize: "12px", color: i + 1 <= step ? "white" : "rgba(255,255,255,0.4)" }}>
                  {label}
                </span>
                            ))}
                        </div>
                    </div>

                    <h2 style={{ color: "white", fontSize: "30px", fontWeight: "700", lineHeight: "1.2", marginBottom: "16px" }}>
                        {step === 1 && <>Elige cómo<br /><span style={{ color: "#f97316" }}>participas.</span></>}
                        {step === 2 && <>Crea tu<br /><span style={{ color: "#f97316" }}>cuenta.</span></>}
                        {step === 3 && <>Completa<br />tu <span style={{ color: "#f97316" }}>{formData.rol === "estudiante" ? "perfil." : "empresa."}</span></>}
                    </h2>
                    <p style={{ color: "#76849f", fontSize: "14px", lineHeight: "1.6", maxWidth: "320px" }}>
                        {step === 1 && "¿Eres estudiante buscando oportunidades o empresa buscando talento?"}
                        {step === 2 && "Tu email y contraseña para acceder a la plataforma."}
                        {step === 3 && formData.rol === "estudiante" && "Información académica para encontrar vacantes compatibles con tu perfil."}
                        {step === 3 && formData.rol === "empresa" && "Datos de tu organización para publicar vacantes y prácticas."}
                    </p>
                </div>

                <div style={{ position: "relative", zIndex: 10 }}>
                    <p style={{ color: "#44474d", fontSize: "12px" }}>© 2025 EmpleoUni — CUE Armenia, Quindío</p>
                </div>
            </div>

            {/* Panel derecho — formulario */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "#fbf9fb", padding: "48px 24px" }}>
                <div style={{ width: "100%", maxWidth: "448px" }}>

                    <div style={{ marginBottom: "32px" }}>
                        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1b1b1d" }}>{stepTitles[step - 1]}</h1>
                        <p style={{ color: "#44474d", fontSize: "14px", marginTop: "4px" }}>
                            ¿Ya tienes cuenta?{" "}
                            <Link href="/login" style={{ color: "#0d1c32", fontWeight: "600", textDecoration: "none" }}>Inicia sesión</Link>
                        </p>
                    </div>

                    {/* PASO 1 */}
                    {step === 1 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <p style={{ fontSize: "14px", fontWeight: "600", color: "#1b1b1d" }}>Soy...</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                {(["estudiante", "empresa"] as UserRole[]).map((rol) => (
                                    <button key={rol} type="button" onClick={() => setFormData({ ...formData, rol })}
                                            style={{
                                                padding: "20px", borderRadius: "12px", textAlign: "left", cursor: "pointer",
                                                border: formData.rol === rol ? "2px solid #0d1c32" : "2px solid #c5c6cd",
                                                backgroundColor: formData.rol === rol ? "rgba(13,28,50,0.05)" : "white",
                                            }}>
                                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>{rol === "estudiante" ? "🎓" : "🏢"}</div>
                                        <p style={{ fontWeight: "600", fontSize: "14px", textTransform: "capitalize", color: formData.rol === rol ? "#0d1c32" : "#1b1b1d", margin: 0 }}>{rol}</p>
                                        <p style={{ fontSize: "12px", color: "#44474d", marginTop: "2px" }}>
                                            {rol === "estudiante" ? "Busco prácticas y empleos" : "Publico vacantes"}
                                        </p>
                                    </button>
                                ))}
                            </div>
                            <button type="button" onClick={() => setStep(2)}
                                    style={{ width: "100%", padding: "12px 16px", backgroundColor: "#0d1c32", color: "white", fontWeight: "600", fontSize: "14px", borderRadius: "8px", border: "none", cursor: "pointer", marginTop: "8px" }}>
                                Continuar
                            </button>
                        </div>
                    )}

                    {/* PASO 2 */}
                    {step === 2 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {[
                                { id: "nombre", label: "Nombre completo", type: "text", placeholder: "Juan Pérez" },
                                { id: "email", label: "Correo electrónico", type: "email", placeholder: "tu@correo.com" },
                                { id: "password", label: "Contraseña", type: "password", placeholder: "Mínimo 8 caracteres" },
                                { id: "confirmPassword", label: "Confirmar contraseña", type: "password", placeholder: "Repite tu contraseña" },
                            ].map(({ id, label, type, placeholder }) => (
                                <div key={id}>
                                    <label style={labelStyle}>{label}</label>
                                    <input id={id} name={id} type={type} required placeholder={placeholder}
                                           value={formData[id as keyof RegisterForm] as string}
                                           onChange={handleChange} style={inputStyle} />
                                </div>
                            ))}

                            {error && (
                                <div style={{ backgroundColor: "#ffdad6", border: "1px solid rgba(186,26,26,0.3)", borderRadius: "8px", padding: "12px 16px" }}>
                                    <p style={{ color: "#93000a", fontSize: "14px", margin: 0 }}>{error}</p>
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setStep(1)}
                                        style={{ flex: 1, padding: "12px 16px", backgroundColor: "white", color: "#1b1b1d", fontWeight: "600", fontSize: "14px", borderRadius: "8px", border: "1px solid #c5c6cd", cursor: "pointer" }}>
                                    Atrás
                                </button>
                                <button type="button" onClick={handleNext}
                                        style={{ flex: 1, padding: "12px 16px", backgroundColor: "#0d1c32", color: "white", fontWeight: "600", fontSize: "14px", borderRadius: "8px", border: "none", cursor: "pointer" }}>
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO 3 */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {formData.rol === "estudiante" ? (
                                <>
                                    {[
                                        { id: "universidad", label: "Universidad", options: UNIVERSIDADES, placeholder: "Selecciona tu universidad" },
                                        { id: "programa", label: "Programa académico", options: PROGRAMAS, placeholder: "Selecciona tu programa" },
                                    ].map(({ id, label, options, placeholder }) => (
                                        <div key={id}>
                                            <label style={labelStyle}>{label}</label>
                                            <select id={id} name={id} required onChange={handleChange}
                                                    value={formData[id as keyof RegisterForm] as string} style={inputStyle}>
                                                <option value="">{placeholder}</option>
                                                {options.map((o) => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                    <div>
                                        <label style={labelStyle}>Semestre actual</label>
                                        <select id="semestre" name="semestre" required onChange={handleChange} value={formData.semestre} style={inputStyle}>
                                            <option value="">Selecciona tu semestre</option>
                                            {[1,2,3,4,5,6,7,8,9,10].map((s) => <option key={s} value={s}>{s}° semestre</option>)}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label style={labelStyle}>Razón social</label>
                                        <input id="razonSocial" name="razonSocial" type="text" required placeholder="Empresa S.A.S."
                                               value={formData.razonSocial} onChange={handleChange} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>NIT</label>
                                        <input id="nit" name="nit" type="text" required placeholder="900.123.456-7"
                                               value={formData.nit} onChange={handleChange} style={inputStyle} />
                                    </div>
                                </>
                            )}

                            {error && (
                                <div style={{ backgroundColor: "#ffdad6", border: "1px solid rgba(186,26,26,0.3)", borderRadius: "8px", padding: "12px 16px" }}>
                                    <p style={{ color: "#93000a", fontSize: "14px", margin: 0 }}>{error}</p>
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <input type="checkbox" id="terminos" required style={{ marginTop: "2px", width: "16px", height: "16px" }} />
                                <label htmlFor="terminos" style={{ fontSize: "12px", color: "#44474d", lineHeight: "1.6" }}>
                                    Acepto los <Link href="/terminos" style={{ textDecoration: "underline", color: "#1b1b1d" }}>Términos de uso</Link>{" "}
                                    y la <Link href="/privacidad" style={{ textDecoration: "underline", color: "#1b1b1d" }}>Política de privacidad</Link>,
                                    conforme a la Ley 1581 de 2012 (Habeas Data).
                                </label>
                            </div>

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setStep(2)}
                                        style={{ flex: 1, padding: "12px 16px", backgroundColor: "white", color: "#1b1b1d", fontWeight: "600", fontSize: "14px", borderRadius: "8px", border: "1px solid #c5c6cd", cursor: "pointer" }}>
                                    Atrás
                                </button>
                                <button type="submit" disabled={loading}
                                        style={{ flex: 1, padding: "12px 16px", backgroundColor: "#f97316", color: "white", fontWeight: "600", fontSize: "14px", borderRadius: "8px", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
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
