const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "mailpit";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "1025", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "EmpleoUni <no-reply@empleouni.co>";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Transporte SMTP. En desarrollo apunta a Mailpit (sin auth/TLS);
// en producción se configuran SMTP_USER/SMTP_PASS y secure según el proveedor.
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

function plantilla(titulo, mensaje) {
    return `
    <div style="background:#f8f9fb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#0d1c32;padding:20px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;">Empleo<span style="color:#f97316;">Uni</span></span>
        </div>
        <div style="padding:28px;">
          <h1 style="font-size:18px;color:#0d1c32;margin:0 0 12px;">${titulo}</h1>
          <p style="font-size:14px;color:#44474d;line-height:1.6;margin:0;">${mensaje}</p>
          <a href="${FRONTEND_URL}/perfil" style="display:inline-block;margin-top:24px;background:#f97316;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:10px 20px;border-radius:8px;">Ver en la plataforma</a>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #f0f0f0;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">EmpleoUni · Corporación Universitaria Alexander von Humboldt · Este es un mensaje automático.</p>
        </div>
      </div>
    </div>`;
}

async function enviarEmail({ to, titulo, mensaje }) {
    return transporter.sendMail({
        from: MAIL_FROM,
        to,
        subject: titulo,
        text: mensaje,
        html: plantilla(titulo, mensaje),
    });
}

module.exports = { enviarEmail };
