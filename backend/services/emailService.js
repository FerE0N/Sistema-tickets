//services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendResetEmail(to, resetUrl) {
    await transporter.sendMail({
        from: `"Soporte Sistema de Tickets" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Restablecimiento de contraseña',
        html: `
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente enlace para continuar:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>Este enlace caduca en 30 minutos.</p>
        `
    });
}

module.exports = { sendResetEmail };
