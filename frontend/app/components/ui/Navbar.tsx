"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "../../lib/auth";

type Rol = "estudiante" | "empresa" | null;

export default function Navbar() {
    const pathname = usePathname();
    const router   = useRouter();
    const [rol, setRol] = useState<Rol>(null);
    const [nombre, setNombre] = useState<string>("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setRol(payload.rol ?? null);
        } catch {}
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            setNombre(user.nombre?.split(" ")[0] ?? "");
        } catch {}
    }, []);

    const handleLogout = () => {
        clearSession();
        router.push("/login");
    };

    // ── Links según rol ─────────────────────────────────────────────────────
    const estudianteLinks = [
        { href: "/vacantes", label: "Vacantes" },
        { href: "/perfil",   label: "Mi Perfil" },
    ];

    const empresaLinks = [
        { href: "/empresa/dashboard", label: "Panel de empresa" },
    ];

    const links = rol === "empresa" ? empresaLinks : estudianteLinks;

    return (
        <header className="bg-surface border-b border-outline-variant shadow-level-1 fixed top-0 w-full z-50">
            <div className="flex justify-between items-center px-margin-mobile md:px-xl h-16 max-w-container-max mx-auto">

                {/* Brand */}
                <div className="flex items-center gap-xl">
                    <Link
                        href={rol === "empresa" ? "/empresa/dashboard" : "/vacantes"}
                        className="font-headline-md text-headline-md font-bold tracking-tight"
                        style={{ color: "#0d1c32" }}
                    >
                        Empleo<span style={{ color: "#f97316" }}>Uni</span>
                    </Link>

                    {/* Nav links — desktop */}
                    <nav className="hidden md:flex gap-md h-full items-center">
                        {links.map(({ href, label }) => {
                            const active = pathname === href || pathname.startsWith(href + "/");
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={
                                        active
                                            ? "text-primary font-body-md text-body-md border-b-2 border-primary pb-1 flex items-center h-full pt-[6px] transition-colors"
                                            : "text-on-surface-variant font-body-md text-body-md hover:text-primary transition-colors flex items-center h-full pt-1"
                                    }
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-md">
                    {/* Badge de rol */}
                    {rol && (
                        <span className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full font-label-sm text-label-sm ${
                            rol === "empresa"
                                ? "bg-[#e0e7ff] text-[#3730a3]"
                                : "bg-[#dcfce7] text-[#166534]"
                        }`}>
                            {rol === "empresa" ? "🏢" : "🎓"} {nombre || (rol === "empresa" ? "Empresa" : "Estudiante")}
                        </span>
                    )}

                    <button
                        onClick={handleLogout}
                        className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </header>
    );
}
