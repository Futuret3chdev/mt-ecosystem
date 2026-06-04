export default async function handler(req, res) {
  // Proxy for mt-auth to allow HTTPS browser -> Vercel function -> HTTP VPS (avoids mixed content on live site)
  // Real data stays in mt-auth's per-user secure storage (encrypted wallets, user isolation by token/userId)
  // Target can be overridden by setting AUTH_TARGET_URL env in Vercel (e.g. https://auth.futuret3ch.com.au or http://IP:4002 for direct)
  const authBase = process.env.AUTH_TARGET_URL || 'https://auth.futuret3ch.com.au';
  let targetPath = req.url.replace(/^\/api\/auth/, '');
  if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
  const targetUrl = authBase + targetPath;

  const headers = new Headers();
  // Forward important headers
  for (const [key, value] of Object.entries(req.headers)) {
    if (['host', 'connection', 'content-length'].includes(key.toLowerCase())) continue;
    headers.set(key, value);
  }
  headers.set('host', new URL(authBase).host);

  const fetchOptions = {
    method: req.method,
    headers,
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    const body = await req.text();
    if (body) fetchOptions.body = body;
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    res.status(response.status);

    // Copy safe headers
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lower)) {
        res.setHeader(key, value);
      }
    });

    res.send(data);
  } catch (e) {
    console.error('Auth proxy error:', e);
    res.status(502).json({ error: 'Auth proxy failed: ' + e.message });
  }
}