// Дорожная карта клиента: от идеи сайта до продаж. Два маршрута: «сайта нет» и «сайт уже есть».
const NEW = [
  { phase: 'Идея', title: 'Вы понимаете, что бизнесу нужен сайт', text: 'Хочется получать заявки из интернета, а не только по сарафанному радио. Пока непонятно, какой сайт нужен и с чего начать — это нормально.', links: [['Что такое сайт', '/baza-znaniy/chto-takoe-sajt/'], ['Сайт — главный источник заказов', '/prodazhi-s-sajta/']] },
  { phase: 'Идея', title: 'Вы оставляете запрос', text: 'Пишете нам в Telegram или оставляете заявку. Не нужно готовить техническое задание — достаточно рассказать о бизнесе.', links: [['Консультация', '/konsultaciya/'], ['Бесплатный аудит', '/audit-sayta/besplatnyj/']] },
  { phase: 'Подготовка', title: 'Разбираемся, какой сайт вам нужен', text: 'Выясняем, для чего сайт, кто ваши клиенты, что вы продаёте. И подбираем формат: лендинг, сайт-визитка, корпоративный сайт, каталог, интернет-магазин или маркетплейс.', links: [['Виды сайтов', '/baza-znaniy/vidy-sajtov/'], ['Лендинг', '/sozdanie-saytov/lending/'], ['Интернет-магазин', '/sozdanie-saytov/internet-magazin/'], ['Корпоративный сайт', '/sozdanie-saytov/korporativnyj-sajt/']] },
  { phase: 'Подготовка', title: 'Собираем семантическое ядро', text: 'В Яндекс Вордстате смотрим, что и как ищут ваши клиенты. Группируем запросы — так становится понятно, сколько страниц нужно сайту и о чём каждая.', links: [['Семантическое ядро', '/baza-znaniy/semanticheskoe-yadro/'], ['Ключевые слова', '/baza-znaniy/klyuchevye-slova-dlya-sajta/']] },
  { phase: 'Создание', title: 'Собираем сайт по страницам', text: 'Под каждую группу запросов — своя страница. Прописываем заголовок H1, title и description, тексты, цены, формы заявок. Сайт сразу готов к продвижению.', links: [['Мета-теги и H1', '/baza-znaniy/meta-tegi-title-description/'], ['Продающий сайт', '/sozdanie-saytov/prodayushchij-sajt/'], ['Создание сайтов', '/sozdanie-saytov/']] },
  { phase: 'Запуск', title: 'Домен, хостинг и публикация', text: 'Оплачиваете домен и хостинг — подскажем, какие выбрать. Выкладываем сайт, подключаем защищённое соединение и документы по закону о персональных данных.', links: [['Что такое домен и хостинг', '/baza-znaniy/chto-takoe-sajt/'], ['152-ФЗ для сайта', '/baza-znaniy/152-fz-dlya-sajta/']] },
  { phase: 'Запуск', title: 'Индексация в Яндексе и Google', text: 'Добавляем сайт в Яндекс Вебмастер и Google Search Console, отправляем карту сайта — и страницы начинают появляться в поиске. Подключаем Яндекс Метрику, чтобы видеть заявки.', links: [['Индексация сайта', '/baza-znaniy/indeksaciya-sajta/'], ['Яндекс Метрика', '/nastrojka-yandex-metriki/']] },
  { phase: 'Продвижение', title: 'SEO и GEO-продвижение', text: 'Выводим сайт в топ по запросам покупателей, добавляем компанию на Яндекс Карты, работаем над ответами нейросетей. Для заявок «прямо сейчас» — Яндекс Директ.', links: [['SEO-продвижение', '/seo-prodvizhenie/'], ['Яндекс Карты', '/prodvizhenie-na-yandex-kartah/'], ['GEO в нейросетях', '/geo-prodvizhenie/'], ['Яндекс Директ', '/nastrojka-yandex-direct/']] },
  { phase: 'Рост', title: 'Ссылки, доработки и рост продаж', text: 'Наращиваем внешние сигналы — крауд-ссылки и упоминания, дорабатываем сайт по данным аналитики, работаем с отзывами. Каждый месяц — отчёт по заявкам.', links: [['Комплексное продвижение', '/seo-prodvizhenie/kompleksnoe/'], ['Доработка сайта', '/dorabotka-sajta/'], ['SERM — репутация', '/serm/'], ['Услуги по подписке', '/podpiska/']] },
];
const EXIST = [
  { phase: 'Анализ', title: 'Полностью анализируем ваш сайт', text: 'Если сайт делали не мы — начинаем с аудита: индексация, техника, структура, мета-теги, тексты, скорость, формы заявок и требования закона.', links: [['SEO-аудит', '/audit-sayta/seo-audit/'], ['Бесплатный экспресс-аудит', '/audit-sayta/besplatnyj/'], ['Проверка на 152-ФЗ', '/audit-sayta/152-fz/']] },
  { phase: 'Анализ', title: 'Сверяем с конкурентами', text: 'Смотрим, кто стоит в топе по вашим запросам, какие у них страницы, цены и предложения. Находим, чего не хватает вашему сайту.', links: [['Как вывести сайт в топ', '/baza-znaniy/kak-vyvesti-sajt-v-top-yandeksa/'], ['Семантическое ядро', '/baza-znaniy/semanticheskoe-yadro/']] },
  { phase: 'Исправления', title: 'Дорабатываем и улучшаем сайт', text: 'Исправляем ошибки, добавляем недостающие страницы, переписываем мета-теги и тексты, ускоряем загрузку, улучшаем формы заявок.', links: [['Доработка сайта', '/dorabotka-sajta/'], ['Ускорение', '/uskorenie-sajta/'], ['Редизайн', '/redizajn-sajta/'], ['Конверсия', '/uvelichenie-konversii-sajta/']] },
  { phase: 'Настройка', title: 'Настраиваем Яндекс, если это требуется', text: 'Вебмастер, Метрика с целями, карточка в Яндекс Бизнесе, реклама в Директе — всё, чтобы Яндекс правильно понимал сайт, а вы видели заявки.', links: [['Продвижение в Яндексе', '/seo-prodvizhenie/v-yandekse/'], ['Яндекс Бизнес', '/prodvizhenie-v-yandex-biznes/'], ['Яндекс Директ', '/nastrojka-yandex-direct/']] },
  { phase: 'Продвижение', title: 'Продвигаем и растим продажи', text: 'SEO, карты, нейросети, ссылки и репутация — ежемесячно, с отчётом по заявкам.', links: [['SEO-продвижение', '/seo-prodvizhenie/'], ['GEO-продвижение', '/uslugi/geo/'], ['Услуги по подписке', '/podpiska/']] },
];

const step = (s, i) => `<li class="rm-step" data-phase="${s.phase}">
  <div class="rm-node"><span>${i + 1}</span></div>
  <div class="rm-card">
    <div class="rm-phase">Этап ${i + 1} · ${s.phase}</div>
    <h3>${s.title}</h3>
    <p>${s.text}</p>
    <div class="rm-links">${s.links.map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}</div>
  </div>
</li>`;

module.exports = {
  path: '/doroznaya-karta/',
  type: 'raw',
  title: 'Дорожная карта: как создать и продвинуть сайт — от идеи до продаж | I-Guide',
  description: 'Пошаговая дорожная карта I-Guide: от идеи сайта до первых продаж. Выбор типа сайта, семантическое ядро, сборка страниц, домен и хостинг, индексация в Яндексе и Google, SEO и GEO-продвижение.',
  h1: 'Дорожная карта: от идеи сайта до продаж',
  menu: 'Дорожная карта',
  crumbs: [],
  body: ({ icon }) => `
<section class="svc-hero rm-hero"><div class="wrap">
  <nav class="crumbs" aria-label="Хлебные крошки"><ol><li><a href="/">Главная</a></li><li aria-current="page">Дорожная карта</li></ol></nav>
  <span class="eyebrow">Как мы работаем</span>
  <h1>Дорожная карта: от идеи сайта до продаж</h1>
  <p class="lead">Не знаете, с чего начать? Ниже — весь путь по шагам. Выберите свою ситуацию и посмотрите, что будет происходить на каждом этапе.</p>
  <div class="rm-tabs" role="tablist">
    <a class="rm-tab is-active" href="#novyj-sajt" data-track="new" role="tab">${icon('sites', 'ico-sm')} Сайта ещё нет</a>
    <a class="rm-tab" href="#sajt-est" data-track="exist" role="tab">${icon('audit', 'ico-sm')} Сайт уже есть</a>
  </div>
</div></section>

<section class="svc-sec rm-sec" id="novyj-sajt" data-track-panel="new"><div class="wrap">
  <div class="sec-head"><h2>Маршрут 1. Сайта ещё нет</h2><p>От первой мысли «нам нужен сайт» до стабильного потока заявок из поиска.</p></div>
  <ol class="rm-line">${NEW.map(step).join('')}</ol>
</div></section>

<section class="svc-sec svc-alt rm-sec" id="sajt-est" data-track-panel="exist"><div class="wrap">
  <div class="sec-head"><h2>Маршрут 2. Сайт уже есть</h2><p>Сайт сделан, но не приносит заявок или его делали не мы — начинаем с анализа.</p></div>
  <ol class="rm-line">${EXIST.map(step).join('')}</ol>
</div></section>

<section class="svc-sec svc-lead" id="zayavka"><div class="wrap lead-in"><div><h2>Начните с первого шага</h2><p>Расскажите о бизнесе — подскажем, с какого этапа дорожной карты начать именно вам.</p><p><a class="btn btn-light" href="/audit-sayta/besplatnyj/">Бесплатный экспресс-аудит ${icon('arrow', 'ico-sm')}</a></p></div><div class="rm-cta-tg"><a class="btn" href="/konsultaciya/#form">Оставить заявку ${icon('arrow', 'ico-sm')}</a></div></div></section>
`,
};
