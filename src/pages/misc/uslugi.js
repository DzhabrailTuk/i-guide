const plural = n => n % 10 === 1 && n % 100 !== 11 ? 'услуга' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'услуги' : 'услуг';

module.exports = {
  path: '/uslugi/',
  type: 'hub',
  title: 'Услуги I-Guide: SEO, GEO, Яндекс Директ, создание сайтов, SERM, аудит',
  description: 'Все услуги I-Guide для роста продаж: SEO-продвижение, продвижение на Яндекс Картах и в нейросетях, Яндекс Директ, лидогенерация, создание сайтов, SERM и аудит сайта.',
  h1: 'Услуги I-Guide',
  lead: 'Всё, что нужно, чтобы бизнес получал заявки и продажи из интернета: от сайта до продвижения, рекламы и репутации.',
  crumbs: [],
  // Каталог: каждая группа — раскрывающийся список компактных карточек
  body: ({ GROUPS, svcOf, icon, esc }) => `
<div class="cat-tools"><button type="button" class="cat-toggle-all" data-open="0">Раскрыть все разделы</button></div>
<div class="cat">${GROUPS.map((g, i) => {
    const list = svcOf(g.key);
    return `<details class="cat-group" id="${g.key}"${i === 0 ? ' open' : ''}>
  <summary><span class="cat-ico">${icon(g.icon)}</span><span class="cat-name">${g.name}</span><span class="cat-count">${list.length} ${plural(list.length)}</span><span class="cat-arrow" aria-hidden="true"></span></summary>
  <div class="cat-list">${list.map(s => `<a class="cat-item" href="${s.path}"><b>${esc(s.menu || s.h1)}</b><span>${esc(s.card || s.description)}</span></a>`).join('')}</div>
  <a class="cat-hub" href="${g.path}">Все об услугах раздела «${g.name}» ${icon('arrow', 'ico-sm')}</a>
</details>`;
  }).join('')}</div>`,
};
