import { NextRequest, NextResponse } from 'next/server';
import { createSessionValue, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = req.cookies.get('oauth_state')?.value;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // CSRF check
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?auth_error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?auth_error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${appUrl}/api/auth/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData);
      return NextResponse.redirect(`${appUrl}/?auth_error=token_exchange_failed`);
    }

    const res = NextResponse.redirect(`${appUrl}/`);

    // Set session cookie using cookies API (avoids Set-Cookie header conflicts)
    res.cookies.set(SESSION_COOKIE_NAME, createSessionValue(tokenData.access_token), SESSION_COOKIE_OPTIONS);

    // Clear the CSRF state cookie
    res.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });

    return res;

  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/?auth_error=server_error`);
  }
}
