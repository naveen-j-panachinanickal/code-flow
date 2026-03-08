import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ user: null });
    }

    const data = await res.json();
    return NextResponse.json({
      user: {
        login: data.login,
        name: data.name,
        avatar_url: data.avatar_url,
        html_url: data.html_url,
      }
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
