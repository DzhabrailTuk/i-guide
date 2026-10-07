module.exports = {
  path: '/konsultaciya/',
  section: 'consult', type: 'page',
  title: 'Консультация по сайту, SEO и продвижению — I-Guide',
  description: 'Консультация по сайту: разбор текущей ситуации, причин отсутствия заявок, выбор каналов продвижения — SEO, GEO, Яндекс Директ — или создание нового сайта.',
  h1: 'Консультация по сайту и продвижению',
  menu: 'Консультация',
  lead: 'Расскажите о вашем бизнесе и сайте — разберём, что мешает получать заявки, и подскажем, с чего начать.',
  crumbs: [],
  noCta: true,
  body: `
<h2 id="chto-razbiraem">Что можно разобрать на консультации</h2>
<ul class="checklist">
<li>Почему сайт не приносит заявки.</li>
<li>Какие каналы подойдут вашему бизнесу: SEO, геопродвижение, Яндекс Директ.</li>
<li>Нужен ли новый сайт или достаточно доработать текущий.</li>
<li>Есть ли на сайте нарушения, за которые можно получить штраф.</li>
</ul>
<div class="todo">Формат консультации (бесплатно / платно, онлайн / офлайн, длительность) — заполняется по вашему описанию.</div>
<h2 id="form">Оставить заявку</h2>
<p>Удобнее переписываться? <a href="/kontakty/#svyaz">Напишите нам в Telegram</a>.</p>
<form class="form" data-lead novalidate>
  <label>Имя<input name="name" autocomplete="name" required></label>
  <label>Телефон или мессенджер<input name="contact" required></label>
  <label>Сайт (если есть)<input name="site" placeholder="https://"></label>
  <label>Задача<textarea name="task" rows="4"></textarea></label>
  <label class="consent"><input type="checkbox" name="consent" required> <span>Даю <a href="/soglasie-na-obrabotku/">согласие на обработку персональных данных</a> в соответствии с <a href="/politika-konfidencialnosti/">Политикой</a>.</span></label>
  <button class="btn" type="submit">Отправить заявку</button>
  <div class="form-msg" role="status"></div>
</form>
`,
};
