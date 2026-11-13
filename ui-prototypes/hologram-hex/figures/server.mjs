// Figure proof: a card name in, a standing figure out.
// No dependencies. Serves the page, looks a card up on Scryfall, keeps the art
// and the browser-made cut-out in ./cache so each card is built once.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const CACHE = path.join(ROOT, 'cache');
const PORT = Number(process.env.PORT || 4517);
const UA = { 'User-Agent': 'figure-proof/0.1', Accept: 'application/json' };
const ID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };

await fs.mkdir(path.join(CACHE, 'art'), { recursive: true });
await fs.mkdir(path.join(CACHE, 'cut'), { recursive: true });
await fs.mkdir(path.join(CACHE, 'card'), { recursive: true });

const exists = (p) => fs.access(p).then(() => true, () => false);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function lookup(name) {
  const key = path.join(CACHE, 'card', slug(name) + '.json');
  if (await exists(key)) return JSON.parse(await fs.readFile(key, 'utf8'));
  const r = await fetch('https://api.scryfall.com/cards/named?fuzzy=' + encodeURIComponent(name), { headers: UA });
  if (!r.ok) throw Object.assign(new Error('No card found for "' + name + '"'), { status: 404 });
  const c = await r.json();
  const face = c.image_uris ? c : (c.card_faces || [])[0] || {};
  const artUrl = face.image_uris && face.image_uris.art_crop;
  if (!artUrl) throw Object.assign(new Error('That card has no art to use'), { status: 422 });
  const img = await fetch(artUrl, { headers: { 'User-Agent': UA['User-Agent'] } });
  if (!img.ok) throw Object.assign(new Error('The art could not be fetched'), { status: 502 });
  await fs.writeFile(path.join(CACHE, 'art', c.id + '.jpg'), Buffer.from(await img.arrayBuffer()));
  const card = {
    id: c.id,
    name: face.name || c.name,
    typeLine: face.type_line || c.type_line || '',
    power: face.power ?? c.power ?? null,
    toughness: face.toughness ?? c.toughness ?? null,
    keywords: c.keywords || [],
    colors: face.colors || c.colors || [],
    colorIdentity: c.color_identity || [],
    artist: face.artist || c.artist || '',
  };
  await fs.writeFile(key, JSON.stringify(card));
  return card;
}

async function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function serveFile(res, base, rel) {
  const full = path.normalize(path.join(base, rel));
  if (!full.startsWith(base + path.sep)) return send(res, 403, { error: 'no' });
  if (!(await exists(full))) return send(res, 404, { error: 'not found' });
  return send(res, 200, await fs.readFile(full), TYPES[path.extname(full)] || 'application/octet-stream');
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/card') {
      const name = (url.searchParams.get('name') || '').trim();
      if (!name) return send(res, 400, { error: 'Give a card name' });
      const t0 = Date.now();
      const card = await lookup(name);
      const cut = await exists(path.join(CACHE, 'cut', card.id + '.png'));
      return send(res, 200, { ...card, art: '/cache/art/' + card.id + '.jpg', cutout: cut ? '/cache/cut/' + card.id + '.png' : null, lookupMs: Date.now() - t0 });
    }
    if (url.pathname === '/api/cutout' && req.method === 'POST') {
      const id = url.searchParams.get('id') || '';
      if (!ID.test(id)) return send(res, 400, { error: 'bad id' });
      const chunks = [];
      let size = 0;
      for await (const ch of req) { size += ch.length; if (size > 8e6) return send(res, 413, { error: 'too large' }); chunks.push(ch); }
      await fs.writeFile(path.join(CACHE, 'cut', id + '.png'), Buffer.concat(chunks));
      return send(res, 200, { ok: true });
    }
    if (url.pathname.startsWith('/cache/')) return serveFile(res, CACHE, url.pathname.slice(7));
    return serveFile(res, PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  } catch (e) {
    return send(res, e.status || 500, { error: e.message });
  }
}).listen(PORT, () => console.log('figure proof on http://localhost:' + PORT));
