export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 1. Get Environment Variables
  const client_id = env.GITHUB_CLIENT_ID;
  
  if (!client_id) {
    return new Response('GITHUB_CLIENT_ID not configured', { status: 500 });
  }

  // 2. Construct the Redirect URI
  // Dynamic based on the current request origin (e.g. https://your-site.pages.dev)
  // Appends /api/callback
  const redirect_uri = `${url.origin}/api/callback`;
  
  // 3. Construct GitHub OAuth URL
  const params = new URLSearchParams({
    client_id,
    scope: 'repo', // Decap CMS needs repo scope
    redirect_uri,
    // state: ... // Recommended for security but optional for basic setup
  });
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  // 4. Redirect the user
  return Response.redirect(githubAuthUrl, 302);
}

