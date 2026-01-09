// functions/api/callback.js

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

    // 1) Exchange code for access token with GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
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
    });

    const result = await tokenResponse.json();

    if (result.error) {
      const errorContent = JSON.stringify({
        error: result.error,
        error_description: result.error_description,
      });

      const errorHtml = `
        <!doctype html>
        <html>
          <head><title>Authentication error</title></head>
          <body>
            <p>Authentication error. You can close this window.</p>
            <script>
              (function () {
                function receiveMessage(e) {
                  window.opener.postMessage(
                    'authorization:github:error:' + ${JSON.stringify(errorContent)},
                    e.origin
                  );
                  window.removeEventListener('message', receiveMessage, false);
                  window.close();
                }
                window.addEventListener('message', receiveMessage, false);
                window.opener.postMessage('authorizing:github', '*');
              })();
            </script>
          </body>
        </html>
      `;
      return new Response(errorHtml, {
        status: 401,
        headers: { 'content-type': 'text/html;charset=UTF-8' },
      });
    }

    const token = result.access_token;
    const postMsgContent = JSON.stringify({
      token,
      provider: 'github',
    });

    // 2) This HTML/JS runs in the popup and sends token to Decap via postMessage
    const successHtml = `
      <!doctype html>
      <html>
        <head><title>Authentication success</title></head>
        <body>
          <p>Authentication success. You can close this window.</p>
          <script>
            (function () {
              function receiveMessage(e) {
                // send message back to the Decap admin window
                window.opener.postMessage(
                  'authorization:github:success:${postMsgContent}',
                  e.origin
                );
                window.removeEventListener('message', receiveMessage, false);
                window.close();
              }
              window.addEventListener('message', receiveMessage, false);
              // start handshake with the parent window (Decap)
              window.opener.postMessage('authorizing:github', '*');
            })();
          </script>
        </body>
      </html>
    `;

    return new Response(successHtml, {
      status: 200,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    });
  } catch (error) {
    const errorContent = JSON.stringify({
      message: String(error?.message || error),
    });
    const errorHtml = `
      <!doctype html>
      <html>
        <head><title>Authentication error</title></head>
        <body>
          <p>Authentication error. You can close this window.</p>
          <script>
            (function () {
              function receiveMessage(e) {
                window.opener.postMessage(
                  'authorization:github:error:' + ${JSON.stringify(errorContent)},
                  e.origin
                );
                window.removeEventListener('message', receiveMessage, false);
                window.close();
              }
              window.addEventListener('message', receiveMessage, false);
              window.opener.postMessage('authorizing:github', '*');
            })();
          </script>
        </body>
      </html>
    `;
    return new Response(errorHtml, {
      status: 500,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    });
  }
}
