export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const key = decodeURIComponent(url.pathname.slice(1));

    if (request.method === 'PUT') {
      if (!key) return new Response('Missing key', { status: 400, headers: cors });
      await env.BUCKET.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/octet-stream' },
      });
      return new Response('OK', { headers: cors });
    }

    if (request.method === 'DELETE') {
      if (!key) return new Response('Missing key', { status: 400, headers: cors });
      await env.BUCKET.delete(key);
      return new Response('OK', { headers: cors });
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (!key) {
        return new Response('textaudio worker', { headers: { ...cors, 'Content-Type': 'text/plain' } });
      }
      const range = request.headers.get('Range');
      const opts = range ? { range: parseRange(range) } : {};
      const obj = await env.BUCKET.get(key, opts);
      if (!obj) return new Response('Not Found', { status: 404, headers: cors });
      const headers = {
        ...cors,
        'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'Accept-Ranges': 'bytes',
      };
      if (obj.range) {
        const { offset, length } = obj.range;
        headers['Content-Range'] = `bytes ${offset}-${offset + length - 1}/${obj.size}`;
        return new Response(request.method === 'HEAD' ? null : obj.body, { status: 206, headers });
      }
      return new Response(request.method === 'HEAD' ? null : obj.body, { headers });
    }

    return new Response('Method Not Allowed', { status: 405, headers: cors });
  }
};

function parseRange(header) {
  const m = /^bytes=(\d+)-(\d*)$/.exec(header);
  if (!m) return undefined;
  const offset = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : undefined;
  return end !== undefined ? { offset, length: end - offset + 1 } : { offset };
}
