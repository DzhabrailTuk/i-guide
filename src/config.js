// Общие настройки сайта. Поля с пометкой TODO заполняются после ответа владельца.
module.exports = {
  name: 'I-Guide',
  url: 'https://i-guide.example', // TODO: реальный домен
  lang: 'ru',
  city: 'вся Россия; основа — Самара, Саратов, Казань, Волгоград, Сызрань и города Поволжья',
  phone: '',     // TODO
  email: '',     // TODO
  telegram: '@tukaev_dzhabrail',
  whatsapp: '',  // TODO: номер менеджера WhatsApp, например '+7 999 123-45-67'
  legal: '',     // TODO: ИП/ООО, ИНН, ОГРН — обязательны для сайта услуг
  // адрес CRM для заявок с форм (crm/server.js). Пусто — формы работают в тестовом режиме.
  // Для локальной проверки: npm run dev (сайт + заявки в локальную CRM на :4400)
  crmUrl: process.env.CRM_URL || (process.argv.find(a => a.startsWith('--crm=')) || '').slice(6),
  updated: '2026-10-06',
  anim: 'band', // анимации названия при прокрутке: band — лента, letters — буквы, watermark — водяной знак
  designLab: false, // режим подбора дизайна (панель палитр и шрифтов, Google Fonts). Перед публикацией — false
};
