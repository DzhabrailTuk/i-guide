module.exports = {
  path: '/',
  type: 'home',
  title: 'Продвижение и создание сайтов для роста продаж — SEO, Яндекс Директ, Карты | I-Guide',
  description: 'I-Guide — помощники в продажах. SEO-продвижение сайтов в Яндексе и Google, продвижение на Яндекс Картах и в нейросетях, настройка Яндекс Директ, создание сайтов, SERM и аудит. Самара, Казань, Поволжье и вся Россия.',
  h1: 'Продвижение и создание сайтов, которые приносят продажи',
  body: ({ icon, B, cities, byPath }) => `
<section class="hero"><div class="wrap">
  <div class="tagline tagline-a"><span class="tl-main"><span class="tl-brand">I-Guide</span> — твой помощник в оптимизации продающего сайта</span><span class="tl-sub">Помогаем продавать через поисковые запросы</span></div>
  <h1>Продвижение и создание сайтов, <em>которые приносят продажи</em></h1>
  <p class="lead">Выводим сайты в топ Яндекса и Google по запросам, которые вводят готовые купить клиенты, создаём продающие сайты, настраиваем Яндекс Директ, карты и репутацию. Результат считаем в заявках и продажах.</p>
  <div class="hero-actions">
    <a class="btn" href="/audit-sayta/besplatnyj/">Бесплатный аудит сайта ${icon('arrow', 'ico-sm')}</a>
    <a class="btn btn-ghost" href="/konsultaciya/#form">Получить консультацию</a>
  </div>
  <p class="hero-hint">Не знаете, с чего начать? <a href="/doroznaya-karta/">Посмотрите дорожную карту — от идеи сайта до продаж →</a></p>
  <div class="hero-chips"><a class="chip" href="/seo-prodvizhenie/">SEO-продвижение</a><a class="chip" href="/prodvizhenie-na-yandex-kartah/">Яндекс Карты</a><a class="chip" href="/geo-prodvizhenie/">GEO в нейросетях</a><a class="chip" href="/nastrojka-yandex-direct/">Яндекс Директ</a><a class="chip" href="/sozdanie-saytov/">Создание сайтов</a><a class="chip" href="/serm/">SERM</a><a class="chip" href="/audit-sayta/">Аудит сайта</a><a class="chip" href="/podpiska/">Подписка</a></div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head"><div class="kicker">Направления</div><h2>Чем занимается I-Guide</h2><p>Всё, что нужно, чтобы бизнес получал клиентов из интернета, — в одной команде.</p></div>
  <div class="cards cards-3">
    <a class="card card-main" href="/seo-prodvizhenie/"><span class="badge">Главное направление</span>${icon('seo')}<h3>SEO-продвижение сайтов</h3><p>Продвижение и раскрутка сайта в топ Яндекса и Google по коммерческим запросам. Техническая и SEO-оптимизация, контент, коммерческие факторы и отчёт по заявкам.</p><span class="more">Подробнее ${icon('arrow', 'ico-sm')}</span></a>
    ${['/prodvizhenie-na-yandex-kartah/', '/geo-prodvizhenie/', '/nastrojka-yandex-direct/', '/sozdanie-saytov/', '/prodazhi-s-sajta/', '/serm/', '/audit-sayta/'].map(u => { const s = byPath[u]; return `<a class="card" href="${s.path}">${icon(s.icon)}<h3>${s.menu}</h3><p>${s.card}</p><span class="more">Подробнее ${icon('arrow', 'ico-sm')}</span></a>`; }).join('')}
  </div>
</div></section>

<section class="sec sec-alt"><div class="wrap">
  <div class="sec-head"><div class="kicker">Подход</div><h2>Сайт — главный источник заказов</h2><p>Для многих компаний коммерческий сайт приносит большую часть заказов. Мы выстраиваем систему, в которой сайт находят покупатели, он убеждает и превращает посетителей в заявки.</p></div>
  <div class="formula"><div><b>Посетители</b><span>из поиска, карт, нейросетей, рекламы</span></div><i>×</i><div><b>Конверсия</b><span>доля посетителей, оставивших заявку</span></div><i>×</i><div><b>Обработка</b><span>сколько заявок стали продажами</span></div><i>=</i><div class="formula-res"><b>Продажи</b><span>деньги с сайта</span></div></div>
  <p style="margin-top:28px"><a class="btn btn-light" href="/prodazhi-s-sajta/">Как мы увеличиваем продажи через сайт ${icon('arrow', 'ico-sm')}</a></p>
</div></section>

<div class="brand-band" aria-hidden="true"><span class="bb-word">I-Guide</span></div>

<section class="sec"><div class="wrap">
  <div class="sec-head"><div class="kicker">Дорожная карта</div><h2>Путь от идеи сайта до продаж</h2><p>Бизнес готов платить за продвижение, когда понимает, откуда возьмутся продажи. Вот весь путь — от первой мысли о сайте до заявок из поиска.</p></div>
  <div class="rm-teaser"><a href="/doroznaya-karta/"><span>1</span><b>Идея</b><small>нужен сайт для заявок</small></a><a href="/doroznaya-karta/"><span>2</span><b>Подбор формата</b><small>лендинг, магазин, корпоративный</small></a><a href="/doroznaya-karta/"><span>3</span><b>Семантика</b><small>что ищут ваши клиенты</small></a><a href="/doroznaya-karta/"><span>4</span><b>Сборка и SEO</b><small>страницы, H1, title, description</small></a><a href="/doroznaya-karta/"><span>5</span><b>Запуск</b><small>домен, хостинг, индексация</small></a><a href="/doroznaya-karta/"><span>6</span><b>Продвижение</b><small>SEO, GEO, Директ, ссылки</small></a></div>
  <a class="btn" href="/doroznaya-karta/">Открыть дорожную карту ${icon('arrow', 'ico-sm')}</a>
</div></section>

<section class="sec sec-alt"><div class="wrap">
  <div class="sec-head"><div class="kicker">Все услуги</div><h2>Услуги для роста продаж</h2></div>
  <div class="svc-groups">${B.allServices()}</div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head"><div class="kicker">База знаний</div><h2>Бесплатно: как развивать сайт самостоятельно</h2><p>Пошаговые материалы для тех, кто хочет разобраться сам.</p></div>
  ${B.articles(['/baza-znaniy/chto-takoe-seo/', '/baza-znaniy/kak-dobavit-organizaciyu-na-yandex-karty/', '/baza-znaniy/semanticheskoe-yadro/', '/baza-znaniy/chto-takoe-geo/', '/baza-znaniy/vidy-sajtov/', '/baza-znaniy/shtrafy-dlya-sajtov/'])}
  <p style="margin-top:24px"><a class="btn btn-light" href="/baza-znaniy/">Вся база знаний ${icon('arrow', 'ico-sm')}</a></p>
</div></section>

<section class="sec sec-alt"><div class="wrap">
  <div class="sec-head"><div class="kicker">География</div><h2>Работаем по всей России</h2><p>Основное направление — Поволжье.</p></div>
  <div class="city-chips">${cities.map(c => `<a class="city-chip" href="${c.path}">${icon('geo', 'ico-sm')} ${c.menu}</a>`).join('')}</div>
</div></section>

<section class="sec"><div class="wrap audit-promo">
  <div><div class="kicker">Бесплатно</div><h2>Экспресс-аудит вашего сайта</h2><p>Пришлите ссылку — покажем главные проблемы, которые мешают продвижению и заявкам, и подскажем, с чего начать.</p></div>
  <a class="btn" href="/audit-sayta/besplatnyj/">Получить бесплатный аудит ${icon('arrow', 'ico-sm')}</a>
</div></section>
`,
};
