"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URLS } from "../lib/api";
import { saveSession } from "../lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

// Tipos mínimos de Google Identity Services
interface GoogleCredentialResponse { credential: string }
interface GoogleIdApi {
    initialize: (cfg: { client_id: string; callback: (r: GoogleCredentialResponse) => void }) => void;
    renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
}
declare global {
    interface Window { google?: { accounts: { id: GoogleIdApi } } }
}

/**
 * Botón "Continuar con Google".
 * - `rol`: rol a asignar si la cuenta es nueva (estudiante por defecto).
 * Si NEXT_PUBLIC_GOOGLE_CLIENT_ID no está configurado, no renderiza nada.
 */
export default function GoogleButton({ rol }: { rol?: "estudiante" | "empresa" }) {
    const router = useRouter();
    const divRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;

        const handleCredential = async (resp: GoogleCredentialResponse) => {
            setError("");
            try {
                const res = await fetch(`${API_URLS.auth}/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ credential: resp.credential, rol }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) { setError(data.message || "No se pudo iniciar con Google"); return; }
                saveSession(data.token, data.role, data.user);
                if (data.role === "admin") router.push("/admin/dashboard");
                else if (data.role === "empresa") router.push("/empresa/dashboard");
                else router.push("/vacantes");
            } catch {
                setError("Error de conexión con Google");
            }
        };

        const init = () => {
            if (!window.google || !divRef.current) return;
            window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
            window.google.accounts.id.renderButton(divRef.current, {
                theme: "outline", size: "large", width: 320, text: "continue_with", shape: "pill",
            });
            setReady(true);
        };

        if (window.google) { init(); return; }

        const existing = document.getElementById("google-gsi");
        if (existing) { existing.addEventListener("load", init); return; }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true; script.defer = true; script.id = "google-gsi";
        script.onload = init;
        document.body.appendChild(script);
    }, [rol, router]);

    if (!GOOGLE_CLIENT_ID) return null;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 w-full my-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">o</span>
                <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div ref={divRef} className="min-h-[40px] flex justify-center" />
            {!ready && <span className="text-xs text-slate-400">Cargando Google…</span>}
            {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
    );
}
