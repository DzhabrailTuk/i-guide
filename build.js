// Генератор статического сайта I-Guide без зависимостей.
// Каждая страница — модуль в src/pages/**. Запуск: node build.js → папка dist/
// Типы страниц: home | service (услуга или город) | article (база знаний) | hub | page
const fs = require('fs');
const path = require('path');
const site = require('./src/config');

const ROOT = __dirname;
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const OUT = path.join(ROOT, 'dist');

// Группы услуг — порядок = порядок в меню и на страницах
const GROUPS = require('./src/groups');
// Рубрики базы знаний
const KB_CATS = ['SEO', 'GEO и карты', 'Реклама', 'Продажи', 'Сайты', 'SERM — репутация', 'Закон и аудит'];

// ---------- сбор страниц ----------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.js') && !d.name.startsWith('_') ? [path.join(dir, d.name)] : []);
}
const pages = walk(PAGES_DIR).map(f => require(f));
GROUPS.forEach(g => { g.path = '/uslugi/' + g.key + '/'; });
// страницы групп услуг /uslugi/<group>/ — генерируются из src/groups.js
for (const g of GROUPS) pages.push({ path: g.path, type: 'hub', groupHub: g.key, title: g.title, description: g.description, h1: g.h1, lead: g.lead, crumbs: [['Услуги', '/uslugi/']],
  body: ({ svcOf, card, articles, B }) => g.intro + '<h2 id="uslugi">Услуги раздела</h2><div class="cards cards-2">' + svcOf(g.key).map(s => card(s)).join('') + '</div>'
    + (() => { const set = new Set(svcOf(g.key).map(s => s.path)); const a = articles.filter(x => set.has(x.service)); return a.length ? '<h2 id="stati">Полезные материалы</h2>' + B.articles(a.slice(0, 6)) : ''; })() });
const byPath = Object.fromEntries(pages.filter(p => !p.file).map(p => [p.path, p]));
const services = pages.filter(p => p.type === 'service' && p.group).sort((a, b) => (a.order || 0) - (b.order || 0));
const cities = pages.filter(p => p.type === 'service' && p.city).sort((a, b) => (a.order || 0) - (b.order || 0));
const articles = pages.filter(p => p.type === 'article').sort((a, b) => (a.order || 0) - (b.order || 0));
const svcOf = g => services.filter(s => s.group === g);
const artOf = c => articles.filter(a => a.kbCat === c);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const V = Date.now().toString(36);
const tgUrl = site.telegram ? 'https://t.me/' + site.telegram.replace(/^@|^https?:\/\/t\.me\//, '') : '';
const tgAttrs = tgUrl ? `href="${tgUrl}" target="_blank" rel="noopener"` : 'href="/kontakty/#svyaz" data-todo="telegram"';
const waNum = (site.whatsapp || '').replace(/\D/g, '').replace(/^8(\d{10})$/, '7$1');
const waUrl = waNum ? 'https://wa.me/' + waNum : '';
const waAttrs = waUrl ? `href="${waUrl}" target="_blank" rel="noopener"` : 'href="/kontakty/#svyaz" data-todo="whatsapp"';
const abs = p => site.url.replace(/\/$/, '') + p;

// ---------- иконки ----------
const ICONS = {
  seo: '<path d="M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/>',
  geo: '<path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/>',
  ai: '<path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2Zm6.5 11 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6ZM6 15l.8 2.2L9 18l-2.2.8L6 21l-.8-2.2L3 18l2.2-.8L6 15Z"/>',
  sites: '<path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 5v9h16V9H4Zm1-3v1.5h2V6H5Zm3 0v1.5h2V6H8Z"/>',
  audit: '<path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.9-4.9 1.4 1.4-6.3 6.3Z"/>',
  kb: '<path d="M4 3h7a3 3 0 0 1 3 3v15a2 2 0 0 0-2-2H4V3Zm16 0h-4a3 3 0 0 0-3 3v15a2 2 0 0 1 2-2h5V3Z"/>',
  consult: '<path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Zm3 5v2h10V9H7Zm0 4v2h6v-2H7Z"/>',
  direct: '<path d="M3 13h4v8H3v-8Zm7-6h4v14h-4V7Zm7-4h4v18h-4V3Z"/>',
  sales: '<path d="M3 17.6 9 11.6l4 4 6.6-6.6H16V7h7v7h-2V10.4l-8 8-4-4-4.6 4.6L3 17.6Z"/>',
  funnel: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4Z"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z"/>',
  price: '<path d="M8 3h6a5 5 0 0 1 0 10h-4v2h5v2h-5v4H8v-4H6v-2h2v-2H6v-2h2V3Zm2 2v6h4a3 3 0 0 0 0-6h-4Z"/>',
  city: '<path d="M3 21V9l6-3v3l6-3v15H3Zm14 0V10h4v11h-4ZM6 12v2h2v-2H6Zm0 4v2h2v-2H6Zm4-4v2h2v-2h-2Zm0 4v2h2v-2h-2Z"/>',
  chart: '<path d="M4 20V4h2v14h14v2H4Zm4-4v-5h3v5H8Zm5 0V8h3v8h-3Zm5 0v-3h3v3h-3Z"/>',
  arrow: '<path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3 1.4-1.4Z"/>',
  check: '<path d="m9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6 11-11-1.4-1.4-9.6 9.6Z"/>',
};
// Официальный логотип Telegram в фирменных цветах (не перекрашивается)
let tgN = 0;
const tgLogo = cls => { const id = 'tgg' + (++tgN); return `<svg class="${cls} tg-logo" viewBox="0 0 240 240" aria-hidden="true"><defs><linearGradient id="${id}" x1=".667" y1=".167" x2=".417" y2=".75"><stop offset="0" stop-color="#37aee2"/><stop offset="1" stop-color="#1e96c8"/></linearGradient></defs><circle cx="120" cy="120" r="120" fill="url(#${id})"/><path fill="#c8daea" d="M98 175c-3.9 0-3.2-1.5-4.6-5.2L82 132.2 170 80"/><path fill="#a9c9dd" d="M98 175c3 0 4.3-1.4 6-3l16-15.6-20-12"/><path fill="#fff" d="M100 144.4l48.4 35.7c5.5 3 9.5 1.5 10.9-5.1L179 82.2c2-8.1-3.1-11.7-8.4-9.3L55 117.5c-7.9 3.2-7.8 7.6-1.4 9.5l29.7 9.3L152 93c3.2-2 6.2-.9 3.8 1.3"/></svg>`; };
// Официальный логотип WhatsApp в фирменных цветах
const waLogo = cls => `<svg class="${cls} wa-logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#25D366"/><g transform="translate(4.6 4.6) scale(.617)"><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></g></svg>`;
const icon = (n, cls = 'ico') => n === 'tg' ? tgLogo(cls) : n === 'wa' ? waLogo(cls) : `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${ICONS[n] || ICONS.arrow}</svg>`;

// ---------- переиспользуемые блоки для контента страниц ----------
const groupOf = p => GROUPS.find(g => g.key === p.group);
function card(r, more = 'Подробнее') {
  return `<a class="card" href="${r.path}">${icon(r.icon || (groupOf(r) || {}).icon || 'kb')}<h3>${esc(r.menu || r.h1)}</h3><p>${esc(r.card || r.description)}</p><span class="more">${more} ${icon('arrow', 'ico-sm')}</span></a>`;
}
const B = {
  // карточки «что входит»: [[заголовок, текст], ...]
  grid: (items, cols = 3) => `<div class="cards cards-${cols}">${items.map(([h, t, ic]) => `<div class="card card-static">${ic ? icon(ic) : ''}<h3>${h}</h3><p>${t}</p></div>`).join('')}</div>`,
  // этапы работы: [[заголовок, текст], ...]
  steps: items => `<div class="steps steps-${Math.min(items.length, 4)}">${items.map(([h, t]) => `<div class="step"><h3>${h}</h3><p>${t}</p></div>`).join('')}</div>`,
  checks: items => `<ul class="checklist checklist-lg">${items.map(i => `<li>${i}</li>`).join('')}</ul>`,
  todo: t => `<div class="todo">${t}</div>`,
  prices: name => `<div class="todo">Стоимость и состав тарифов «${name}» — заполняются по вашему прайсу. Без цен Яндекс хуже ранжирует коммерческие страницы, поэтому этот блок обязателен до запуска.</div>`,
  cases: () => `<div class="todo">Примеры работ и результаты клиентов (заявки, рост трафика, скриншоты Метрики) — добавляются по вашим кейсам.</div>`,
  services: g => `<div class="cards cards-3">${svcOf(g).map(s => card(s)).join('')}</div>`,
  allServices: () => GROUPS.map(g => `<div class="svc-group"><h3><a href="${g.path}">${icon(g.icon, 'ico-sm')} ${g.name}</a></h3><ul>${svcOf(g.key).map(s => `<li><a href="${s.path}">${esc(s.menu || s.h1)}</a></li>`).join('')}</ul></div>`).join(''),
  articles: (list, more = 'Читать') => `<div class="cards cards-3">${list.map(a => card(typeof a === 'string' ? byPath[a] : a, more)).join('')}</div>`,
  stat: rows => `<table class="stat"><tr><th>Запрос</th><th>Ищут в месяц</th></tr>${rows.map(([q, n]) => `<tr><td>${q}</td><td>${n}</td></tr>`).join('')}</table><p class="src">Данные Яндекс Вордстата, сентябрь–октябрь 2026.</p>`,
};
function leadForm(service = '') {
  return `<form class="form form-lead" data-lead novalidate>
  ${service ? `<input type="hidden" name="service" value="${esc(service)}">` : ''}
  <div class="form-row"><label>Имя<input name="name" autocomplete="name" required></label>
  <label>Телефон или мессенджер<input name="contact" required></label></div>
  <label>Сайт (если есть)<input name="site" placeholder="https://"></label>
  <label>Задача<textarea name="task" rows="3"></textarea></label>
  <label class="consent"><input type="checkbox" name="consent" required> <span>Даю <a href="/soglasie-na-obrabotku/">согласие на обработку персональных данных</a> в соответствии с <a href="/politika-konfidencialnosti/">Политикой</a>.</span></label>
  <div class="form-actions"><button class="btn" type="submit">Отправить заявку</button><a class="btn btn-ghost-dark" ${tgAttrs}>${icon('tg', 'ico-tg')} Написать в Telegram</a></div>
  <div class="form-msg" role="status"></div>
</form>`;
}

// чип-подпись: ["текст", "/ссылка/"] становится ссылкой на отдельную страницу
const chip = c => Array.isArray(c) ? `<a class="chip" href="${c[1]}">${c[0]}</a>` : `<span class="chip">${c}</span>`;

// ---------- шапка и подвал ----------
function header(p) {
  const cur = p.group || p.city ? 'svc' : p.type === 'article' || p.path === '/baza-znaniy/' ? 'kb' : '';
  const mega = GROUPS.map(g => `<div class="mega-col"><a class="mega-title" href="${g.path}">${icon(g.icon, 'ico-sm')} ${g.name}</a>${svcOf(g.key).slice(0, 6).map(s => `<a href="${s.path}">${esc(s.menu || s.h1)}</a>`).join('')}${svcOf(g.key).length > 6 ? `<a class="mega-all" href="${g.path}">Все услуги раздела (${svcOf(g.key).length}) →</a>` : ''}</div>`).join('');
  const cityLinks = cities.map(c => `<a href="${c.path}">${esc(c.menu)}</a>`).join('');
  const kbLinks = KB_CATS.filter(c => artOf(c).length).map(c => `<a href="/baza-znaniy/#${slug(c)}">${c}</a>`).join('');
  return `<header class="hdr"><div class="wrap hdr-in">
  <a class="logo" href="/" aria-label="I-Guide — на главную"><span class="logo-word"><span class="logo-i">ı<span class="logo-lens"></span></span><span class="logo-dash"></span>guide</span></a>
  <button class="burger" aria-label="Открыть меню" aria-expanded="false"><span></span><span></span><span></span></button>
  <nav class="nav" aria-label="Основное меню"><ul>
    <li class="has-sub has-mega"><a class="nav-link" href="/uslugi/"${cur === 'svc' ? ' aria-current="true"' : ''}>Услуги</a><div class="sub mega">${mega}<a class="mega-sub" href="/podpiska/">${icon('check', 'ico-sm')} Услуги по ежемесячной подписке →</a></div></li>
    <li><a class="nav-link" href="/prodazhi-s-sajta/"${p.path === '/prodazhi-s-sajta/' ? ' aria-current="true"' : ''}>Продажи с сайта</a></li>
    <li><a class="nav-link" href="/ceny/"${p.path === '/ceny/' ? ' aria-current="true"' : ''}>Цены</a></li>
    <li class="has-sub"><a class="nav-link" href="/baza-znaniy/"${cur === 'kb' ? ' aria-current="true"' : ''}>База знаний</a><div class="sub">${kbLinks}</div></li>
    <li class="has-sub"><a class="nav-link" href="/goroda/">Города</a><div class="sub">${cityLinks}</div></li>
    <li><a class="nav-link" href="/kontakty/">Контакты</a></li>
  </ul><a class="hdr-tg" ${tgAttrs} aria-label="Написать в Telegram" title="Написать в Telegram">${icon('tg', 'ico-tg')}</a><a class="hdr-tg hdr-wa" ${waAttrs} aria-label="Написать менеджеру в WhatsApp" title="Написать менеджеру в WhatsApp">${icon('wa', 'ico-tg')}</a><a class="btn btn-sm" href="/konsultaciya/#form">Получить консультацию</a></nav>
</div></header>`;
}

function footer() {
  const col = (title, href, list) => `<div><h3><a href="${href}">${title}</a></h3><ul>${list.map(([n, u]) => `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ul></div>`;
  return `<footer class="ftr"><div class="wrap">
  <div class="ftr-grid">
    <div class="ftr-brand"><a class="logo logo-light" href="/"><span class="logo-word"><span class="logo-i">ı<span class="logo-lens"></span></span><span class="logo-dash"></span>guide</span></a>
      <p>Помогаем бизнесу продавать через интернет: SEO, карты и нейросети, реклама в Яндексе, сайты и репутация.</p>
      <a class="ftr-tg" ${tgAttrs}>${icon('tg', 'ico-sm')} Связь с нами в Telegram</a>
      <a class="ftr-tg" ${waAttrs}>${icon('wa', 'ico-sm')} Менеджер в WhatsApp</a>
      <p class="todo-inline">Контакты и реквизиты — заполняются</p></div>
    ${col('Продвижение', '/uslugi/', ['seo', 'geo', 'ads', 'serm'].flatMap(svcOf).map(s => [s.menu || s.h1, s.path]))}
    ${col('Сайты и продажи', '/uslugi/', ['sites', 'sales', 'audit'].flatMap(svcOf).map(s => [s.menu || s.h1, s.path]))}
    ${col('Города', '/goroda/', cities.map(c => [c.menu, c.path]))}
  </div>
  <div class="ftr-bottom"><span>© ${new Date().getFullYear()} I-Guide</span>
    <a href="/baza-znaniy/">База знаний</a>
    <a href="/ceny/">Цены</a>
    <a href="/podpiska/">Услуги по подписке</a>
    <a href="/doroznaya-karta/">Дорожная карта</a>
    <a href="/politika-konfidencialnosti/">Политика обработки персональных данных</a>
    <a href="/soglasie-na-obrabotku/">Согласие на обработку ПДн</a>
    <a href="/karta-sayta/">Карта сайта</a></div>
</div></footer>`;
}

const TR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ы:'y',э:'e',ю:'yu',я:'ya' };
function slug(s) { return s.toLowerCase().split('').map(c => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function crumbsHtml(p) {
  if (!p.crumbs) return '';
  const items = [['Главная', '/'], ...p.crumbs, [p.menu || p.h1, null]];
  return `<nav class="crumbs" aria-label="Хлебные крошки"><ol>${items.map(([n, u]) =>
    u ? `<li><a href="${u}">${esc(n)}</a></li>` : `<li aria-current="page">${esc(n)}</li>`).join('')}</ol></nav>`;
}
function tocFrom(body) {
  const items = [...body.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)];
  if (items.length < 3) return '';
  return `<nav class="toc" aria-label="Содержание"><div class="toc-title">Содержание</div><ol>${items.map(m =>
    `<li><a href="#${m[1]}">${m[2].replace(/<[^>]+>/g, '').replace(/^\d+\.\s*/, '')}</a></li>`).join('')}</ol></nav>`;
}
function faqHtml(faq) {
  if (!faq || !faq.length) return '';
  return `<section class="faq" id="faq"><h2>Частые вопросы</h2>${faq.map(([q, a]) =>
    `<details><summary>${esc(q)}</summary><div>${a}</div></details>`).join('')}</section>`;
}
function cta() {
  return `<section class="cta-band"><div class="wrap cta-in"><div><h2>Обсудим ваш сайт и продажи</h2><p>Опишите задачу — разберём, какие каналы дадут заявки именно вашему бизнесу.</p></div><a class="btn btn-light" href="/konsultaciya/#form">Получить консультацию ${icon('arrow', 'ico-sm')}</a></div></section>`;
}

// ---------- макеты ----------
function serviceLayout(p, sections) {
  const g = groupOf(p);
  const rel = [...new Set([...articles.filter(a => a.service === p.path).map(a => a.path), ...(p.related || [])])].map(u => byPath[u]).filter(Boolean).slice(0, 6);
  const secs = sections.map(([id, h2, html, intro], i) => `<section class="svc-sec${i % 2 ? ' svc-alt' : ''}" id="${id}"><div class="wrap">
  <div class="sec-head"><h2>${h2}</h2>${intro ? `<p>${intro}</p>` : ''}</div>${html}</div></section>`).join('\n');
  return `<section class="svc-hero"><div class="wrap">${crumbsHtml(p)}
  ${p.city ? '<a class="eyebrow" href="/goroda/">Город</a>' : g ? `<a class="eyebrow" href="${g.path}">${g.name}</a>` : '<span class="eyebrow">Услуги</span>'}${p.sub ? ' <a class="eyebrow eyebrow-sub" href="/podpiska/">Доступно по подписке</a>' : ''}
  <h1>${esc(p.h1)}</h1>${p.lead ? `<p class="lead">${p.lead}</p>` : ''}
  <div class="hero-actions"><a class="btn" href="#zayavka">Оставить заявку ${icon('arrow', 'ico-sm')}</a><a class="btn btn-ghost-dark" ${tgAttrs}>${icon('tg', 'ico-tg')} Написать в Telegram</a></div>
  ${p.chips ? `<div class="hero-chips">${p.chips.map(c => Array.isArray(c) && c[1] === p.path ? chip(c[0]) : chip(c)).join('')}</div>` : ''}
</div></section>
${secs}
${p.faq && p.faq.length ? `<section class="svc-sec"><div class="wrap narrow">${faqHtml(p.faq)}</div></section>` : ''}
${rel.length ? `<section class="svc-sec svc-alt"><div class="wrap"><div class="sec-head"><h2>Полезно почитать</h2><p>Бесплатные материалы из базы знаний I-Guide по этой теме.</p></div>${B.articles(rel)}</div></section>` : ''}
<section class="svc-sec svc-lead" id="zayavka"><div class="wrap lead-in"><div><h2>Оставить заявку</h2><p>Расскажите о бизнесе и задаче — ответим и предложим, с чего начать.</p></div>${leadForm(p.h1)}</div></section>`;
}

function articleSidebar(p) {
  const same = artOf(p.kbCat).filter(a => a.path !== p.path).slice(0, 8);
  const svc = byPath[p.service];
  return `<aside class="side">
  ${svc ? `<div class="side-cta"><b>${esc(svc.menu || svc.h1)}</b><p>${esc(svc.card || 'Сделаем под ключ — с ориентацией на заявки и продажи.')}</p><a class="btn btn-sm" href="${svc.path}">Подробнее об услуге</a></div>` : ''}
  <div class="side-box"><div class="side-title"><a href="/baza-znaniy/#${slug(p.kbCat)}">${p.kbCat}</a></div><ul>${same.map(x => `<li><a href="${x.path}">${esc(x.menu || x.h1)}</a></li>`).join('')}</ul></div>
</aside>`;
}

function render(p) {
  const ctx = { waAttrs, chip, pages, byPath, services, articles, cities, card, icon, esc, B, GROUPS, KB_CATS, svcOf, artOf, slug, leadForm, site, tgAttrs };
  let main;
  if (p.type === 'home' || p.type === 'raw') {
    main = typeof p.body === 'function' ? p.body(ctx) : p.body;
  } else if (p.type === 'service') {
    main = serviceLayout(p, typeof p.sections === 'function' ? p.sections(ctx) : p.sections);
  } else {
    const body = typeof p.body === 'function' ? p.body(ctx) : p.body;
    const isArticle = p.type === 'article';
    const side = isArticle ? articleSidebar(p) : '';
    const rel = (p.related || []).map(u => byPath[u]).filter(Boolean);
    main = `<section class="page-hero"><div class="wrap">${crumbsHtml(p)}<h1>${esc(p.h1)}</h1>${p.lead ? `<p class="lead">${p.lead}</p>` : ''}${isArticle ? `<div class="meta">Обновлено: ${p.updated || site.updated}</div>` : ''}</div></section>
<div class="wrap layout${side ? '' : ' layout-full'}">
  <article class="content">${isArticle ? tocFrom(body) : ''}${body}${faqHtml(p.faq)}</article>
  ${side}
</div>${rel.length ? `<div class="wrap"><section class="related"><h2>Читайте также</h2>${B.articles(rel)}</section></div>` : ''}`;
  }
  const isArticle = p.type === 'article';

  return `<!doctype html>
<html lang="ru" data-anim="${site.anim}"${site.designLab ? ' data-lab' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${abs(p.path)}">
${p.noindex ? '<meta name="robots" content="noindex, follow">' : ''}
<meta property="og:type" content="${isArticle ? 'article' : 'website'}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${abs(p.path)}">
<meta property="og:locale" content="ru_RU">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css?v=${V}">
<link rel="stylesheet" href="/assets/style-iguide.css?v=${V}">
<link rel="preload" href="/assets/fonts/nunito-sans-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
${site.designLab ? `<link rel="stylesheet" href="/assets/themes.css?v=${V}">
<script>(function(){var r=document.documentElement;try{var p=new URLSearchParams(location.search).get('palette')||localStorage.getItem('ig-palette');if(p)r.setAttribute('data-palette',p);var a=localStorage.getItem('ig-anim');if(a!==null)r.setAttribute('data-anim',a);var c=JSON.parse(localStorage.getItem('ig-custom')||'{}');for(var k in c)r.style.setProperty(k,c[k])}catch(e){}})()</script>` : ''}
${schema(p)}
</head>
<body class="t-${p.type}">
${header(p)}
<main id="main">${main}</main>
${p.noCta || p.type === 'service' ? '' : cta()}
<div class="float-contacts"><a class="wa-float" ${waAttrs} aria-label="Написать менеджеру в WhatsApp" title="Менеджер в WhatsApp">${icon('wa', 'ico-tg')}</a><a class="tg-float" ${tgAttrs} aria-label="Связь с нами в Telegram">${icon('tg', 'ico-tg')}<span>Связь с нами</span></a></div>
${footer()}
<script src="/assets/main.js?v=${V}" defer></script>
</body>
</html>`;
}

// ---------- JSON-LD ----------
function schema(p) {
  const graph = [];
  const org = { '@type': 'Organization', '@id': abs('/#org'), name: site.name, url: abs('/'), ...(tgUrl ? { sameAs: [tgUrl] } : {}) };
  if (p.path === '/') graph.push(org, { '@type': 'WebSite', '@id': abs('/#site'), name: site.name, url: abs('/'), inLanguage: 'ru-RU', publisher: { '@id': abs('/#org') } });
  if (p.crumbs) {
    const items = [['Главная', '/'], ...p.crumbs, [p.menu || p.h1, p.path]];
    graph.push({ '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: abs(u) })) });
  }
  if (p.type === 'article') graph.push({ '@type': 'Article', headline: p.h1, description: p.description, inLanguage: 'ru-RU', mainEntityOfPage: abs(p.path), dateModified: p.updated || site.updated, author: { '@id': abs('/#org') }, publisher: { '@id': abs('/#org') } });
  if (p.type === 'service') graph.push({ '@type': 'Service', name: p.h1, description: p.description, url: abs(p.path), provider: { '@type': 'Organization', name: site.name, url: abs('/') }, areaServed: p.city ? { '@type': 'City', name: p.city } : { '@type': 'Country', name: 'Россия' } });
  if (p.faq && p.faq.length) graph.push({ '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
  if (!graph.length) return '';
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

// ---------- сборка ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
const seen = new Set();
for (const p of pages) {
  const key = p.path + (p.file || '');
  if (seen.has(key)) throw new Error('Дубль адреса: ' + p.path);
  seen.add(key);
  for (const u of p.related || []) if (!byPath[u]) console.warn('⚠ битая ссылка в related:', p.path, '→', u);
  if (p.service && !byPath[p.service]) console.warn('⚠ нет услуги для статьи:', p.path, '→', p.service);
  const dir = path.join(OUT, p.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, p.file || 'index.html'), render(p));
}
// проверка внутренних ссылок во всех собранных страницах
const known = new Set(pages.filter(p => !p.file).map(p => p.path));
let broken = 0;
for (const p of pages) {
  const html = fs.readFileSync(path.join(OUT, p.path, p.file || 'index.html'), 'utf8');
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const u = m[1];
    if (u.startsWith('/assets/') || u === '/sitemap.xml') continue;
    if (!known.has(u)) { broken++; if (broken < 30) console.warn('⚠ битая ссылка:', p.path, '→', u); }
  }
}
const indexable = pages.filter(p => !p.noindex && !p.file);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map(p => `  <url><loc>${abs(p.path)}</loc><lastmod>${p.updated || site.updated}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *
Disallow: /*?utm_
Disallow: /*?yclid=
Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&from

Sitemap: ${abs('/sitemap.xml')}
`);
console.log(`Собрано страниц: ${pages.length} (услуг ${services.length}, городов ${cities.length}, статей ${articles.length}) → dist/${broken ? ` · битых ссылок: ${broken}` : ''}`);
