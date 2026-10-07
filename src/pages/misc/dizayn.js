// Служебная страница подбора дизайна (noindex). Удаляется перед публикацией.
const COMP = [
  ['Ingate', 'ingate.ru', 'Montserrat', ['#fce300', '#1a222d', '#313896', '#ed6747'], 'Жёлтый + тёмный графит, синий акцент'],
  ['Demis Group', 'demis.ru', 'Manrope / системный', ['#be1116', '#94090d', '#333333', '#f1f1f1'], 'Красный'],
  ['Kokoc Group', 'kokoc.com', 'Museo', ['#df2926', '#101010', '#707070', '#fff6f6'], 'Красный + чёрный'],
  ['Ашманов и партнёры', 'ashmanov.com', 'Vela Sans', ['#da0812', '#17181b', '#f6f8f9', '#edf4f5'], 'Красный + почти белый'],
  ['SEO.RU', 'seo.ru', 'Gotham Pro', ['#72be54', '#54ba3d', '#333333', '#f24235'], 'Зелёный'],
  ['Пиксель Плюс', 'pixelplus.ru', 'Ubuntu', ['#bd0a13', '#00bbff', '#333333', '#f5f5f5'], 'Красный + голубой'],
  ['Rush Agency', 'rush-agency.ru', 'Roboto / Open Sans / Inter', ['#ff2241', '#222222', '#575757', '#dededf'], 'Красный'],
  ['Webit', 'webit.ru', 'системный', ['#ee5e3e', '#374151', '#111111', '#f8f8f8'], 'Оранжево-красный'],
];
const PAL = [['indigo', 'Индиго (текущая)', 'Яркая, «технологичная». Ближе к IT-продуктам.'],
  ['mint', 'Мята и графит', 'Спокойная, ассоциируется с ростом и деньгами. Ни у кого из конкурентов.'],
  ['ocean', 'Океан', 'Синий — цвет доверия; классика для B2B-услуг. Свободен в нише.'],
  ['sage', 'Шалфей и песок', 'Тёплая, «премиальная», мягкая для глаз — хорошо для длинных статей.'],
  ['lavender', 'Мягкая лаванда', 'Смягчённая версия текущей: тот же характер, но нежнее.']];

const mock = (k) => `
<div data-palette="${k}" style="border-radius:16px;overflow:hidden;border:1px solid var(--line);background:var(--bg)">
  <div style="background:var(--ink);padding:22px;position:relative;overflow:hidden">
    <div style="position:absolute;right:-60px;top:-60px;width:200px;height:200px;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 55%,transparent),transparent 65%)"></div>
    <div style="position:relative;color:#fff;font:700 20px/1.2 var(--font-head)">SEO и GEO-продвижение <span style="background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent">для продаж</span></div>
    <div style="position:relative;color:var(--on-ink);font-size:13px;margin:8px 0 14px">Поиск, карты и реклама — в одной системе</div>
    <span style="position:relative;display:inline-block;background:var(--grad);color:#fff;border-radius:999px;padding:8px 16px;font-size:13px;font-weight:600">Получить консультацию</span>
  </div>
  <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px"><div style="width:28px;height:28px;border-radius:9px;background:var(--accent-soft);margin-bottom:8px"></div><div style="font-weight:650;color:var(--ink);font-size:14px">Аудит сайта</div><div style="color:var(--muted);font-size:12px">Без штрафов</div></div>
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px"><div style="width:28px;height:28px;border-radius:9px;background:var(--accent-soft);margin-bottom:8px"></div><div style="font-weight:650;color:var(--ink);font-size:14px">База знаний</div><div style="color:var(--accent);font-size:12px;font-weight:600">Читать →</div></div>
  </div>
</div>`;

module.exports = {
  path: '/dizayn/',
  type: 'page', noindex: true, noCta: true,
  title: 'Подбор дизайна — I-Guide',
  description: 'Сравнение палитр и шрифтов для сайта I-Guide с конкурентами.',
  h1: 'Подбор дизайна: цвета',
  lead: 'Что используют конкуренты и как варианты будут выглядеть на сайте I-Guide. Выбранный вариант можно сразу посмотреть на любой странице через панель «Подбор цвета» внизу справа.',
  crumbs: [],
  body: `
<h2 id="konkurenty">Что у конкурентов</h2>
<p>Цвета и шрифты сняты со стилей главных страниц SEO-агентств из выдачи Яндекса.</p>
<table>
<tr><th>Компания</th><th>Шрифт</th><th>Основные цвета</th><th>Характер</th></tr>
${COMP.map(([n, u, f, cs, d]) => `<tr><td><b>${n}</b><br><span style="color:var(--muted);font-size:13px">${u}</span></td><td>${f}</td><td>${cs.map(c => `<span title="${c}" style="display:inline-block;width:26px;height:26px;border-radius:7px;background:${c};border:1px solid rgba(0,0,0,.08);margin-right:4px;vertical-align:middle"></span>`).join('')}</td><td>${d}</td></tr>`).join('')}
</table>
<div class="note"><p><b>Вывод:</b> 6 из 8 агентств используют красный, остальные — жёлтый и зелёный. Синие, мятные и тёплые природные оттенки в нише свободны: в них I-Guide будет заметно отличаться в выдаче и рекламе. Шрифты у конкурентов в основном платные (Museo, Vela Sans, Gotham Pro) или очень распространённые (Montserrat, Roboto).</p></div>

<h2 id="palitry">Палитры на сайте I-Guide</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;margin-bottom:1.4em">
${PAL.map(([k, n, d]) => `<div>${mock(k)}<p style="margin:10px 0 0"><b>${n}</b><br><span style="color:var(--muted);font-size:15px">${d}</span></p><button class="btn btn-sm" style="margin-top:8px" onclick="localStorage.setItem('ig-palette','${k}');location.href='/'">Посмотреть на сайте</button></div>`).join('')}
</div>

<h2 id="shrift">Шрифт</h2>
<p>Выбран <b>Nunito Sans</b> — подключён с нашего сервера (без Google Fonts), полная кириллица.</p>
`,
};
