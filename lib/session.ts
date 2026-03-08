import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_COOKIE = 'qc_session';
const SECRET = process.env.SESSION_SECRET || 'fallback-secret-change-me';

function sign(value: string): string {
  const hmac = createHmac('sha256', SECRET).update(value).digest('base64url');
  return `${value}.${hmac}`;
}

function unsign(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;
  const value = signed.slice(0, lastDot);
  const expected = sign(value);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signed);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return value;
  } catch {
    return null;
  }
}

/** Returns the signed cookie value string (to use with res.cookies.set) */
export function createSessionValue(accessToken: string): string {
  const payload = Buffer.from(JSON.stringify({ accessToken })).toString('base64url');
  return sign(payload);
}

/** Cookie name — so callback route can reference it */
export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/** Cookie options for setting the session */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 2592000, // 30 days
  path: '/',
};

/** Read the session from the request cookies */
export async function getSession(): Promise<{ accessToken: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const value = unsign(raw);
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}
