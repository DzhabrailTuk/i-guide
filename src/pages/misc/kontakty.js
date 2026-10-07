const site = require('../../config');
const wa = (site.whatsapp || '').replace(/\D/g, '').replace(/^8(\d{10})$/, '7$1');
const tg = site.telegram ? site.telegram.replace(/^@|^https?:\/\/t\.me\//, '') : '';
module.exports = {
  path: '/kontakty/',
  type: 'page',
  title: 'Контакты I-Guide — связь с нами в Telegram',
  description: 'Контакты I-Guide: напишите нам в Telegram или оставьте заявку на консультацию по продвижению, созданию сайта, рекламе и продажам.',
  h1: 'Контакты',
  crumbs: [],
  body: ({ icon }) => `
<h2 id="svyaz">Связь с нами</h2>
<div class="contact-cards">
  <a class="contact-card contact-tg" ${tg ? `href="https://t.me/${tg}" target="_blank" rel="noopener"` : 'href="#svyaz"'}>
    ${icon('tg', 'ico-tg')}
    <div><b>Telegram</b></div>
    <span class="contact-go">Написать ${icon('arrow', 'ico-sm')}</span>
  </a>
  <a class="contact-card contact-tg" ${wa ? `href="https://wa.me/${wa}" target="_blank" rel="noopener"` : 'href="#svyaz"'}>
    ${icon('wa', 'ico-tg')}
    <div><b>WhatsApp</b><span>${wa ? 'чат с менеджером' : 'номер менеджера — заполняется'}</span></div>
    <span class="contact-go">Написать ${icon('arrow', 'ico-sm')}</span>
  </a>
  <a class="contact-card" href="/konsultaciya/#form">
    ${icon('consult', 'ico-tg')}
    <div><b>Заявка на консультацию</b><span>Опишите задачу — свяжемся с вами</span></div>
    <span class="contact-go">Оставить ${icon('arrow', 'ico-sm')}</span>
  </a>
</div>
${tg ? '' : '<div class="todo">Аккаунт Telegram для связи — ждём ваш @username.</div>'}
${wa ? '' : '<div class="todo">Номер WhatsApp менеджера — впишите в src/config.js (поле whatsapp).</div>'}
<div class="todo">Телефон, e-mail, адрес/город, график работы и реквизиты (ИП/ООО, ИНН, ОГРН) — заполняются по вашим данным.</div>`,
};
