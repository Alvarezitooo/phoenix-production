import nodemailer from 'nodemailer';

type LetterReminderEmailParams = {
  to: string;
  name?: string;
  draftId: string;
  draftTitle: string;
  updatedAt: Date;
  keywords: string[];
};

type RitualReminderEmailParams = {
  to: string;
  name?: string;
  pendingRituals: string[];
  streakDays?: number;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendLetterReminderEmail(params: LetterReminderEmailParams) {
  const transport = getTransporter();
  const formattedDate = params.updatedAt.toLocaleDateString('fr-FR', { dateStyle: 'medium' });
  const keywords = params.keywords.length ? params.keywords.join(', ') : null;

  const subject = 'Ta lettre est presque prête – Luna t’accompagne';
  const bodyLines = [
    `Bonjour ${params.name ?? 'cher membre'},`,
    '',
    `Ton brouillon “${params.draftTitle}” est resté en veille depuis le ${formattedDate}. Luna te propose de le finaliser pour publier ta lettre.`,
  ];

  if (keywords) {
    bodyLines.push(`Mots-clés Luna : ${keywords}`);
  }

  bodyLines.push(
    '',
    'Reviens au studio lettres pour relancer ton élan.',
    '',
    'À très vite,',
    'Luna'
  );

  await transport.sendMail({
    from: process.env.MAILER_FROM ?? 'Luna <luna@phoenix.app>',
    to: params.to,
    subject,
    text: bodyLines.join('\n'),
  });
}

export async function sendRitualReminderEmail(params: RitualReminderEmailParams) {
  const transport = getTransporter();
  const subject = 'Tes rituels Luna t’attendent';
  const ritualsList = params.pendingRituals.length
    ? params.pendingRituals.map((item) => `• ${item}`).join('\n')
    : null;

  const bodyLines = [
    `Bonjour ${params.name ?? 'ami de Luna'},`,
    '',
    'Prends deux minutes pour nourrir ton énergie aujourd’hui. Les rituels ci-dessous t’aideront à rester dans ton élan :',
  ];

  if (ritualsList) {
    bodyLines.push('', ritualsList);
  }

  if (params.streakDays && params.streakDays > 0) {
    bodyLines.push(
      '',
      `Ton streak actuel est de ${params.streakDays} jour${params.streakDays > 1 ? 's' : ''}. Un petit rituel maintenant et tu restes sur ta lancée !`,
    );
  }

  bodyLines.push('', 'À très vite dans l’espace Luna ✦');

  await transport.sendMail({
    from: process.env.MAILER_FROM ?? 'Luna <luna@phoenix.app>',
    to: params.to,
    subject,
    text: bodyLines.join('\n'),
  });
}
