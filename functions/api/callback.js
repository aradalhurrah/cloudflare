export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 1. Get Code from Query Params
  const code = url.searchParams.get('code');
  
  if (!code) {
    return new Response('Missing "code" query parameter', { status: 400 });
  }

  // 2. Get Environment Variables
  const client_id = env.GITHUB_CLIENT_ID;
  const client_secret = env.GITHUB_CLIENT_SECRET;
  
  if (!client_id || !client_secret) {
    return new Response('GitHub credentials not configured', { status: 500 });
  }

  try {
    // 3. Exchange Code for Access Token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Cloudflare-Pages-Auth',
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
       return new Response(JSON.stringify(tokenData), { 
         status: 400, 
         headers: { 'Content-Type': 'application/json' }
       });
    }
    
    // 4. Return Token to Decap CMS
    // Decap CMS expects: { "token": "ACCESS_TOKEN" }
    // Some setups might need postMessage, but per requirements we return JSON.
    const responseBody = JSON.stringify({ token: tokenData.access_token });

    return new Response(responseBody, {
      headers: {
        'Content-Type': 'application/json',
        // 'Access-Control-Allow-Origin': '*' // Add if cross-origin issues arise
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

