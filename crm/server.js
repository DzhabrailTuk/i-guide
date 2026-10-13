// I-Guide CRM — своя система для ведения клиентов.
// Без сторонних пакетов: встроенный HTTP-сервер Node и встроенная база SQLite (node:sqlite, Node 22.5+).
// Запуск: node crm/server.js  →  панель на http://localhost:4400 (порт — в crm/config.json)
// Сайт отправляет заявки на POST /api/lead; компании можно добавлять и вручную.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DIR = __dirname;
const CONFIG_FILE = path.join(DIR, 'config.json');
if (!fs.existsSync(CONFIG_FILE)) {
  console.error('Нет crm/config.json. Скопируйте config.example.json в config.json и задайте пароль: node crm/set-password.js');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const PORT = Number(process.env.PORT || config.port || 4400);

// ---------- база ----------
fs.mkdirSync(path.join(DIR, 'data'), { recursive: true });
const db = new DatabaseSync(path.join(DIR, 'data', 'crm.db'));
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  telegram TEXT DEFAULT '',
  website TEXT DEFAULT '',
  city TEXT DEFAULT '',
  service TEXT DEFAULT '',
  source TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  next_action TEXT DEFAULT '',
  next_action_at TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_company ON events(company_id);
`);

const STATUSES = [
  ['new', 'Новая заявка'],
  ['contact', 'Связались'],
  ['offer', 'Отправлено предложение'],
  ['work', 'В работе'],
  ['client', 'Клиент'],
  ['lost', 'Отказ'],
];
const statusName = s => (STATUSES.find(x => x[0] === s) || [s, s])[1];
const now = () => new Date().toISOString();
const FIELDS = ['name', 'contact_person', 'phone', 'email', 'telegram', 'website', 'city', 'service', 'source', 'next_action', 'next_action_at'];

function addEvent(id, type, text) {
  db.prepare('INSERT INTO events (company_id, type, text, created_at) VALUES (?, ?, ?, ?)').run(id, type, String(text).slice(0, 5000), now());
}
function createCompany(data, eventType, eventText) {
  const t = now();
  const v = Object.fromEntries(FIELDS.map(f => [f, String(data[f] || '').trim().slice(0, 500)]));
  if (!v.name) v.name = v.contact_person || v.website || 'Без названия';
  const r = db.prepare(`INSERT INTO companies (${FIELDS.join(',')}, status, created_at, updated_at) VALUES (${FIELDS.map(() => '?').join(',')}, ?, ?, ?)`)
    .run(...FIELDS.map(f => v[f]), STATUSES.some(s => s[0] === data.status) ? data.status : 'new', t, t);
  const id = Number(r.lastInsertRowid);
  addEvent(id, eventType, eventText);
  return id;
}

// ---------- вход ----------
const sessions = new Map(); // токен → срок действия
const SESSION_MS = 1000 * 60 * 60 * 24 * 14;
function checkPassword(p) {
  if (!config.passwordHash || !config.passwordSalt) return false;
  const h = crypto.scryptSync(String(p), Buffer.from(config.passwordSalt, 'hex'), 64);
  const want = Buffer.from(config.passwordHash, 'hex');
  return want.length === h.length && crypto.timingSafeEqual(h, want);
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}
function authed(req) {
  const t = cookies(req).crm;
  const exp = t && sessions.get(t);
  if (!exp || exp < Date.now()) { if (t) sessions.delete(t); return false; }
  return true;
}
// попытки входа: не больше 10 за 15 минут с одного адреса
const loginTries = new Map();
function tooManyLogins(ip) {
  const list = (loginTries.get(ip) || []).filter(t => t > Date.now() - 15 * 60 * 1000);
  loginTries.set(ip, list);
  return list.length >= 10;
}

// ---------- заявки с сайта: защита от спама ----------
const leadHits = new Map();
function tooManyLeads(ip) {
  const list = (leadHits.get(ip) || []).filter(t => t > Date.now() - 10 * 60 * 1000);
  list.push(Date.now());
  leadHits.set(ip, list);
  return list.length > 10;
}
const allowedOrigins = new Set(config.allowedOrigins || []);
function corsHeaders(req) {
  const o = req.headers.origin;
  return o && allowedOrigins.has(o) ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } : {};
}

// уведомление о новой заявке в Telegram (если задан бот в config.json)
async function notifyTelegram(text) {
  const t = config.telegram || {};
  if (!t.botToken || !t.chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${t.botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: t.chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) { console.error('Telegram:', e.message); }
}

// разбираем поле «телефон или мессенджер»
function splitContact(c) {
  c = String(c || '').trim();
  if (/^@\w{3,}$/.test(c) || /t\.me\//i.test(c)) return { telegram: c };
  if (/@/.test(c) && /\./.test(c)) return { email: c };
  return { phone: c };
}

// ---------- HTML ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const CSS = `
:root{--bg:#f4f2ef;--card:#fff;--line:#e4dfd8;--text:#1b1716;--muted:#6b625d;--accent:#821f30;--soft:#f6eaec}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}header{background:#fff;border-bottom:1px solid var(--line)}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}.top{display:flex;align-items:center;gap:18px;min-height:60px;flex-wrap:wrap}
.logo{font-weight:800;font-size:19px;color:var(--text);text-decoration:none}.logo span{color:var(--accent)}
.top nav{display:flex;gap:16px;flex:1}.top nav a{text-decoration:none;color:var(--text);font-weight:600}
main{padding:24px 0 60px}h1{font-size:24px;margin:0 0 16px}h2{font-size:18px;margin:0 0 12px}
.btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 16px;border-radius:10px;border:0;background:var(--accent);color:#fff;font:600 14px/1 inherit;text-decoration:none;cursor:pointer}
.btn.ghost{background:#fff;color:var(--text);border:1px solid var(--line)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px}
.stat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;color:var(--text)}
.stat b{display:block;font-size:22px}.stat span{font-size:13px;color:var(--muted)}.stat.on{border-color:var(--accent);background:var(--soft)}
.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
input,select,textarea{font:inherit;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--text);width:100%}
.bar input{width:auto;flex:1 1 260px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top;font-size:14px}th{font-size:12px;color:var(--muted);font-weight:600;background:#faf8f6}
tr:last-child td{border-bottom:0}td a{font-weight:600;text-decoration:none}
.tag{display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600;background:#eee;color:#333;white-space:nowrap}
.st-new{background:#fde8ec;color:#821f30}.st-contact{background:#fff1d6;color:#7a4b00}.st-offer{background:#e6f0ff;color:#1d4e9e}
.st-work{background:#e5f6ee;color:#11603d}.st-client{background:#d9f2e3;color:#0b4d2c}.st-lost{background:#eee;color:#555}
.grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:18px}@media(max-width:860px){.grid{grid-template-columns:1fr}}
.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}@media(max-width:560px){.fields{grid-template-columns:1fr}}
label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted);font-weight:600}
.full{grid-column:1/-1}.actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.ev{border-left:2px solid var(--line);padding:2px 0 12px 14px;margin-left:4px}.ev small{color:var(--muted);display:block}.ev p{margin:2px 0 0;white-space:pre-wrap}
.ev.lead{border-color:var(--accent)}.ev.status{border-color:#1d4e9e}.muted{color:var(--muted)}.over{color:#b00020;font-weight:700}
.tablewrap{overflow-x:auto}.login{max-width:360px;margin:12vh auto}.err{color:#b00020;font-size:14px}
`;
function page(title, body, opts = {}) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(title)} — I-Guide CRM</title><style>${CSS}</style></head><body>
${opts.bare ? '' : `<header><div class="wrap top"><a class="logo" href="/">i<span>-</span>guide CRM</a><nav><a href="/">Компании</a><a href="/new">Добавить</a><a href="/export.csv">Выгрузить CSV</a></nav><form method="post" action="/logout"><button class="btn ghost" type="submit">Выйти</button></form></div></header>`}
<main><div class="wrap">${body}</div></main></body></html>`;
}

function listPage(q) {
  const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM companies GROUP BY status').all().map(r => [r.status, r.n]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const st = STATUSES.some(s => s[0] === q.status) ? q.status : '';
  const search = String(q.q || '').trim();
  const where = [], args = [];
  if (st) { where.push('status = ?'); args.push(st); }
  if (search) { where.push("(name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR email LIKE ? OR telegram LIKE ? OR website LIKE ? OR city LIKE ?)"); for (let i = 0; i < 7; i++) args.push('%' + search + '%'); }
  const rows = db.prepare(`SELECT * FROM companies ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY CASE status WHEN 'new' THEN 0 ELSE 1 END, COALESCE(NULLIF(next_action_at,''), '9999'), updated_at DESC LIMIT 500`).all(...args);
  const today = new Date().toISOString().slice(0, 10);
  const stat = (k, name, n) => `<a class="stat${st === k ? ' on' : ''}" href="/?status=${k}${search ? '&q=' + encodeURIComponent(search) : ''}"><b>${n || 0}</b><span>${name}</span></a>`;
  return page('Компании', `
<h1>Компании</h1>
<div class="stats">${stat('', 'Все', total)}${STATUSES.map(([k, n]) => stat(k, n, counts[k])).join('')}</div>
<form class="bar" method="get" action="/">${st ? `<input type="hidden" name="status" value="${st}">` : ''}<input name="q" value="${esc(search)}" placeholder="Поиск: компания, контакт, телефон, сайт, город" aria-label="Поиск"><button class="btn ghost" type="submit">Найти</button><a class="btn" href="/new">+ Добавить компанию</a></form>
${rows.length ? `<div class="tablewrap"><table><thead><tr><th>Компания</th><th>Контакт</th><th>Услуга / источник</th><th>Статус</th><th>Следующий шаг</th><th>Создана</th></tr></thead><tbody>
${rows.map(r => `<tr><td><a href="/c/${r.id}">${esc(r.name)}</a>${r.city ? `<div class="muted">${esc(r.city)}</div>` : ''}</td>
<td>${esc(r.contact_person)}<div class="muted">${esc(r.phone || r.telegram || r.email)}</div></td>
<td>${esc(r.service)}<div class="muted">${esc(r.source)}</div></td>
<td><span class="tag st-${r.status}">${statusName(r.status)}</span></td>
<td>${r.next_action_at ? `<span class="${r.next_action_at.slice(0, 10) < today && !['client', 'lost'].includes(r.status) ? 'over' : ''}">${esc(r.next_action_at.replace('T', ' '))}</span>` : ''}<div class="muted">${esc(r.next_action)}</div></td>
<td class="muted">${fmt(r.created_at)}</td></tr>`).join('')}
</tbody></table></div>` : `<div class="card">${total ? 'Ничего не найдено.' : 'Пока нет ни одной компании. Заявки с сайта появятся здесь автоматически, а компании можно добавить вручную.'}</div>`}`);
}

function fieldsHtml(c = {}) {
  const f = (k, label, type = 'text', cls = '') => `<label class="${cls}">${label}<input name="${k}" type="${type}" value="${esc(c[k] || '')}"></label>`;
  return `<div class="fields">
${f('name', 'Компания', 'text', 'full')}
${f('contact_person', 'Контактное лицо')}${f('phone', 'Телефон', 'tel')}
${f('telegram', 'Telegram')}${f('email', 'E-mail', 'email')}
${f('website', 'Сайт')}${f('city', 'Город')}
${f('service', 'Интересующая услуга')}${f('source', 'Источник')}
<label>Статус<select name="status">${STATUSES.map(([k, n]) => `<option value="${k}"${(c.status || 'new') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
${f('next_action_at', 'Следующий шаг — когда', 'datetime-local')}
${f('next_action', 'Следующий шаг — что сделать', 'text', 'full')}
</div>`;
}

function companyPage(id) {
  const c = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  if (!c) return null;
  const evs = db.prepare('SELECT * FROM events WHERE company_id = ? ORDER BY id DESC').all(id);
  const typeName = { lead: 'Заявка с сайта', note: 'Заметка', status: 'Статус', created: 'Создана вручную', edit: 'Изменения' };
  return page(c.name, `
<p><a href="/">← Все компании</a></p>
<h1>${esc(c.name)} <span class="tag st-${c.status}">${statusName(c.status)}</span></h1>
<div class="grid">
  <form class="card" method="post" action="/c/${c.id}"><h2>Данные компании</h2>${fieldsHtml(c)}
    <div class="actions"><button class="btn" type="submit">Сохранить</button></div></form>
  <div>
    <form class="card" method="post" action="/c/${c.id}/note" style="margin-bottom:14px"><h2>Добавить заметку</h2>
      <textarea name="text" rows="3" required placeholder="Позвонил, договорились о встрече в четверг"></textarea>
      <div class="actions"><button class="btn" type="submit">Добавить</button></div></form>
    <div class="card"><h2>История</h2>${evs.map(e => `<div class="ev ${e.type}"><small>${fmt(e.created_at)} · ${typeName[e.type] || e.type}</small><p>${esc(e.text)}</p></div>`).join('') || '<p class="muted">Пока пусто.</p>'}</div>
    <form method="post" action="/c/${c.id}/delete" style="margin-top:14px" onsubmit="return confirm('Удалить компанию и всю её историю? Это нельзя отменить.')"><button class="btn ghost" type="submit">Удалить компанию</button></form>
  </div>
</div>`);
}

// ---------- запросы ----------
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const type = req.headers['content-type'] || '';
      try { resolve(type.includes('application/json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw))); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
const send = (res, code, body, headers = {}) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...headers }); res.end(body); };
const json = (res, code, obj, headers = {}) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
const redirect = (res, to, headers = {}) => send(res, 303, '', { Location: to, ...headers });
const ipOf = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
// формы панели принимаем только со своего адреса (защита от подделки запросов с чужих сайтов)
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  // заявка с сайта
  if (p === '/api/lead') {
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return send(res, 204, '', cors);
    if (req.method !== 'POST') return json(res, 405, { ok: false }, cors);
    if (req.headers.origin && !cors['Access-Control-Allow-Origin']) return json(res, 403, { ok: false, error: 'origin' });
    if (tooManyLeads(ipOf(req))) return json(res, 429, { ok: false, error: 'Слишком много заявок, попробуйте позже' }, cors);
    let d; try { d = await readBody(req, 16 * 1024); } catch { return json(res, 400, { ok: false }, cors); }
    if (d.company_website) return json(res, 200, { ok: true }, cors); // ловушка для ботов: людям это поле не видно
    if (!String(d.name || '').trim() || !String(d.contact || '').trim()) return json(res, 400, { ok: false, error: 'Укажите имя и контакт' }, cors);
    if (!(d.consent === true || d.consent === 'on' || d.consent === 'true')) return json(res, 400, { ok: false, error: 'Нужно согласие на обработку персональных данных' }, cors);
    const utm = d.utm && typeof d.utm === 'object' ? Object.entries(d.utm).map(([k, v]) => `${k}=${v}`).join(', ') : '';
    const source = [d.source || '', utm].filter(Boolean).join(' · ').slice(0, 500);
    let host = '';
    try { host = d.site ? new URL(/^https?:/.test(d.site) ? d.site : 'https://' + d.site).hostname : ''; } catch {}
    const text = [`Имя: ${d.name}`, `Контакт: ${d.contact}`, d.site ? `Сайт: ${d.site}` : '', d.service ? `Услуга: ${d.service}` : '', d.task ? `Задача: ${d.task}` : '', d.page ? `Страница: ${d.page}` : '', source ? `Источник: ${source}` : '', 'Согласие на обработку ПДн: дано'].filter(Boolean).join('\n');
    // та же компания уже есть (совпал сайт, телефон, Telegram или e-mail) — пишем заявку в её карточку, а не создаём дубль
    const ct = splitContact(d.contact);
    const key = ct.phone ? ['phone', ct.phone] : ct.telegram ? ['telegram', ct.telegram] : ['email', ct.email];
    const found = db.prepare(`SELECT id FROM companies WHERE (? <> '' AND website LIKE ?) OR (${key[0]} <> '' AND ${key[0]} = ?) LIMIT 1`).get(host, '%' + host + '%', key[1]);
    let id;
    if (found) {
      id = found.id;
      addEvent(id, 'lead', 'Повторная заявка с сайта\n' + text);
      db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now(), id);
    } else {
      id = createCompany({ name: host || `Заявка: ${d.name}`, contact_person: d.name, website: d.site || '', service: d.service || '', source, ...ct }, 'lead', text);
    }
    notifyTelegram(`${found ? 'Повторная заявка' : 'Новая заявка'} с сайта I-Guide\n\n${text}\n\nКарточка в CRM: №${id}`);
    return json(res, 200, { ok: true }, cors);
  }

  // вход
  if (p === '/login') {
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(res, 403, 'Forbidden');
      const ip = ipOf(req);
      if (tooManyLogins(ip)) return send(res, 429, page('Вход', '<div class="card login">Слишком много попыток. Подождите 15 минут.</div>', { bare: true }));
      const d = await readBody(req).catch(() => ({}));
      if (checkPassword(d.password || '')) {
        const t = crypto.randomBytes(32).toString('hex');
        sessions.set(t, Date.now() + SESSION_MS);
        return redirect(res, '/', { 'Set-Cookie': `crm=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${config.secureCookie ? '; Secure' : ''}` });
      }
      loginTries.get(ip).push(Date.now());
      return send(res, 401, loginPage('Неверный пароль'));
    }
    return send(res, 200, loginPage());
  }
  if (p === '/logout' && req.method === 'POST') {
    sessions.delete(cookies(req).crm);
    return redirect(res, '/login', { 'Set-Cookie': 'crm=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  // дальше — только после входа
  if (!authed(req)) return redirect(res, '/login');
  if (req.method === 'POST' && !sameOrigin(req)) return send(res, 403, 'Forbidden');

  if (p === '/' && req.method === 'GET') return send(res, 200, listPage(Object.fromEntries(url.searchParams)));
  if (p === '/new' && req.method === 'GET') return send(res, 200, page('Новая компания', `<p><a href="/">← Все компании</a></p><h1>Новая компания</h1><form class="card" method="post" action="/new" style="max-width:760px">${fieldsHtml()}<label class="full" style="margin-top:10px">Заметка<textarea name="note" rows="3"></textarea></label><div class="actions"><button class="btn" type="submit">Добавить</button></div></form>`));
  if (p === '/new' && req.method === 'POST') {
    const d = await readBody(req);
    const id = createCompany(d, 'created', d.note ? `Добавлена вручную.\n${d.note}` : 'Добавлена вручную.');
    return redirect(res, '/c/' + id);
  }
  if (p === '/export.csv' && req.method === 'GET') {
    const rows = db.prepare('SELECT * FROM companies ORDER BY id').all();
    const cols = ['id', ...FIELDS, 'status', 'created_at', 'updated_at'];
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [cols.join(';'), ...rows.map(r => cols.map(k => cell(k === 'status' ? statusName(r.status) : r[k])).join(';'))].join('\r\n');
    return send(res, 200, csv, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="iguide-crm-${new Date().toISOString().slice(0, 10)}.csv"` });
  }
  const m = p.match(/^\/c\/(\d+)(\/note|\/delete)?$/);
  if (m) {
    const id = Number(m[1]);
    const c = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    if (!c) return send(res, 404, page('Не найдено', '<div class="card">Компания не найдена. <a href="/">К списку</a></div>'));
    if (!m[2] && req.method === 'GET') return send(res, 200, companyPage(id));
    if (!m[2] && req.method === 'POST') {
      const d = await readBody(req);
      const v = Object.fromEntries(FIELDS.map(f => [f, String(d[f] ?? '').trim().slice(0, 500)]));
      if (!v.name) v.name = c.name;
      const status = STATUSES.some(s => s[0] === d.status) ? d.status : c.status;
      const changed = FIELDS.filter(f => (c[f] || '') !== v[f]);
      db.prepare(`UPDATE companies SET ${FIELDS.map(f => f + ' = ?').join(', ')}, status = ?, updated_at = ? WHERE id = ?`).run(...FIELDS.map(f => v[f]), status, now(), id);
      if (status !== c.status) addEvent(id, 'status', `${statusName(c.status)} → ${statusName(status)}`);
      if (changed.length) addEvent(id, 'edit', 'Изменено: ' + changed.join(', '));
      return redirect(res, '/c/' + id);
    }
    if (m[2] === '/note' && req.method === 'POST') {
      const d = await readBody(req);
      if (String(d.text || '').trim()) { addEvent(id, 'note', d.text.trim()); db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now(), id); }
      return redirect(res, '/c/' + id);
    }
    if (m[2] === '/delete' && req.method === 'POST') {
      db.prepare('DELETE FROM events WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM companies WHERE id = ?').run(id);
      return redirect(res, '/');
    }
  }
  return send(res, 404, page('Не найдено', '<div class="card">Страница не найдена. <a href="/">К списку</a></div>'));
}
function loginPage(err = '') {
  return page('Вход', `<form class="card login" method="post" action="/login"><h1>I-Guide CRM</h1><label>Пароль<input name="password" type="password" autocomplete="current-password" required autofocus></label>${err ? `<p class="err">${err}</p>` : ''}<div class="actions"><button class="btn" type="submit">Войти</button></div></form>`, { bare: true });
}

http.createServer((req, res) => handle(req, res).catch(e => { console.error(e); send(res, 500, 'Ошибка сервера'); }))
  .listen(PORT, config.host || '127.0.0.1', () => console.log(`I-Guide CRM: http://localhost:${PORT}`));
