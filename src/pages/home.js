// Главная: только главное + ссылки на каталоги, где собрана подробная информация
const GROUP_TEXT = {
  seo: 'Продвижение сайта в топ Яндекса и Google по запросам покупателей: сайты услуг, магазины, лендинги, новые сайты.',
  geo: 'Яндекс Карты, Яндекс Бизнес, 2ГИС — и продвижение в ответах нейросетей: Алиса, Нейро, ChatGPT.',
  ads: 'Яндекс Директ, РСЯ, ретаргетинг: заявки с первого дня, настройка, ведение и аудит кампаний.',
  sales: 'Лидогенерация, конверсия, Яндекс Метрика и сквозная аналитика — видно, что приносит деньги.',
  sites: 'Сайты под ключ — от лендинга до интернет-магазина, а также доработка, редизайн и техподдержка.',
  serm: 'Отзывы на картах, мониторинг упоминаний и работа с негативом — репутация, которая продаёт.',
  audit: 'SEO-аудит, юзабилити, проверка на 152-ФЗ и бесплатный экспресс-аудит вашего сайта.',
};
const plural = n => n % 10 === 1 && n % 100 !== 11 ? 'услуга' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'услуги' : 'услуг';
const pluralA = n => n % 10 === 1 && n % 100 !== 11 ? 'статья' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'статьи' : 'статей';

module.exports = {
  path: '/',
  type: 'home',
  title: 'Продвижение и создание сайтов для роста продаж — SEO, Яндекс Директ, Карты | I-Guide',
  description: 'I-Guide — помощники в продажах. SEO-продвижение сайтов в Яндексе и Google, продвижение на Яндекс Картах и в нейросетях, настройка Яндекс Директ, создание сайтов, SERM и аудит. Самара, Казань, Поволжье и вся Россия.',
  h1: 'Продвижение и создание сайтов, которые приносят продажи',
  body: ({ icon, GROUPS, svcOf, articles, cities, services }) => {
    const [main, ...rest] = GROUPS;
    const groupCard = (g, isMain) => `<a class="card${isMain ? ' card-main' : ''}" href="${g.path}">${isMain ? '<span class="badge">Главное направление</span>' : ''}${icon(g.icon)}<h3>${g.name}</h3><p>${GROUP_TEXT[g.key]}</p><span class="more">${svcOf(g.key).length} ${plural(svcOf(g.key).length)} в каталоге ${icon('arrow', 'ico-sm')}</span></a>`;
    const subCount = services.filter(s => s.sub).length;
    return `
<section class="hero"><div class="wrap">
  <div class="tagline tagline-a"><span class="tl-main"><span class="tl-brand">I-Guide</span> — твой помощник в оптимизации продающего сайта</span><span class="tl-sub">Помогаем продавать через поисковые запросы</span></div>
  <h1>Продвижение и создание сайтов, <em>которые приносят продажи</em></h1>
  <p class="lead">Выводим сайты в топ Яндекса и Google по запросам, которые вводят готовые купить клиенты, создаём продающие сайты, настраиваем Яндекс Директ, карты и репутацию. Результат считаем в заявках и продажах.</p>
  <div class="hero-actions">
    <a class="btn" href="/audit-sayta/besplatnyj/">Бесплатный аудит сайта ${icon('arrow', 'ico-sm')}</a>
    <a class="btn btn-ghost" href="/konsultaciya/#form">Получить консультацию</a>
  </div>
  <p class="hero-hint">Не знаете, с чего начать? <a href="/doroznaya-karta/">Посмотрите дорожную карту — от идеи сайта до продаж →</a></p>
  <div class="hero-chips">${GROUPS.map(g => `<a class="chip" href="${g.path}">${g.name}</a>`).join('')}<a class="chip" href="/podpiska/">Подписка</a></div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head"><div class="kicker">Каталог услуг</div><h2>Чем занимается I-Guide</h2><p>Семь направлений — всё, чтобы бизнес получал клиентов из интернета. В каждом каталоге — подробно об услугах, этапах и цифрах спроса.</p></div>
  <div class="cards cards-3">
    ${groupCard(main, true)}
    ${rest.map(g => groupCard(g)).join('')}
    <a class="card card-all" href="/uslugi/">${icon('kb')}<h3>Все услуги</h3><p>Полный список: все ${services.length} ${plural(services.length)} I-Guide на одной странице.</p><span class="more">Открыть каталог ${icon('arrow', 'ico-sm')}</span></a>
  </div>
</div></section>

<section class="sec sec-alt"><div class="wrap">
  <div class="sec-head"><div class="kicker">Подход</div><h2>Сайт — главный источник заказов</h2><p>Для многих компаний коммерческий сайт приносит большую часть заказов. Мы выстраиваем систему, в которой сайт находят покупатели, он убеждает и превращает посетителей в заявки.</p></div>
  <div class="formula"><div><b>Посетители</b><span>из поиска, карт, нейросетей, рекламы</span></div><i>×</i><div><b>Конверсия</b><span>доля посетителей, оставивших заявку</span></div><i>×</i><div><b>Обработка</b><span>сколько заявок стали продажами</span></div><i>=</i><div class="formula-res"><b>Продажи</b><span>деньги с сайта</span></div></div>
  <p class="home-more"><a class="btn btn-light" href="/prodazhi-s-sajta/">Как мы увеличиваем продажи через сайт ${icon('arrow', 'ico-sm')}</a></p>
</div></section>

<div class="brand-band" aria-hidden="true"><div class="bb-stick"><span class="bb-word">I-Guide</span></div></div>

<section class="sec"><div class="wrap">
  <div class="sec-head"><div class="kicker">Дорожная карта</div><h2>Путь от идеи сайта до продаж</h2><p>Бизнес готов платить за продвижение, когда понимает, откуда возьмутся продажи. Вот весь путь — от первой мысли о сайте до заявок из поиска.</p></div>
  <div class="rm-teaser"><a href="/doroznaya-karta/"><span>1</span><b>Идея</b><small>нужен сайт для заявок</small></a><a href="/doroznaya-karta/"><span>2</span><b>Подбор формата</b><small>лендинг, магазин, корпоративный</small></a><a href="/doroznaya-karta/"><span>3</span><b>Семантика</b><small>что ищут ваши клиенты</small></a><a href="/doroznaya-karta/"><span>4</span><b>Сборка и SEO</b><small>страницы, H1, title, description</small></a><a href="/doroznaya-karta/"><span>5</span><b>Запуск</b><small>домен, хостинг, индексация</small></a><a href="/doroznaya-karta/"><span>6</span><b>Продвижение</b><small>SEO, GEO, Директ, ссылки</small></a></div>
  <a class="btn" href="/doroznaya-karta/">Открыть дорожную карту ${icon('arrow', 'ico-sm')}</a>
</div></section>

<section class="sec sec-alt"><div class="wrap">
  <div class="sec-head"><div class="kicker">Ещё разделы</div><h2>Всё остальное — в каталогах</h2><p>Бесплатные материалы, города, подписка и цены — в отдельных разделах.</p></div>
  <div class="cards cards-4">
    <a class="card" href="/baza-znaniy/">${icon('kb')}<h3>База знаний</h3><p>Как развивать сайт самостоятельно: SEO, карты, реклама, продажи, закон.</p><span class="more">${articles.length} ${pluralA(articles.length)} ${icon('arrow', 'ico-sm')}</span></a>
    <a class="card" href="/goroda/">${icon('geo')}<h3>Города</h3><p>Работаем по всей России, основное направление — Поволжье: ${cities.map(c => c.menu).join(', ')}.</p><span class="more">${cities.length} городов ${icon('arrow', 'ico-sm')}</span></a>
    <a class="card" href="/podpiska/">${icon('check')}<h3>Услуги по подписке</h3><p>Продвижение и поддержка каждый месяц: фиксированная оплата и отчёт по заявкам.</p><span class="more">${subCount} ${plural(subCount)} ${icon('arrow', 'ico-sm')}</span></a>
    <a class="card" href="/ceny/">${icon('price')}<h3>Цены</h3><p>Стоимость продвижения, рекламы, создания и поддержки сайтов.</p><span class="more">Смотреть цены ${icon('arrow', 'ico-sm')}</span></a>
  </div>
</div></section>

<section class="sec"><div class="wrap audit-promo">
  <div><div class="kicker">Бесплатно</div><h2>Экспресс-аудит вашего сайта</h2><p>Пришлите ссылку — покажем главные проблемы, которые мешают продвижению и заявкам, и подскажем, с чего начать.</p></div>
  <a class="btn" href="/audit-sayta/besplatnyj/">Получить бесплатный аудит ${icon('arrow', 'ico-sm')}</a>
</div></section>
`;
  },
};
