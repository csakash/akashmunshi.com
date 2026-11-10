// akashmunshi.com Worker.
// - Sends http to https and www to the bare domain (production hostnames only).
// - POST /api/ari-42/request stores an ARI-42 request (full list or a review) in D1.
// - GET /ari-42/admin lists requests, behind HTTP Basic auth (secret ADMIN_PASSWORD).
// - Everything else is a static file from public/.

const PROD_HOSTS = new Set(['akashmunshi.com', 'www.akashmunshi.com']);
const MAX_PER_HOUR = 5;          // requests per IP per hour
const MAX_TOOLS = 40;
const LIMITS = { name: 120, email: 200, company: 160, website: 300, product: 2000, timeline: 80, notes: 3000, tool: 120, usage: 400 };
const ACCESS = new Set(['docs', 'repo-read', 'staging', 'call']);
const CATEGORIES = new Set(['framework', 'sdk', 'harness', 'mcp', 'memory', 'sandbox', 'gateway', 'lowcode', 'skills', 'model', 'other']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (PROD_HOSTS.has(url.hostname) && (url.protocol === 'http:' || url.hostname === 'www.akashmunshi.com')) {
      url.protocol = 'https:';
      url.hostname = 'akashmunshi.com';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/api/ari-42/request') {
      if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405, { Allow: 'POST' });
      return handleRequest(request, env, url);
    }

    if (url.pathname === '/ari-42/admin') return handleAdmin(request, env, url);

    return env.ASSETS.fetch(request);
  },
};

/* ---------- public intake ---------- */

async function handleRequest(request, env, url) {
  // same-origin form posts only
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== url.host) return json({ error: 'Cross-site requests are not accepted.' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'Send JSON.' }, 415);
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 32_000) return json({ error: 'That request is too large.' }, 413);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'That was not valid JSON.' }, 400); }

  // honeypot: real people never fill the hidden "website2" field
  if (body.website2) return json({ ok: true, id: 'ari-' + rand(6) }, 200);

  const kind = body.kind === 'review' ? 'review' : body.kind === 'list' ? 'list' : null;
  if (!kind) return json({ error: 'Choose the full list or a review.' }, 400);

  const s = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const rec = {
    name: s(body.name, LIMITS.name),
    email: s(body.email, LIMITS.email).toLowerCase(),
    company: s(body.company, LIMITS.company),
    website: s(body.website, LIMITS.website),
    product: s(body.product, LIMITS.product),
    timeline: s(body.timeline, LIMITS.timeline),
    notes: s(body.notes, LIMITS.notes),
  };
  if (!rec.name) return json({ error: 'Add your name.', field: 'name' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rec.email)) return json({ error: 'Add a valid work email.', field: 'email' }, 400);

  const tools = (Array.isArray(body.tools) ? body.tools : [])
    .slice(0, MAX_TOOLS)
    .map(t => ({
      name: s(t && t.name, LIMITS.tool),
      category: CATEGORIES.has(t && t.category) ? t.category : 'other',
      usage: s(t && t.usage, LIMITS.usage),
    }))
    .filter(t => t.name);
  const access = (Array.isArray(body.access) ? body.access : []).filter(a => ACCESS.has(a));

  if (kind === 'review') {
    if (!rec.company) return json({ error: 'Add your company.', field: 'company' }, 400);
    if (!tools.length) return json({ error: 'List at least one tool your agents run on.', field: 'tools' }, 400);
  }

  // refuse anything that looks like a pasted secret: the form says not to, this makes sure
  const blob = JSON.stringify({ rec, tools });
  if (looksLikeSecret(blob)) return json({ error: 'That looks like a password or API key. Please remove it: I will set up access with you separately and safely.', field: 'secret' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = ip ? await sha256(ip + ':ari42') : '';
  const since = new Date(Date.now() - 3600_000).toISOString();
  if (ipHash) {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM ari42_requests WHERE ip_hash = ? AND created_at > ?').bind(ipHash, since).first();
    if (row && row.n >= MAX_PER_HOUR) return json({ error: 'Too many requests from this network. Please try again in an hour, or email me.' }, 429);
  }

  const id = 'ari-' + rand(6);
  await env.DB.prepare(
    `INSERT INTO ari42_requests (id, created_at, kind, name, email, company, website, product, tools, access, timeline, notes, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, new Date().toISOString(), kind, rec.name, rec.email, rec.company, rec.website, rec.product,
    JSON.stringify(tools), JSON.stringify(access), rec.timeline, rec.notes, ipHash,
    (request.headers.get('User-Agent') || '').slice(0, 300)
  ).run();

  return json({ ok: true, id }, 201);
}

function looksLikeSecret(s) {
  return /(sk-[A-Za-z0-9_-]{16,}|sk_live_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bpassword\s*[:=]\s*\S{4,})/i.test(s);
}

/* ---------- admin ---------- */

async function handleAdmin(request, env, url) {
  if (!env.ADMIN_PASSWORD) return new Response('Admin is not configured.', { status: 503 });
  const auth = request.headers.get('Authorization') || '';
  const [scheme, encoded] = auth.split(' ');
  let ok = false;
  if (scheme === 'Basic' && encoded) {
    try {
      const [user, pass] = atob(encoded).split(':');
      ok = user === 'akash' && await safeEqual(pass || '', env.ADMIN_PASSWORD);
    } catch { ok = false; }
  }
  if (!ok) return new Response('Sign in to see ARI-42 requests.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="ARI-42 admin", charset="UTF-8"', 'Cache-Control': 'no-store' } });

  if (request.method === 'POST') {
    const form = await request.formData();
    const id = String(form.get('id') || ''), status = String(form.get('status') || '');
    if (/^ari-[a-z0-9]{6}$/.test(id) && ['new', 'replied', 'in-review', 'done', 'spam'].includes(status)) {
      await env.DB.prepare('UPDATE ari42_requests SET status = ? WHERE id = ?').bind(status, id).run();
    }
    return Response.redirect(url.origin + '/ari-42/admin', 303);
  }

  const { results } = await env.DB.prepare('SELECT * FROM ari42_requests ORDER BY created_at DESC LIMIT 200').all();
  const rows = results.map(r => {
    const tools = safeJson(r.tools).map(t => `<li><b>${esc(t.name)}</b> <span class="m">${esc(t.category)}</span>${t.usage ? ` - ${esc(t.usage)}` : ''}</li>`).join('');
    const access = safeJson(r.access).join(', ');
    const sel = ['new', 'replied', 'in-review', 'done', 'spam'].map(s => `<option${s === r.status ? ' selected' : ''}>${s}</option>`).join('');
    return `<article class="${esc(r.status)}">
      <header><span class="tag">${r.kind === 'review' ? 'Review' : 'Full list'}</span><b>${esc(r.name)}</b> &lt;<a href="mailto:${esc(r.email)}?subject=ARI-42%20${r.kind === 'review' ? 'review' : 'question%20list'}%20(${esc(r.id)})">${esc(r.email)}</a>&gt;
      <span class="m">${esc(r.company || '')}${r.website ? ` · <a href="${esc(r.website)}" rel="noopener noreferrer">${esc(r.website)}</a>` : ''}</span>
      <span class="sp"></span><span class="m">${esc(r.id)} · ${esc(r.created_at.slice(0, 16).replace('T', ' '))} UTC</span>
      <form method="post"><input type="hidden" name="id" value="${esc(r.id)}"><select name="status" onchange="this.form.submit()">${sel}</select></form></header>
      ${r.product ? `<p>${esc(r.product)}</p>` : ''}
      ${tools ? `<ul>${tools}</ul>` : ''}
      <p class="m">${access ? `Access offered: ${esc(access)}` : ''}${r.timeline ? ` · Timeline: ${esc(r.timeline)}` : ''}</p>
      ${r.notes ? `<p class="m">Notes: ${esc(r.notes)}</p>` : ''}
    </article>`;
  }).join('') || '<p class="m">No requests yet.</p>';

  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>ARI-42 requests</title><style>
body{background:#f4f3ee;color:#121211;font:15px/1.55 Inter,ui-sans-serif,system-ui,sans-serif;margin:0;padding:24px clamp(16px,4vw,48px)}
h1{font:500 26px/1.2 "Inter Tight",Inter,sans-serif;letter-spacing:-.02em;margin:0 0 18px}
article{border:1px solid rgba(18,18,17,.24);background:#fcfbf8;padding:14px 16px;margin-bottom:12px}
article.done,article.spam{opacity:.55}
header{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.sp{flex:1}.m{color:#6c6b66;font-size:13px}.tag{font:12px/1 ui-monospace,monospace;background:#121211;color:#f4f3ee;padding:4px 6px}
ul{margin:8px 0;padding-left:18px}a{color:inherit}form{margin:0}select{font:inherit;font-size:13px}
</style></head><body><h1>ARI-42 requests <span class="m">(${results.length})</span></h1>${rows}</body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

/* ---------- helpers ---------- */

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
}
function rand(n) {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(n));
  return [...b].map(x => a[x % a.length]).join('');
}
async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
function safeJson(s) { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
