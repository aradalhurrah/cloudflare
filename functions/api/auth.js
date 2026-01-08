// functions/api/auth.js
export async function onRequest(context) {
  const { request, env } = context;
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response('GITHUB_CLIENT_ID not configured', { status: 500 });
  }

  try {
    const url = new URL(request.url);

    // This will be the URL GitHub redirects back to after auth:
    const redirectUri = `${url.origin}/api/callback`;

    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', clientId);
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
    githubAuthUrl.searchParams.set('scope', 'repo user'); // or just 'repo' if public only
    githubAuthUrl.searchParams.set(
      'state',
      crypto.getRandomValues(new Uint8Array(12)).join('')
    );

    return Response.redirect(githubAuthUrl.toString(), 302);
  } catch (err) {
    return new Response(String(err?.message || err), { status: 500 });
  }
}
