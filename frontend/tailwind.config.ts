import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            // ─── Colores del Design System Stitch — Academic Career Bridge ───
            colors: {
                // Superficies
                surface: "#fbf9fb",
                "surface-dim": "#dbd9db",
                "surface-bright": "#fbf9fb",
                "surface-container-lowest": "#ffffff",
                "surface-container-low": "#f5f3f5",
                "surface-container": "#efedef",
                "surface-container-high": "#eae7ea",
                "surface-container-highest": "#e4e2e4",
                "surface-variant": "#e4e2e4",
                "surface-tint": "#515f78",
                // On-surface
                "on-surface": "#1b1b1d",
                "on-surface-variant": "#44474d",
                "inverse-surface": "#303032",
                "inverse-on-surface": "#f2f0f2",
                // Bordes
                outline: "#75777e",
                "outline-variant": "#c5c6cd",
                // Primary — negro / navy
                primary: "#000000",
                "on-primary": "#ffffff",
                "primary-container": "#0d1c32",
                "on-primary-container": "#76849f",
                "inverse-primary": "#b9c7e4",
                "primary-fixed": "#d6e3ff",
                "primary-fixed-dim": "#b9c7e4",
                "on-primary-fixed": "#0d1c32",
                "on-primary-fixed-variant": "#39475f",
                // Secondary
                secondary: "#5d5f5f",
                "on-secondary": "#ffffff",
                "secondary-container": "#dfe0e0",
                "on-secondary-container": "#616363",
                "secondary-fixed": "#e2e2e2",
                "secondary-fixed-dim": "#c6c6c7",
                "on-secondary-fixed": "#1a1c1c",
                "on-secondary-fixed-variant": "#454747",
                // Tertiary (tonos cálidos)
                tertiary: "#000000",
                "on-tertiary": "#ffffff",
                "tertiary-container": "#2b1701",
                "on-tertiary-container": "#9f7d5b",
                "tertiary-fixed": "#ffdcbd",
                "tertiary-fixed-dim": "#e7bf99",
                "on-tertiary-fixed": "#2b1701",
                "on-tertiary-fixed-variant": "#5d4124",
                // Error
                error: "#ba1a1a",
                "on-error": "#ffffff",
                "error-container": "#ffdad6",
                "on-error-container": "#93000a",
                // Background
                background: "#fbf9fb",
                "on-background": "#1b1b1d",
                // Custom — CTA naranja (mencionado en DESIGN.md como "Vibrant Orange")
                orange: "#f97316",
                "orange-hover": "#ea6b1e",
                navy: "#0d1c32",
                "navy-hover": "#1a2f4a",
            },

            // ─── Tipografía ───
            fontFamily: {
                inter: ["Inter", "sans-serif"],
                sans: ["Inter", "sans-serif"],
            },

            fontSize: {
                "display-lg": [
                    "48px",
                    { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.02em" },
                ],
                "headline-lg": ["32px", { lineHeight: "1.3", fontWeight: "700" }],
                "headline-lg-mobile": [
                    "24px",
                    { lineHeight: "1.3", fontWeight: "700" },
                ],
                "headline-md": ["24px", { lineHeight: "1.4", fontWeight: "600" }],
                "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
                "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
                "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
                "label-md": [
                    "14px",
                    { lineHeight: "1", fontWeight: "600", letterSpacing: "0.01em" },
                ],
                "label-sm": ["12px", { lineHeight: "1", fontWeight: "500" }],
            },

            // ─── Border Radius ───
            borderRadius: {
                DEFAULT: "0.5rem",
                sm: "0.25rem",
                md: "0.75rem",
                lg: "1rem",
                xl: "1.5rem",
                full: "9999px",
            },

            // ─── Spacing ───
            spacing: {
                base: "4px",
                xs: "8px",
                sm: "16px",
                md: "24px",
                lg: "40px",
                xl: "64px",
                gutter: "24px",
                "container-max": "1280px",
                "margin-mobile": "16px",
            },

            // ─── Sombras ───
            boxShadow: {
                "level-1": "0px 2px 4px rgba(0, 0, 0, 0.05)",
                "level-2": "0px 10px 20px rgba(0, 0, 0, 0.08)",
                "level-3":
                    "0px 20px 40px rgba(13, 28, 50, 0.12), 0px 4px 12px rgba(0,0,0,0.06)",
            },

            // ─── Max Width ───
            maxWidth: {
                container: "1280px",
            },

            // ─── Animations ───
            keyframes: {
                "fade-in": {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "slide-in": {
                    "0%": { opacity: "0", transform: "translateX(-16px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
            },
            animation: {
                "fade-in": "fade-in 0.3s ease-out",
                "slide-in": "slide-in 0.3s ease-out",
            },
        },
    },
    plugins: [],
};

export default config;