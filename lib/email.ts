// Envio de emails (códigos de confirmação, recuperar senha).
// Em desenvolvimento, sem SMTP_HOST no .env, o email aparece no terminal do servidor.
import nodemailer from "nodemailer";

export async function enviarEmail(para: string, assunto: string, texto: string): Promise<void> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    console.log(`\n[EMAIL para ${para}] ${assunto}\n${texto}\n`);
    return;
  }

  const transporte = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  await transporte.sendMail({
    from: process.env.EMAIL_REMETENTE || "BicoJá <nao-responda@bicoja.com.br>",
    to: para,
    subject: assunto,
    text: texto,
  });
}
