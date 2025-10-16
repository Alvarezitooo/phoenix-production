import type { AppSession } from '@/lib/auth';

function parseEnvList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

const STAFF_EMAILS = new Set<string>(parseEnvList(process.env.LUNA_STAFF_EMAILS));
const STAFF_USER_IDS = new Set<string>(parseEnvList(process.env.LUNA_STAFF_USER_IDS));

export function isStaffSession(session: AppSession | null | undefined) {
  if (!session?.user) return false;

  const email = session.user.email?.toLowerCase();
  if (email && STAFF_EMAILS.has(email)) {
    return true;
  }

  if (session.user.id && STAFF_USER_IDS.has(session.user.id.toLowerCase())) {
    return true;
  }

  return false;
}
