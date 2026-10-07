module.exports = {
  path: '/karta-sayta/',
  type: 'page',
  title: 'Карта сайта I-Guide',
  description: 'Карта сайта I-Guide: все услуги по продвижению и созданию сайтов, страницы городов и статьи базы знаний по SEO, продажам и рекламе.',
  h1: 'Карта сайта',
  crumbs: [],
  body: ({ GROUPS, svcOf, KB_CATS, artOf, cities, esc }) => {
    const ul = list => `<ul>${list.map(p => `<li><a href="${p.path}">${esc(p.h1)}</a></li>`).join('')}</ul>`;
    return `<h2><a href="/uslugi/">Услуги</a></h2>${GROUPS.map(g => `<h3>${g.name}</h3>${ul(svcOf(g.key))}`).join('')}
<h2><a href="/goroda/">Города</a></h2>${ul(cities)}
<h2><a href="/baza-znaniy/">База знаний</a></h2>${KB_CATS.filter(c => artOf(c).length).map(c => `<h3>${c}</h3>${ul(artOf(c))}`).join('')}
<h2>Компания</h2><ul><li><a href="/ceny/">Цены</a></li><li><a href="/konsultaciya/">Консультация</a></li><li><a href="/kontakty/">Контакты</a></li></ul>`;
  },
};
