// functions/api/callback.js

function renderBody(status, content) {
  // This HTML runs inside the popup and talks to the CMS window
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Authentication ${status}</title></head>
      <body>
        <p>Authentication ${status}. You can close this window.</p>
        <script>
          (function () {
            function receiveMessage(message) {
              // Send token back to the admin window
              window.opener.postMessage(
                'authorization:github:${status}:'
                  + ${JSON.stringify('')}.slice(0,0) // no-op to keep template simple
                  + JSON.stringify(${/* placeholder, replaced below */'CONTENT_PLACEHOLDER'}),
                message.origin
              );
              window.removeEventListener('message', receiveMessage, false);
            }

            window.addEventListener('message', receiveMessage, false);
            // Start handshake with parent
            window.opener.postMessage('authorizing:github', '*');
          })();
        </script>
      </body>
    </html>
  `;

  // Replace placeholder with real JSON at runtime
  return html.replace(
    '"CONTENT_PLACEHOLDER"',
    JSON.stringify(content)
  );
}

export async function onRequest(context) {
  const { request, env } = context;
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response('GitHub client ID/secret not configured', { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return new Response('Missing "code" parameter', { status: 400 });
    }

    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
          'user-agent': 'cf-pages-decap-oauth',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    const result = await tokenResponse.json();

    if (result.error) {
      const body = renderBody('error', result);
      return new Response(body, {
        status: 401,
        headers: { 'content-type': 'text/html;charset=UTF-8' },
      });
    }

    const token = result.access_token;
    const provider = 'github';

    const body = renderBody('success', { token, provider });

    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    });
  } catch (error) {
    const body = renderBody('error', { message: String(error?.message || error) });
    return new Response(body, {
      status: 500,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    });
  }
}
