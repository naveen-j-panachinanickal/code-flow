import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = NextResponse.redirect(`${appUrl}/`);
  res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
