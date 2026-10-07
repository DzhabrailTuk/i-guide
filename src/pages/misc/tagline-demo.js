// Временная страница сравнения вариантов плашки (удалить после выбора)
const t = v => `<div class="tagline tagline-${v}"><span class="tl-main"><span class="tl-brand">I-Guide</span> — твой помощник в оптимизации продающего сайта</span><span class="tl-sub">Помогаем продавать через поисковые запросы</span></div>`;
module.exports = {
  path: '/dizayn/plashka/', type: 'page', noindex: true, noCta: true,
  title: 'Варианты плашки — I-Guide', description: 'Сравнение вариантов плашки на главной странице.',
  h1: 'Варианты плашки «кто мы»', crumbs: [],
  body: `${['a', 'b', 'c'].map((v, i) => `<h2 id="v${v}">Вариант ${i + 1}</h2><div class="demo-hero">${t(v)}<div class="demo-h1">Продвижение и создание сайтов, <em>которые приносят продажи</em></div></div>`).join('')}`,
};
