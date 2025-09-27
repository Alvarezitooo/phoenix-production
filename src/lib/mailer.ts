import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function ensureTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: false,
    auth:
      process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
        ? {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          }
        : undefined,
  });

  return transporter;
}

export async function sendAssessmentCompletedEmail(to: string, assessmentType: string) {
  if (!process.env.EMAIL_FROM) {
    console.warn('EMAIL_FROM not configured, skipping notification');
    return;
  }

  const transport = ensureTransporter();

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your ${assessmentType} assessment is ready`,
    html: `
      <p>Bonjour,</p>
      <p>Votre évaluation <strong>${assessmentType}</strong> est terminée. Connectez-vous à Phoenix pour découvrir vos recommandations de carrière.</p>
      <p>À très vite,<br/>L'équipe Phoenix</p>
    `,
  });
}
