"use client";

interface Props {
    show: boolean;
    tipo: "warning" | "success";
    titulo: string;
    mensaje: string;
    labelConfirm?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

export default function ConfirmModal({
                                         show, tipo, titulo, mensaje, labelConfirm = "Confirmar", onConfirm, onCancel,
                                     }: Props) {
    if (!show) return null;

    return (
        <div
            style={{
                position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 999, padding: "16px",
            }}
            onClick={onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: "white", borderRadius: "16px", padding: "32px 28px",
                    maxWidth: "400px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
                }}
            >
                {/* Icono */}
                <div style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    backgroundColor: tipo === "success" ? "#f0fdf4" : "#fff7ed",
                    border: `2px solid ${tipo === "success" ? "#86efac" : "#fed7aa"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "26px", fontWeight: "700",
                    color: tipo === "success" ? "#16a34a" : "#ea580c",
                }}>
                    {tipo === "success" ? "✓" : "!"}
                </div>

                {/* Texto */}
                <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: "700", fontSize: "16px", color: "#1b1b1d", margin: 0 }}>
                        {titulo}
                    </p>
                    <p style={{ fontSize: "14px", color: "#44474d", marginTop: "8px", lineHeight: "1.6" }}>
                        {mensaje}
                    </p>
                </div>

                {/* Botones */}
                <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "4px" }}>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            style={{
                                flex: 1, padding: "10px", borderRadius: "10px",
                                border: "1px solid #c5c6cd", backgroundColor: "white",
                                fontSize: "14px", fontWeight: "600", color: "#44474d", cursor: "pointer",
                            }}
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1, padding: "10px", borderRadius: "10px", border: "none",
                            backgroundColor: tipo === "success" ? "#16a34a" : "#0d1c32",
                            fontSize: "14px", fontWeight: "600", color: "white", cursor: "pointer",
                        }}
                    >
                        {labelConfirm}
                    </button>
                </div>
            </div>
        </div>
    );
}