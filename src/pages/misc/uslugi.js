module.exports = {
  path: '/uslugi/',
  type: 'hub',
  title: 'Услуги I-Guide: SEO, GEO, Яндекс Директ, создание сайтов, SERM, аудит',
  description: 'Все услуги I-Guide для роста продаж: SEO-продвижение, продвижение на Яндекс Картах и в нейросетях, Яндекс Директ, лидогенерация, создание сайтов, SERM и аудит сайта.',
  h1: 'Услуги I-Guide',
  lead: 'Всё, что нужно, чтобы бизнес получал заявки и продажи из интернета: от сайта до продвижения, рекламы и репутации.',
  crumbs: [],
  body: ({ GROUPS, svcOf, card }) => GROUPS.map(g => `<h2 id="${g.key}"><a href="${g.path}">${g.name}</a></h2><div class="cards cards-2">${svcOf(g.key).map(s => card(s)).join('')}</div>`).join(''),
};
