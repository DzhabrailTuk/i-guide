// I-Guide CRM — своя система для ведения клиентов.
// Без сторонних пакетов: встроенный HTTP-сервер Node и встроенная база SQLite (node:sqlite, Node 22.5+).
// Запуск: node crm/server.js  →  панель на http://localhost:4400 (порт — в crm/config.json)
// Сайт отправляет заявки на POST /api/lead; заявки и компании можно вносить и вручную.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DIR = __dirname;
const CONFIG_FILE = process.env.CRM_CONFIG || path.join(DIR, 'config.json');
if (!fs.existsSync(CONFIG_FILE)) {
  console.error('Нет crm/config.json. Скопируйте config.example.json в config.json и задайте пароль: node crm/set-password.js');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const PORT = Number(process.env.PORT || config.port || 4400);
const DATA = process.env.CRM_DATA || path.join(DIR, 'data');

// ---------- справочники ----------
const STATUSES = [
  ['new', 'Новая заявка'],
  ['contact', 'Связались'],
  ['offer', 'Отправлено предложение'],
  ['work', 'В работе'],
  ['client', 'Клиент'],
  ['lost', 'Отказ'],
];
// категории = разделы услуг на сайте; заявка с сайта приносит категорию сама
const CATEGORIES = config.categories || ['SEO-продвижение', 'GEO: карты и нейросети', 'Реклама в Яндексе', 'Продажи и заявки', 'Создание сайтов', 'SERM — репутация', 'Аудит сайта', 'Другое'];
const CHANNELS = [
  ['site', 'Заявка с сайта'],
  ['phone', 'Звонок'],
  ['telegram', 'Telegram'],
  ['whatsapp', 'WhatsApp'],
  ['email', 'E-mail'],
  ['visit', 'Личная встреча'],
  ['outbound', 'Наш обзвон / рассылка'],
  ['referral', 'Рекомендация'],
  ['other', 'Другое'],
];
const nameOf = (list, k) => (list.find(x => x[0] === k) || [k, k || '—'])[1];
const statusName = s => nameOf(STATUSES, s);
const channelName = c => nameOf(CHANNELS, c);

// ---------- база ----------
fs.mkdirSync(path.join(DATA, 'backups'), { recursive: true });
const DB_FILE = path.join(DATA, 'crm.db');
const db = new DatabaseSync(DB_FILE);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', telegram TEXT DEFAULT '',
  website TEXT DEFAULT '', city TEXT DEFAULT '', service TEXT DEFAULT '', source TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new', next_action TEXT DEFAULT '', next_action_at TEXT DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_company ON events(company_id);
-- журнал обращений: каждая заявка — отдельная запись, даже если компания уже есть
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'site',
  category TEXT DEFAULT '', service TEXT DEFAULT '', city TEXT DEFAULT '',
  contact_name TEXT DEFAULT '', contact TEXT DEFAULT '', website TEXT DEFAULT '',
  message TEXT DEFAULT '', page TEXT DEFAULT '', source TEXT DEFAULT '', utm TEXT DEFAULT '',
  consent INTEGER DEFAULT 0, consent_at TEXT DEFAULT '', consent_ip TEXT DEFAULT '', consent_text TEXT DEFAULT '',
  author TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at);
`);
// новые поля в старой базе
const companyCols = db.prepare('PRAGMA table_info(companies)').all().map(c => c.name);
if (!companyCols.includes('category')) db.exec("ALTER TABLE companies ADD COLUMN category TEXT DEFAULT ''");
// заявки, записанные до появления журнала, переносим в журнал (один раз)
for (const e of db.prepare("SELECT e.* FROM events e WHERE e.type = 'lead' AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.company_id = e.company_id)").all()) {
  db.prepare("INSERT INTO leads (company_id, created_at, channel, message, consent, consent_at) VALUES (?, ?, 'site', ?, 1, ?)").run(e.company_id, e.created_at, e.text, e.created_at);
}

// резервная копия базы при запуске и раз в сутки; хранятся 30 последних
function backup() {
  try {
    const f = path.join(DATA, 'backups', `crm-${new Date().toISOString().slice(0, 10)}.db`);
    if (!fs.existsSync(f)) db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
    const all = fs.readdirSync(path.join(DATA, 'backups')).filter(n => n.endsWith('.db')).sort();
    all.slice(0, Math.max(0, all.length - 30)).forEach(n => fs.unlinkSync(path.join(DATA, 'backups', n)));
  } catch (e) { console.error('Резервная копия:', e.message); }
}
backup();
setInterval(backup, 6 * 60 * 60 * 1000).unref();

const now = () => new Date().toISOString();
const FIELDS = ['name', 'contact_person', 'phone', 'email', 'telegram', 'website', 'city', 'category', 'service', 'source', 'next_action', 'next_action_at'];
const clip = (v, n = 500) => String(v ?? '').trim().slice(0, n);

function addEvent(id, type, text) {
  db.prepare('INSERT INTO events (company_id, type, text, created_at) VALUES (?, ?, ?, ?)').run(id, type, clip(text, 5000), now());
}
function createCompany(data) {
  const t = now();
  const v = Object.fromEntries(FIELDS.map(f => [f, clip(data[f])]));
  if (!v.name) v.name = v.contact_person || v.website || 'Без названия';
  const r = db.prepare(`INSERT INTO companies (${FIELDS.join(',')}, status, created_at, updated_at) VALUES (${FIELDS.map(() => '?').join(',')}, ?, ?, ?)`)
    .run(...FIELDS.map(f => v[f]), STATUSES.some(s => s[0] === data.status) ? data.status : 'new', t, t);
  return Number(r.lastInsertRowid);
}
function addLead(companyId, l) {
  const r = db.prepare(`INSERT INTO leads (company_id, created_at, channel, category, service, city, contact_name, contact, website, message, page, source, utm, consent, consent_at, consent_ip, consent_text, author)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    companyId, l.created_at || now(), CHANNELS.some(c => c[0] === l.channel) ? l.channel : 'other',
    clip(l.category), clip(l.service), clip(l.city), clip(l.contact_name), clip(l.contact), clip(l.website),
    clip(l.message, 5000), clip(l.page), clip(l.source), clip(l.utm), l.consent ? 1 : 0, l.consent_at || '', clip(l.consent_ip), clip(l.consent_text, 1000), clip(l.author));
  db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now(), companyId);
  return Number(r.lastInsertRowid);
}
// поиск уже существующей компании по сайту или контакту — чтобы не плодить дубли
function findCompany(host, ct) {
  const key = ct.phone ? ['phone', ct.phone] : ct.telegram ? ['telegram', ct.telegram] : ct.email ? ['email', ct.email] : null;
  return db.prepare(`SELECT id FROM companies WHERE (? <> '' AND website LIKE ?)${key ? ` OR (${key[0]} <> '' AND ${key[0]} = ?)` : ''} LIMIT 1`)
    .get(...[host, '%' + host + '%', ...(key ? [key[1]] : [])]);
}
function hostOf(site) {
  try { return site ? new URL(/^https?:/.test(site) ? site : 'https://' + site).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}
// разбираем поле «телефон или мессенджер»
function splitContact(c) {
  c = String(c || '').trim();
  if (/^@\w{3,}$/.test(c) || /t\.me\//i.test(c)) return { telegram: c };
  if (/@/.test(c) && /\./.test(c)) return { email: c };
  return c ? { phone: c } : {};
}

// ---------- вход ----------
const sessions = new Map();
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
const loginTries = new Map();
function tooManyLogins(ip) {
  const list = (loginTries.get(ip) || []).filter(t => t > Date.now() - 15 * 60 * 1000);
  loginTries.set(ip, list);
  return list.length >= 10;
}
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

// ---------- HTML ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const opts = (list, cur, empty) => (empty !== undefined ? `<option value="">${empty}</option>` : '') + list.map(x => { const [k, n] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(k)}"${cur === k ? ' selected' : ''}>${esc(n)}</option>`; }).join('');
const CSS = `
:root{--bg:#f4f2ef;--card:#fff;--line:#e4dfd8;--text:#1b1716;--muted:#6b625d;--accent:#821f30;--soft:#f6eaec}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}header{background:#fff;border-bottom:1px solid var(--line)}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}.top{display:flex;align-items:center;gap:18px;min-height:60px;flex-wrap:wrap}
.logo{font-weight:800;font-size:19px;color:var(--text);text-decoration:none}.logo span{color:var(--accent)}
.top nav{display:flex;gap:16px;flex:1;flex-wrap:wrap}.top nav a{text-decoration:none;color:var(--text);font-weight:600}.top nav a.on{color:var(--accent)}
main{padding:24px 0 60px}h1{font-size:24px;margin:0 0 16px}h2{font-size:18px;margin:0 0 12px}
.btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 16px;border-radius:10px;border:0;background:var(--accent);color:#fff;font:600 14px/1 inherit;text-decoration:none;cursor:pointer}
.btn.ghost{background:#fff;color:var(--text);border:1px solid var(--line)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px}
.stat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;color:var(--text)}
.stat b{display:block;font-size:22px}.stat span{font-size:13px;color:var(--muted)}.stat.on{border-color:var(--accent);background:var(--soft)}
.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
input,select,textarea{font:inherit;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--text);width:100%}
.bar input,.bar select{width:auto;flex:1 1 180px}.bar input[name=q]{flex:2 1 260px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top;font-size:14px}th{font-size:12px;color:var(--muted);font-weight:600;background:#faf8f6}
tr:last-child td{border-bottom:0}td a{font-weight:600;text-decoration:none}
.tag{display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600;background:#eee;color:#333;white-space:nowrap}
.st-new{background:#fde8ec;color:#821f30}.st-contact{background:#fff1d6;color:#7a4b00}.st-offer{background:#e6f0ff;color:#1d4e9e}
.st-work{background:#e5f6ee;color:#11603d}.st-client{background:#d9f2e3;color:#0b4d2c}.st-lost{background:#eee;color:#555}
.grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:18px}@media(max-width:860px){.grid{grid-template-columns:1fr}}
.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}@media(max-width:560px){.fields{grid-template-columns:1fr}}
label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted);font-weight:600}
label.check{flex-direction:row;align-items:center;gap:8px}label.check input{width:auto}
.full{grid-column:1/-1}.actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.ev{border-left:2px solid var(--line);padding:2px 0 12px 14px;margin-left:4px}.ev small{color:var(--muted);display:block}.ev p{margin:2px 0 0;white-space:pre-wrap}
.ev.lead{border-color:var(--accent)}.ev.status{border-color:#1d4e9e}.muted{color:var(--muted)}.over{color:#b00020;font-weight:700}
.tablewrap{overflow-x:auto}.login{max-width:360px;margin:12vh auto}.err{color:#b00020;font-size:14px}
.an{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}@media(max-width:860px){.an{grid-template-columns:1fr}}
.hb{display:grid;grid-template-columns:minmax(120px,38%) 1fr auto;gap:8px 10px;align-items:center;font-size:14px}
.hb .track{height:14px;background:#f0ebe6;border-radius:999px;overflow:hidden}.hb .fill{height:100%;background:var(--accent);border-radius:999px}
.hb .fill.alt{background:#1d4e9e}.hb .num{font-weight:700;white-space:nowrap}.hb .num small{font-weight:400;color:var(--muted)}
.months{display:flex;align-items:flex-end;gap:6px;height:150px;padding-top:10px}.months div{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;color:var(--muted)}
.months i{display:block;width:100%;background:var(--accent);border-radius:6px 6px 0 0;min-height:2px}.months b{color:var(--text)}
@media print{header,.noprint{display:none!important}body{background:#fff}.card{border:0;padding:0}main{padding:0}}
`;
function page(title, body, o = {}) {
  const nav = [['/leads', 'Заявки', 'leads'], ['/', 'Компании', 'companies'], ['/analytics', 'Аналитика', 'analytics'], ['/leads/new', '+ Заявка', 'add']];
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(title)} — I-Guide CRM</title><style>${CSS}</style></head><body>
${o.bare ? '' : `<header><div class="wrap top"><a class="logo" href="/leads">i<span>-</span>guide CRM</a><nav>${nav.map(([u, n, k]) => `<a href="${u}"${o.nav === k ? ' class="on"' : ''}>${n}</a>`).join('')}</nav><form method="post" action="/logout"><button class="btn ghost" type="submit">Выйти</button></form></div></header>`}
<main><div class="wrap">${body}</div></main></body></html>`;
}

// ---------- компании ----------
function listPage(q) {
  const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM companies GROUP BY status').all().map(r => [r.status, r.n]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const st = STATUSES.some(s => s[0] === q.status) ? q.status : '';
  const search = clip(q.q, 100);
  const where = [], args = [];
  if (st) { where.push('status = ?'); args.push(st); }
  if (search) { where.push('(name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR email LIKE ? OR telegram LIKE ? OR website LIKE ? OR city LIKE ?)'); for (let i = 0; i < 7; i++) args.push('%' + search + '%'); }
  const rows = db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM leads l WHERE l.company_id = c.id) leads_n FROM companies c ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY CASE status WHEN 'new' THEN 0 ELSE 1 END, COALESCE(NULLIF(next_action_at,''), '9999'), updated_at DESC LIMIT 500`).all(...args);
  const today = new Date().toISOString().slice(0, 10);
  const stat = (k, name, n) => `<a class="stat${st === k ? ' on' : ''}" href="/?status=${k}${search ? '&q=' + encodeURIComponent(search) : ''}"><b>${n || 0}</b><span>${name}</span></a>`;
  return page('Компании', `
<h1>Компании</h1>
<div class="stats">${stat('', 'Все', total)}${STATUSES.map(([k, n]) => stat(k, n, counts[k])).join('')}</div>
<form class="bar" method="get" action="/">${st ? `<input type="hidden" name="status" value="${st}">` : ''}<input name="q" value="${esc(search)}" placeholder="Поиск: компания, контакт, телефон, сайт, город" aria-label="Поиск"><button class="btn ghost" type="submit">Найти</button><a class="btn" href="/new">+ Компания</a><a class="btn ghost" href="/export.csv">Выгрузить компании</a></form>
${rows.length ? `<div class="tablewrap"><table><thead><tr><th>Компания</th><th>Контакт</th><th>Категория / услуга</th><th>Статус</th><th>Следующий шаг</th><th>Заявок</th></tr></thead><tbody>
${rows.map(r => `<tr><td><a href="/c/${r.id}">${esc(r.name)}</a>${r.city ? `<div class="muted">${esc(r.city)}</div>` : ''}</td>
<td>${esc(r.contact_person)}<div class="muted">${esc(r.phone || r.telegram || r.email)}</div></td>
<td>${esc(r.category)}<div class="muted">${esc(r.service)}</div></td>
<td><span class="tag st-${r.status}">${statusName(r.status)}</span></td>
<td>${r.next_action_at ? `<span class="${r.next_action_at.slice(0, 10) < today && !['client', 'lost'].includes(r.status) ? 'over' : ''}">${esc(r.next_action_at.replace('T', ' '))}</span>` : ''}<div class="muted">${esc(r.next_action)}</div></td>
<td>${r.leads_n}</td></tr>`).join('')}
</tbody></table></div>` : `<div class="card">${total ? 'Ничего не найдено.' : 'Пока нет ни одной компании. Заявки с сайта появятся здесь автоматически.'}</div>`}`, { nav: 'companies' });
}

function fieldsHtml(c = {}) {
  const f = (k, label, type = 'text', cls = '') => `<label class="${cls}">${label}<input name="${k}" type="${type}" value="${esc(c[k] || '')}"></label>`;
  return `<div class="fields">
${f('name', 'Компания', 'text', 'full')}
${f('contact_person', 'Контактное лицо')}${f('phone', 'Телефон', 'tel')}
${f('telegram', 'Telegram')}${f('email', 'E-mail', 'email')}
${f('website', 'Сайт')}${f('city', 'Город')}
<label>Категория<select name="category">${opts(CATEGORIES, c.category || '', '—')}</select></label>${f('service', 'Услуга')}
${f('source', 'Источник')}
<label>Статус<select name="status">${opts(STATUSES, c.status || 'new')}</select></label>
${f('next_action_at', 'Следующий шаг — когда', 'datetime-local')}${f('next_action', 'Следующий шаг — что сделать')}
</div>`;
}

function leadsTable(rows, withCompany = true) {
  if (!rows.length) return '<div class="card">Заявок пока нет.</div>';
  return `<div class="tablewrap"><table><thead><tr><th>Дата</th>${withCompany ? '<th>Компания</th>' : ''}<th>Категория / услуга</th><th>Канал / источник</th><th>Обращение</th>${withCompany ? '<th>Статус</th>' : ''}</tr></thead><tbody>
${rows.map(l => `<tr><td class="muted">${fmt(l.created_at)}<div>№${l.id}</div></td>
${withCompany ? `<td><a href="/c/${l.company_id}">${esc(l.company_name)}</a><div class="muted">${esc(l.contact_name)} ${esc(l.contact)}</div></td>` : ''}
<td>${esc(l.category || '—')}<div class="muted">${esc(l.service)}</div></td>
<td>${channelName(l.channel)}<div class="muted">${esc([l.source, l.utm].filter(Boolean).join(' · '))}</div></td>
<td style="max-width:320px">${esc(l.message).slice(0, 220)}${l.page ? `<div class="muted">Страница: ${esc(l.page)}</div>` : ''}</td>
${withCompany ? `<td><span class="tag st-${l.status}">${statusName(l.status)}</span></td>` : ''}</tr>`).join('')}
</tbody></table></div>`;
}

function companyPage(id) {
  const c = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  if (!c) return null;
  const evs = db.prepare('SELECT * FROM events WHERE company_id = ? ORDER BY id DESC').all(id);
  const leads = db.prepare('SELECT * FROM leads WHERE company_id = ? ORDER BY created_at DESC, id DESC').all(id);
  const typeName = { lead: 'Заявка', note: 'Заметка', status: 'Статус', created: 'Создана', edit: 'Изменения' };
  return page(c.name, `
<p class="noprint"><a href="/">← Все компании</a></p>
<div class="bar"><h1 style="margin:0;flex:1">${esc(c.name)} <span class="tag st-${c.status}">${statusName(c.status)}</span></h1>
<a class="btn ghost" href="/leads/new?company=${c.id}">+ Заявка от этой компании</a><a class="btn ghost" href="/c/${c.id}/print">Документ / PDF</a></div>
<div class="grid">
  <form class="card" method="post" action="/c/${c.id}"><h2>Данные компании</h2>${fieldsHtml(c)}
    <div class="actions"><button class="btn" type="submit">Сохранить</button></div></form>
  <div>
    <form class="card" method="post" action="/c/${c.id}/note" style="margin-bottom:14px"><h2>Добавить заметку</h2>
      <textarea name="text" rows="3" required placeholder="Позвонил, договорились о встрече в четверг"></textarea>
      <div class="actions"><button class="btn" type="submit">Добавить</button></div></form>
    <div class="card"><h2>История</h2>${evs.map(e => `<div class="ev ${e.type}"><small>${fmt(e.created_at)} · ${typeName[e.type] || e.type}</small><p>${esc(e.text)}</p></div>`).join('') || '<p class="muted">Пока пусто.</p>'}</div>
  </div>
</div>
<h2 style="margin-top:22px">Заявки компании (${leads.length})</h2>${leadsTable(leads, false)}
<form method="post" action="/c/${c.id}/delete" style="margin-top:18px" onsubmit="return confirm('Удалить компанию, её заявки и всю историю? Это нельзя отменить.')"><button class="btn ghost" type="submit">Удалить компанию</button></form>`, { nav: 'companies' });
}

// карточка клиента как документ: всё, что о нём записано, с согласиями на обработку данных
function printPage(id) {
  const c = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  if (!c) return null;
  const evs = db.prepare('SELECT * FROM events WHERE company_id = ? ORDER BY id').all(id);
  const leads = db.prepare('SELECT * FROM leads WHERE company_id = ? ORDER BY id').all(id);
  const row = (k, v) => v ? `<tr><th style="width:34%">${k}</th><td>${esc(v)}</td></tr>` : '';
  return page('Карточка ' + c.name, `
<div class="bar noprint"><a href="/c/${c.id}">← К карточке</a><span style="flex:1"></span><button class="btn" onclick="print()">Печать / сохранить в PDF</button></div>
<div class="card">
<p class="muted" style="margin:0">I-Guide CRM · карточка клиента № ${c.id} · сформирована ${fmt(now())}</p>
<h1 style="margin:6px 0 14px">${esc(c.name)}</h1>
<table>${row('Статус', statusName(c.status))}${row('Контактное лицо', c.contact_person)}${row('Телефон', c.phone)}${row('Telegram', c.telegram)}${row('E-mail', c.email)}${row('Сайт', c.website)}${row('Город', c.city)}${row('Категория', c.category)}${row('Услуга', c.service)}${row('Источник', c.source)}${row('Следующий шаг', [c.next_action_at.replace('T', ' '), c.next_action].filter(Boolean).join(' — '))}${row('Создана', fmt(c.created_at))}${row('Изменена', fmt(c.updated_at))}</table>
<h2 style="margin-top:20px">Обращения (${leads.length})</h2>
${leads.map(l => `<table style="margin-bottom:10px">${row('№ и дата', `№${l.id} от ${fmt(l.created_at)}`)}${row('Канал', channelName(l.channel))}${row('Категория / услуга', [l.category, l.service].filter(Boolean).join(' / '))}${row('Контакт', [l.contact_name, l.contact].filter(Boolean).join(', '))}${row('Сайт', l.website)}${row('Обращение', l.message)}${row('Страница сайта', l.page)}${row('Источник', [l.source, l.utm].filter(Boolean).join(' · '))}${row('Согласие на обработку ПДн', l.consent ? `дано ${fmt(l.consent_at)}${l.consent_ip ? ', IP ' + l.consent_ip : ''}${l.consent_text ? '. Текст: «' + l.consent_text + '»' : ''}` : (l.channel === 'site' ? 'нет' : 'не требуется / получено вне сайта'))}${row('Внёс', l.author)}</table>`).join('') || '<p class="muted">Нет.</p>'}
<h2 style="margin-top:20px">История работы</h2>
<table>${evs.map(e => `<tr><th style="width:34%">${fmt(e.created_at)}</th><td style="white-space:pre-wrap">${esc(e.text)}</td></tr>`).join('')}</table>
</div>`, { nav: 'companies' });
}

// ---------- заявки ----------
function leadsWhere(q) {
  const where = [], args = [];
  const days = { '7': 7, '30': 30, '90': 90, '365': 365 }[q.period];
  if (days) { where.push('l.created_at >= ?'); args.push(new Date(Date.now() - days * 864e5).toISOString()); }
  if (q.category) { where.push('l.category = ?'); args.push(q.category); }
  if (q.channel) { where.push('l.channel = ?'); args.push(q.channel); }
  const s = clip(q.q, 100);
  if (s) { where.push('(c.name LIKE ? OR l.contact LIKE ? OR l.contact_name LIKE ? OR l.message LIKE ? OR l.service LIKE ?)'); for (let i = 0; i < 5; i++) args.push('%' + s + '%'); }
  return [where.length ? 'WHERE ' + where.join(' AND ') : '', args];
}
const PERIODS = [['', 'За всё время'], ['7', '7 дней'], ['30', '30 дней'], ['90', '3 месяца'], ['365', 'Год']];
function leadsPage(q) {
  const [w, a] = leadsWhere(q);
  const rows = db.prepare(`SELECT l.*, c.name company_name, c.status FROM leads l JOIN companies c ON c.id = l.company_id ${w} ORDER BY l.created_at DESC, l.id DESC LIMIT 500`).all(...a);
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString();
  return page('Заявки', `
<div class="bar"><h1 style="margin:0;flex:1">Заявки</h1><a class="btn" href="/leads/new">+ Внести заявку</a><a class="btn ghost" href="/leads.csv${qs ? '?' + qs : ''}">Журнал в Excel (CSV)</a></div>
<form class="bar" method="get" action="/leads">
<select name="period" aria-label="Период">${opts(PERIODS, q.period || '')}</select>
<select name="category" aria-label="Категория">${opts(CATEGORIES, q.category || '', 'Все категории')}</select>
<select name="channel" aria-label="Канал">${opts(CHANNELS, q.channel || '', 'Все каналы')}</select>
<input name="q" value="${esc(q.q || '')}" placeholder="Поиск по компании, контакту, тексту" aria-label="Поиск"><button class="btn ghost" type="submit">Показать</button></form>
<p class="muted">Найдено: ${rows.length}</p>
${leadsTable(rows)}`, { nav: 'leads' });
}
function newLeadPage(q, err = '') {
  const pre = q.company ? db.prepare('SELECT * FROM companies WHERE id = ?').get(Number(q.company)) : null;
  const companies = db.prepare('SELECT id, name FROM companies ORDER BY name').all();
  return page('Новая заявка', `<p><a href="/leads">← Все заявки</a></p><h1>Внести заявку</h1>
${err ? `<p class="err">${esc(err)}</p>` : ''}
<form class="card" method="post" action="/leads/new" style="max-width:820px"><div class="fields">
<label class="full">Компания<select name="company_id">${`<option value="">— Новая компания —</option>` + companies.map(c => `<option value="${c.id}"${pre && pre.id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
<label class="full">Название новой компании (если её ещё нет в списке)<input name="name"></label>
<label>Контактное лицо<input name="contact_name" value="${esc(pre?.contact_person || '')}"></label>
<label>Телефон / Telegram / e-mail<input name="contact" value="${esc(pre ? (pre.phone || pre.telegram || pre.email) : '')}"></label>
<label>Сайт<input name="website" value="${esc(pre?.website || '')}"></label><label>Город<input name="city" value="${esc(pre?.city || '')}"></label>
<label>Канал обращения<select name="channel">${opts(CHANNELS, 'phone')}</select></label>
<label>Категория<select name="category">${opts(CATEGORIES, pre?.category || '', '—')}</select></label>
<label class="full">Услуга<input name="service" value="${esc(pre?.service || '')}"></label>
<label class="full">Суть обращения<textarea name="message" rows="4" required></textarea></label>
<label class="full">Источник (как узнали о нас)<input name="source" placeholder="поиск Яндекса, рекомендация, выставка"></label>
<label class="check full"><input type="checkbox" name="consent"> Клиент дал согласие на обработку персональных данных</label>
</div><div class="actions"><button class="btn" type="submit">Сохранить заявку</button></div></form>`, { nav: 'add' });
}

// ---------- аналитика ----------
function analyticsPage(q) {
  const [w, a] = leadsWhere({ period: q.period });
  const base = `FROM leads l JOIN companies c ON c.id = l.company_id ${w}`;
  const total = db.prepare(`SELECT COUNT(*) n, COUNT(DISTINCT l.company_id) cn ${base}`).get(...a);
  const clients = db.prepare(`SELECT COUNT(DISTINCT l.company_id) n ${base}${w ? ' AND' : ' WHERE'} c.status = 'client'`).get(...a).n;
  const group = (col, label) => db.prepare(`SELECT COALESCE(NULLIF(${col}, ''), '${label}') k, COUNT(*) n, COUNT(DISTINCT CASE WHEN c.status = 'client' THEN l.company_id END) won ${base} GROUP BY k ORDER BY n DESC`).all(...a);
  const byCat = group('l.category', 'Без категории');
  const byChan = group('l.channel', 'other').map(r => ({ ...r, k: channelName(r.k) }));
  const bySrc = group("CASE WHEN l.utm <> '' THEN 'Реклама (UTM-метки)' WHEN l.source = 'прямой заход' THEN 'Прямой заход' WHEN l.source <> '' THEN l.source ELSE '' END", 'Не указан');
  const byCity = group('COALESCE(NULLIF(l.city, \'\'), c.city)', 'Город не указан').slice(0, 10);
  const months = db.prepare(`SELECT substr(l.created_at, 1, 7) m, COUNT(*) n ${base} GROUP BY m ORDER BY m DESC LIMIT 12`).all(...a).reverse();
  const funnel = db.prepare(`SELECT c.status s, COUNT(DISTINCT c.id) n ${base} GROUP BY c.status`).all(...a);
  const bars = (rows, alt, plain) => {
    const max = Math.max(1, ...rows.map(r => r.n));
    return rows.length ? `<div class="hb">${rows.map(r => `<span>${esc(r.k)}</span><span class="track"><span class="fill${alt ? ' alt' : ''}" style="display:block;width:${Math.round(r.n / max * 100)}%"></span></span><span class="num">${r.n}${plain ? '' : ` <small>· клиентов ${r.won}</small>`}</span>`).join('')}</div>` : '<p class="muted">Нет данных.</p>';
  };
  const mmax = Math.max(1, ...months.map(m => m.n));
  const mName = m => new Date(m + '-01T00:00:00').toLocaleString('ru-RU', { month: 'short', year: '2-digit' });
  const conv = total.cn ? Math.round(clients / total.cn * 100) : 0;
  const top = byCat[0];
  return page('Аналитика', `
<div class="bar"><h1 style="margin:0;flex:1">Аналитика обращений</h1>
<form method="get" action="/analytics" class="bar" style="margin:0"><select name="period" aria-label="Период" onchange="this.form.submit()">${opts(PERIODS, q.period || '')}</select><noscript><button class="btn ghost">Показать</button></noscript></form></div>
<div class="stats">
<div class="stat"><b>${total.n}</b><span>Заявок</span></div>
<div class="stat"><b>${total.cn}</b><span>Компаний обратилось</span></div>
<div class="stat"><b>${clients}</b><span>Стали клиентами</span></div>
<div class="stat"><b>${conv}%</b><span>Конверсия в клиента</span></div>
<div class="stat"><b style="font-size:16px">${top ? esc(top.k) : '—'}</b><span>Самая частая категория</span></div>
</div>
<div class="an">
<div class="card"><h2>Из каких категорий обращаются</h2>${bars(byCat)}</div>
<div class="card"><h2>Откуда пришли</h2>${bars(bySrc, true)}</div>
<div class="card"><h2>Каналы обращения</h2>${bars(byChan, true)}</div>
<div class="card"><h2>Города</h2>${bars(byCity)}</div>
<div class="card"><h2>Заявки по месяцам</h2>${months.length ? `<div class="months">${months.map(m => `<div><b>${m.n}</b><i style="height:${Math.round(m.n / mmax * 110)}px"></i>${mName(m.m)}</div>`).join('')}</div>` : '<p class="muted">Нет данных.</p>'}</div>
<div class="card"><h2>Где сейчас обратившиеся компании</h2>${bars(STATUSES.map(([k, n]) => ({ k: n, n: (funnel.find(f => f.s === k) || {}).n || 0, won: k === 'client' ? ((funnel.find(f => f.s === k) || {}).n || 0) : 0 })).filter(r => r.n), false, true)}</div>
</div>`, { nav: 'analytics' });
}

// ---------- выгрузки ----------
const csvOut = (res, name, cols, rows) => {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [cols.map(c => c[1]).join(';'), ...rows.map(r => cols.map(([k]) => cell(typeof k === 'function' ? k(r) : r[k])).join(';'))].join('\r\n');
  send(res, 200, csv, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"` });
};

// ---------- запросы ----------
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try { resolve((req.headers['content-type'] || '').includes('application/json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw))); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
const send = (res, code, body, headers = {}) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...headers }); res.end(body); };
const json = (res, code, obj, headers = {}) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
const redirect = (res, to, headers = {}) => send(res, 303, '', { Location: to, ...headers });
const ipOf = req => (config.trustProxy ? (req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || '';
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}
const CONSENT_TEXT = config.consentText || 'Даю согласие на обработку персональных данных в соответствии с Политикой';

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const q = Object.fromEntries(url.searchParams);

  // заявка с сайта
  if (p === '/api/lead') {
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return send(res, 204, '', cors);
    if (req.method !== 'POST') return json(res, 405, { ok: false }, cors);
    if (req.headers.origin && !cors['Access-Control-Allow-Origin']) return json(res, 403, { ok: false, error: 'origin' });
    const ip = ipOf(req);
    if (tooManyLeads(ip)) return json(res, 429, { ok: false, error: 'Слишком много заявок, попробуйте позже' }, cors);
    let d; try { d = await readBody(req, 16 * 1024); } catch { return json(res, 400, { ok: false }, cors); }
    if (d.company_website) return json(res, 200, { ok: true }, cors); // ловушка для ботов
    if (!clip(d.name) || !clip(d.contact)) return json(res, 400, { ok: false, error: 'Укажите имя и контакт' }, cors);
    if (!(d.consent === true || d.consent === 'on' || d.consent === 'true')) return json(res, 400, { ok: false, error: 'Нужно согласие на обработку персональных данных' }, cors);
    const utm = d.utm && typeof d.utm === 'object' ? Object.entries(d.utm).map(([k, v]) => `${k}=${v}`).join(', ') : '';
    const host = hostOf(d.site);
    const ct = splitContact(d.contact);
    const category = CATEGORIES.includes(d.category) ? d.category : '';
    const found = findCompany(host, ct);
    const id = found ? found.id : createCompany({ name: host || `Заявка: ${d.name}`, contact_person: d.name, website: d.site || '', city: d.city || '', category, service: d.service || '', source: [d.source, utm].filter(Boolean).join(' · '), ...ct });
    const leadId = addLead(id, { channel: 'site', category, service: d.service, city: d.city, contact_name: d.name, contact: d.contact, website: d.site, message: d.task, page: d.page, source: d.source, utm, consent: true, consent_at: now(), consent_ip: ip, consent_text: CONSENT_TEXT });
    const text = [`Заявка №${leadId} с сайта`, `Имя: ${d.name}`, `Контакт: ${d.contact}`, d.site ? `Сайт: ${d.site}` : '', category ? `Категория: ${category}` : '', d.service ? `Услуга: ${d.service}` : '', d.city ? `Город: ${d.city}` : '', d.task ? `Задача: ${d.task}` : '', d.page ? `Страница: ${d.page}` : '', [d.source, utm].filter(Boolean).length ? `Источник: ${[d.source, utm].filter(Boolean).join(' · ')}` : ''].filter(Boolean).join('\n');
    addEvent(id, 'lead', (found ? 'Повторное обращение. ' : '') + text);
    notifyTelegram(`${found ? 'Повторная заявка' : 'Новая заявка'} — I-Guide\n\n${text}\n\nКарточка в CRM: №${id}`);
    return json(res, 200, { ok: true }, cors);
  }

  if (p === '/login') {
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(res, 403, 'Forbidden');
      const ip = ipOf(req);
      if (tooManyLogins(ip)) return send(res, 429, page('Вход', '<div class="card login">Слишком много попыток. Подождите 15 минут.</div>', { bare: true }));
      const d = await readBody(req).catch(() => ({}));
      if (checkPassword(d.password || '')) {
        const t = crypto.randomBytes(32).toString('hex');
        sessions.set(t, Date.now() + SESSION_MS);
        return redirect(res, '/leads', { 'Set-Cookie': `crm=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${config.secureCookie ? '; Secure' : ''}` });
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

  if (!authed(req)) return redirect(res, '/login');
  if (req.method === 'POST' && !sameOrigin(req)) return send(res, 403, 'Forbidden');

  if (p === '/' && req.method === 'GET') return send(res, 200, listPage(q));
  if (p === '/leads' && req.method === 'GET') return send(res, 200, leadsPage(q));
  if (p === '/analytics' && req.method === 'GET') return send(res, 200, analyticsPage(q));
  if (p === '/leads/new' && req.method === 'GET') return send(res, 200, newLeadPage(q));
  if (p === '/leads/new' && req.method === 'POST') {
    const d = await readBody(req);
    if (!clip(d.message)) return send(res, 400, newLeadPage(d, 'Опишите суть обращения'));
    let id = Number(d.company_id) || 0;
    const ct = splitContact(d.contact);
    if (id && !db.prepare('SELECT id FROM companies WHERE id = ?').get(id)) id = 0;
    if (!id) {
      const found = findCompany(hostOf(d.website), ct);
      id = found ? found.id : createCompany({ name: d.name || hostOf(d.website) || d.contact_name, contact_person: d.contact_name, website: d.website, city: d.city, category: CATEGORIES.includes(d.category) ? d.category : '', service: d.service, source: d.source, ...ct });
    }
    const consent = d.consent === 'on';
    const leadId = addLead(id, { channel: d.channel, category: CATEGORIES.includes(d.category) ? d.category : '', service: d.service, city: d.city, contact_name: d.contact_name, contact: d.contact, website: d.website, message: d.message, source: d.source, consent, consent_at: consent ? now() : '', consent_text: consent ? 'Согласие получено вне сайта (отмечено в CRM)' : '', author: 'внесено вручную' });
    addEvent(id, 'lead', `Заявка №${leadId} (${channelName(d.channel)}) внесена вручную.\n${d.message}`);
    return redirect(res, '/c/' + id);
  }
  if (p === '/new' && req.method === 'GET') return send(res, 200, page('Новая компания', `<p><a href="/">← Все компании</a></p><h1>Новая компания</h1><form class="card" method="post" action="/new" style="max-width:760px">${fieldsHtml()}<label class="full" style="margin-top:10px">Заметка<textarea name="note" rows="3"></textarea></label><div class="actions"><button class="btn" type="submit">Добавить</button></div></form>`, { nav: 'companies' }));
  if (p === '/new' && req.method === 'POST') {
    const d = await readBody(req);
    const id = createCompany(d);
    addEvent(id, 'created', d.note ? `Добавлена вручную.\n${d.note}` : 'Добавлена вручную.');
    return redirect(res, '/c/' + id);
  }
  if (p === '/export.csv' && req.method === 'GET') {
    const cols = [['id', '№'], ['name', 'Компания'], ['contact_person', 'Контакт'], ['phone', 'Телефон'], ['email', 'E-mail'], ['telegram', 'Telegram'], ['website', 'Сайт'], ['city', 'Город'], ['category', 'Категория'], ['service', 'Услуга'], ['source', 'Источник'], [r => statusName(r.status), 'Статус'], ['next_action_at', 'Следующий шаг — когда'], ['next_action', 'Следующий шаг'], [r => fmt(r.created_at), 'Создана'], [r => fmt(r.updated_at), 'Изменена']];
    return csvOut(res, 'iguide-companies', cols, db.prepare('SELECT * FROM companies ORDER BY id').all());
  }
  if (p === '/leads.csv' && req.method === 'GET') {
    const [w, a] = leadsWhere(q);
    const cols = [['id', '№ заявки'], [r => fmt(r.created_at), 'Дата'], ['company_name', 'Компания'], [r => channelName(r.channel), 'Канал'], ['category', 'Категория'], ['service', 'Услуга'], ['city', 'Город'], ['contact_name', 'Контактное лицо'], ['contact', 'Контакт'], ['website', 'Сайт'], ['message', 'Обращение'], ['page', 'Страница'], ['source', 'Источник'], ['utm', 'UTM'], [r => r.consent ? 'да, ' + fmt(r.consent_at) : 'нет', 'Согласие на обработку ПДн'], ['consent_ip', 'IP согласия'], [r => statusName(r.status), 'Статус компании']];
    return csvOut(res, 'iguide-leads', cols, db.prepare(`SELECT l.*, c.name company_name, c.status FROM leads l JOIN companies c ON c.id = l.company_id ${w} ORDER BY l.id`).all(...a));
  }
  const m = p.match(/^\/c\/(\d+)(\/note|\/delete|\/print)?$/);
  if (m) {
    const id = Number(m[1]);
    const c = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    if (!c) return send(res, 404, page('Не найдено', '<div class="card">Компания не найдена. <a href="/">К списку</a></div>'));
    if (!m[2] && req.method === 'GET') return send(res, 200, companyPage(id));
    if (m[2] === '/print' && req.method === 'GET') return send(res, 200, printPage(id));
    if (!m[2] && req.method === 'POST') {
      const d = await readBody(req);
      const v = Object.fromEntries(FIELDS.map(f => [f, clip(d[f])]));
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
      if (clip(d.text)) { addEvent(id, 'note', d.text.trim()); db.prepare('UPDATE companies SET updated_at = ? WHERE id = ?').run(now(), id); }
      return redirect(res, '/c/' + id);
    }
    if (m[2] === '/delete' && req.method === 'POST') {
      backup();
      db.prepare('DELETE FROM leads WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM events WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM companies WHERE id = ?').run(id);
      return redirect(res, '/');
    }
  }
  return send(res, 404, page('Не найдено', '<div class="card">Страница не найдена. <a href="/leads">К заявкам</a></div>'));
}
function loginPage(err = '') {
  return page('Вход', `<form class="card login" method="post" action="/login"><h1>I-Guide CRM</h1><label>Пароль<input name="password" type="password" autocomplete="current-password" required autofocus></label>${err ? `<p class="err">${err}</p>` : ''}<div class="actions"><button class="btn" type="submit">Войти</button></div></form>`, { bare: true });
}

http.createServer((req, res) => handle(req, res).catch(e => { console.error(e); send(res, 500, 'Ошибка сервера'); }))
  .listen(PORT, config.host || '127.0.0.1', () => console.log(`I-Guide CRM: http://localhost:${PORT}`));
