import Link from "next/link";

const heading = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" } as const;
const NAVY = "#0d1c32";
const ORANGE = "#f97316";

function Feature({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: color }}>
                <span className="material-symbols-outlined text-white text-[24px]">{icon}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900" style={heading}>{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
        </div>
    );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
    return (
        <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold" style={{ backgroundColor: ORANGE, ...heading }}>{n}</div>
            <div>
                <h4 className="font-bold text-slate-900" style={heading}>{title}</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

export default function Landing() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
                    <span className="text-xl font-bold" style={heading}>
                        Empleo<span style={{ color: ORANGE }}>Uni</span>
                    </span>
                    <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
                        <a href="#funciones" className="hover:text-slate-900 transition-colors">Funcionalidades</a>
                        <a href="#como" className="hover:text-slate-900 transition-colors">Cómo funciona</a>
                        <a href="#roles" className="hover:text-slate-900 transition-colors">Para quién</a>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">Iniciar sesión</Link>
                        <Link href="/register" className="text-sm font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: NAVY }}>Registrarse</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-32 pb-16 px-5 md:px-8 overflow-hidden" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #16284a 60%, #1b3a6b 100%)` }}>
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: ORANGE, transform: "translate(30%,-30%)" }} />
                <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-5 bg-white" style={{ transform: "translate(-30%,30%)" }} />

                {/* Texto centrado */}
                <div className="relative max-w-3xl mx-auto flex flex-col items-center text-center gap-6">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white border border-white/20">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: ORANGE }}>school</span>
                        Corporación Universitaria Alexander von Humboldt
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight" style={heading}>
                        Tu práctica profesional <span style={{ color: ORANGE }}>empieza aquí.</span>
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed" style={{ maxWidth: "44rem" }}>
                        La plataforma que conecta estudiantes de Ingeniería de Software con empresas, con emparejamiento inteligente, gestión de prácticas y acompañamiento de la coordinación académica.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center mt-1">
                        <Link href="/register" className="font-semibold px-6 py-3 rounded-xl text-white hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2" style={{ backgroundColor: ORANGE }}>
                            Crear cuenta gratis<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </Link>
                        <Link href="/login" className="font-semibold px-6 py-3 rounded-xl text-white border border-white/30 hover:bg-white/10 transition-colors">
                            Iniciar sesión
                        </Link>
                    </div>
                    <div className="flex gap-10 mt-3">
                        {[["Matching", "IA"], ["Prácticas", "100%"], ["Convenios", "Digital"]].map(([l, v]) => (
                            <div key={l} className="text-center">
                                <p className="text-2xl font-bold text-white" style={heading}>{v}</p>
                                <p className="text-xs text-slate-400">{l}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tarjetas de vacantes (Ingeniería de Software) */}
                <div className="relative max-w-5xl mx-auto mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { rol: "Practicante Backend", emp: "TechCorp · Remoto", skills: ["Node.js", "SQL"], match: 95, color: "#0d1c32" },
                        { rol: "Practicante Frontend", emp: "PixelLab · Híbrido", skills: ["React", "CSS"], match: 91, color: "#6366f1" },
                        { rol: "Practicante Full Stack", emp: "Innovar S.A.S · Remoto", skills: ["React", "Node.js"], match: 93, color: "#f97316" },
                        { rol: "Analista de Datos", emp: "DataQ · Presencial", skills: ["Python", "SQL"], match: 88, color: "#0ea5e9" },
                    ].map((c) => (
                        <div key={c.rol} className="bg-white rounded-2xl shadow-xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: c.color, ...heading }}>
                                    {c.rol.split(" ").pop()?.charAt(0)}
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">{c.match}% match</span>
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm leading-tight" style={heading}>{c.rol}</p>
                                <p className="text-xs text-slate-400">{c.emp}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {c.skills.map((s) => <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">{s}</span>)}
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div className="h-full rounded-full" style={{ width: `${c.match}%`, backgroundColor: ORANGE }} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Funcionalidades */}
            <section id="funciones" className="py-20 px-5 md:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900" style={heading}>Todo lo que necesitas en un solo lugar</h2>
                        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">Una plataforma de microservicios diseñada para todo el ciclo de empleabilidad y prácticas.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Feature icon="auto_awesome" color="#f97316" title="Matching inteligente" desc="Un algoritmo recomienda las vacantes más compatibles con tu perfil académico y tus habilidades, con puntaje de compatibilidad." />
                        <Feature icon="work" color="#0d1c32" title="Vacantes y postulaciones" desc="Buscador avanzado con tolerancia a errores, filtros por modalidad y área, y seguimiento del estado de tus postulaciones." />
                        <Feature icon="event_available" color="#6366f1" title="Entrevistas" desc="Agenda de entrevistas virtuales o presenciales coordinada entre la empresa, la coordinación académica y el estudiante." />
                        <Feature icon="workspace_premium" color="#8b5cf6" title="Prácticas y convenios" desc="Gestión de convenios, tutores y evaluaciones por cortes (30/30/40) con certificado de cumplimiento descargable." />
                        <Feature icon="insights" color="#0ea5e9" title="Analítica institucional" desc="Indicadores de empleabilidad por programa, exportación de informes y trazabilidad completa de cada proceso." />
                        <Feature icon="notifications_active" color="#10b981" title="Notificaciones" desc="Avisos en el panel y por correo electrónico en cada paso: postulaciones, entrevistas, convenios y evaluaciones." />
                    </div>
                </div>
            </section>

            {/* Cómo funciona */}
            <section id="como" className="py-20 px-5 md:px-8 bg-white border-y border-slate-200">
                <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-3" style={heading}>Del registro a la práctica</h2>
                        <p className="text-slate-500 mb-8">Un proceso claro y acompañado en cada etapa.</p>
                        <div className="flex flex-col gap-6">
                            <Step n={1} title="Crea tu perfil" desc="Regístrate como estudiante, completa tus habilidades, LinkedIn y hoja de vida para llegar al 100%." />
                            <Step n={2} title="Postúlate a vacantes" desc="Descubre vacantes recomendadas para ti y postúlate con tu perfil académico adjunto." />
                            <Step n={3} title="Entrevista y selección" desc="La empresa te selecciona y agenda la entrevista; la coordinación la confirma contigo." />
                            <Step n={4} title="Convenio y certificado" desc="La coordinación formaliza el convenio, registra tus cortes y emites tu certificado." />
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col gap-4">
                        <span className="material-symbols-outlined text-[40px]" style={{ color: ORANGE }}>verified_user</span>
                        <h3 className="text-xl font-bold text-slate-900" style={heading}>Calidad y cumplimiento</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Construida bajo el estándar ISO/IEC 25010, con autenticación segura, roles diferenciados, auditoría de acciones y cumplimiento de la Ley 1581 (Habeas Data).
                        </p>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            {["Autenticación JWT", "Auditoría completa", "Roles (RBAC)", "Datos protegidos"].map((t) => (
                                <div key={t} className="flex items-center gap-2 text-sm text-slate-700">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>{t}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Roles */}
            <section id="roles" className="py-20 px-5 md:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900" style={heading}>Una plataforma para cada rol</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-5">
                        {[
                            { icon: "person", t: "Estudiantes", d: "Encuentra prácticas compatibles, postúlate, agenda entrevistas y gestiona tu convenio y certificado.", c: "#f97316" },
                            { icon: "business", t: "Empresas", d: "Publica vacantes, revisa candidatos con su perfil y CV, selecciónalos y agenda entrevistas.", c: "#0d1c32" },
                            { icon: "admin_panel_settings", t: "Coordinación", d: "Gestiona entrevistas, convenios, evaluaciones, liberación de estudiantes y analítica institucional.", c: "#6366f1" },
                        ].map((r) => (
                            <div key={r.t} className="rounded-2xl p-7 text-white flex flex-col gap-3" style={{ backgroundColor: r.c }}>
                                <span className="material-symbols-outlined text-[32px]">{r.icon}</span>
                                <h3 className="text-xl font-bold" style={heading}>{r.t}</h3>
                                <p className="text-sm opacity-90 leading-relaxed">{r.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA final */}
            <section className="py-20 px-5 md:px-8">
                <div className="max-w-4xl mx-auto rounded-3xl p-12 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY}, #1b3a6b)` }}>
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: ORANGE, transform: "translate(30%,-30%)" }} />
                    <h2 className="relative text-3xl font-bold text-white mb-3" style={heading}>¿Listo para empezar tu práctica?</h2>
                    <p className="relative text-slate-300 mb-8 max-w-[36rem] mx-auto">Crea tu cuenta y deja que el matching inteligente encuentre la vacante ideal para ti.</p>
                    <Link href="/register" className="relative inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-xl text-white hover:opacity-90 transition-opacity shadow-lg" style={{ backgroundColor: ORANGE }}>
                        Registrarme ahora
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-8 px-5 md:px-8">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <span className="text-lg font-bold" style={heading}>Empleo<span style={{ color: ORANGE }}>Uni</span></span>
                    <p className="text-xs text-slate-400">© 2026 EmpleoUni · CUE Alexander von Humboldt · Armenia, Quindío</p>
                    <div className="flex gap-5 text-sm text-slate-500">
                        <Link href="/login" className="hover:text-slate-900">Iniciar sesión</Link>
                        <Link href="/register" className="hover:text-slate-900">Registrarse</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
