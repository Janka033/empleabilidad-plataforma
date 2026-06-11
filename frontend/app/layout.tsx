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
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
            />
        </head>
        <body className="h-full">{children}</body>
        </html>
    );
}
