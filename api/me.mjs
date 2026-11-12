// /api/me — the logged-in user's own profile (Supabase Auth + RLS).
// GET  → the user's profile row (includes the `studio` jsonb with Studio music settings and picked lyrics).
// PUT  → saves the profile fields it knows about and the music settings into `studio`.
// The caller's Supabase access token is verified, then every read and write runs with that token,
// so the RLS policies on public.profiles (own row only) decide what is allowed.

const SB_URL = process.env.SUPABASE_URL || 'https://qebbuxixnqsqjuprfpyv.supabase.co';
// Publishable key (already shipped to the browser in index.html), not the service role key.
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Qv4cn8rMnLdciXrOR6EjVg_AmG8vMIV';

const PROFILE_COLS = ['slug', 'name', 'bio', 'country', 'city', 'avatar', 'banner', 'theme', 'gaming', 'channels', 'reactions'];
const STUDIO_KEYS = ['musicLikes', 'lyricsFix', 'song', 'music', 'musicAuto', 'lyrics', 'lyricsAuto', 'musicTitle', 'musicSub'];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch { return null; } }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return JSON.parse(raw || '{}'); } catch { return null; }
}

async function sbFetch(path, token, init = {}) {
  return fetch(`${SB_URL}${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return send(res, 401, { error: 'Please log in.' });

  // Who is calling? Supabase tells us from the access token.
  const who = await sbFetch('/auth/v1/user', token);
  if (!who.ok) return send(res, 401, { error: 'Your login has expired. Please log in again.' });
  const user = await who.json();
  const uid = user?.id;
  if (!uid) return send(res, 401, { error: 'Please log in.' });

  if (req.method === 'GET') {
    const r = await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=*`, token);
    const rows = r.ok ? await r.json() : [];
    if (!rows[0]) return send(res, 404, { error: 'No profile yet.' });
    return send(res, 200, rows[0]);
  }

  if (req.method === 'PUT') {
    const body = await readBody(req);
    if (!body) return send(res, 400, { error: 'Bad request body.' });

    const patch = {};
    for (const k of PROFILE_COLS) if (k in body) patch[k] = body[k];

    const studioIn = {};
    for (const k of STUDIO_KEYS) if (k in body) studioIn[k] = body[k];
    if (Object.keys(studioIn).length) {
      // Merge with what is already stored so keys this request leaves out are kept.
      const cur = await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=studio`, token);
      const curRows = cur.ok ? await cur.json() : [];
      const prev = (curRows[0] && curRows[0].studio) || {};
      patch.studio = { ...prev, ...studioIn };
    }

    if (!Object.keys(patch).length) return send(res, 200, { ok: true, saved: [] });

    const r = await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}`, token, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const detail = await r.text();
      return send(res, r.status === 404 ? 404 : 400, { error: 'Could not save.', detail: detail.slice(0, 300) });
    }
    const rows = await r.json();
    if (!rows.length) return send(res, 404, { error: 'No profile yet. Create your profile first.' });
    return send(res, 200, { ok: true, saved: Object.keys(patch) });
  }

  res.setHeader('Allow', 'GET, PUT');
  return send(res, 405, { error: 'Method not allowed.' });
}
