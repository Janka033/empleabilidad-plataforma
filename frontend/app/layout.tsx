import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "EmpleoUni",
    description: "Plataforma de empleabilidad para estudiantes",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className="h-full antialiased">
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
            />
        </head>
        <body className="h-full" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>{children}</body>
        </html>
    );
}
