"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        router.push("/login");
    };

    const links = [
        { href: "/vacantes", label: "Vacantes" },
        { href: "/perfil", label: "Mi Perfil" },
    ];

    return (
        <header className="bg-surface border-b border-outline-variant shadow-level-1 fixed top-0 w-full z-50">
            <div className="flex justify-between items-center px-margin-mobile md:px-xl h-16 max-w-container mx-auto">
                {/* Brand */}
                <div className="flex items-center gap-xl">
                    <Link
                        href="/vacantes"
                        className="text-headline-md font-bold text-primary tracking-tight"
                    >
                        Empleo<span className="text-orange">Uni</span>
                    </Link>

                    {/* Nav links desktop */}
                    <nav className="hidden md:flex gap-md h-full items-center">
                        {links.map(({ href, label }) => {
                            const active = pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={
                                        active
                                            ? "text-primary text-body-md border-b-2 border-primary pb-1 flex items-center h-full pt-[6px] transition-colors"
                                            : "text-on-surface-variant text-body-md hover:text-primary transition-colors flex items-center h-full pt-1"
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
                    <button
                        onClick={handleLogout}
                        className="text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </header>
    );
}

