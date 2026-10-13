// Временный переключатель шрифтов для выбора (подключается только вместе с концепциями дизайна).
// ?font=a..f или кнопки на панели; выбор запоминается на время сессии. После выбора файл удаляется.
(function () {
  var FONTS = {
    a: ['Nunito Sans', 'Nunito+Sans:wght@400;600;700;800'],
    b: ['Golos Text', 'Golos+Text:wght@400;500;600;700'],
    c: ['PT Sans', 'PT+Sans:wght@400;700'],
    d: ['Rubik', 'Rubik:wght@400;500;600;700'],
    e: ['IBM Plex Sans', 'IBM+Plex+Sans:wght@400;500;600;700'],
    f: ['Onest', 'Onest:wght@400;500;600;700']
  };
  var root = document.documentElement;
  function apply(k) {
    var f = FONTS[k];
    try { sessionStorage.setItem('ig-font', k || ''); } catch (e) {}
    if (!f) { root.removeAttribute('data-font'); root.style.removeProperty('--pick'); return; }
    if (!document.getElementById('font-' + k)) {
      var l = document.createElement('link');
      l.id = 'font-' + k; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + f[1] + '&display=swap';
      document.head.appendChild(l);
    }
    root.setAttribute('data-font', k);
    root.style.setProperty('--pick', '"' + f[0] + '", system-ui, sans-serif');
  }
  var q = new URLSearchParams(location.search).get('font');
  var saved = null;
  try { saved = q !== null ? q : sessionStorage.getItem('ig-font'); } catch (e) {}
  if (saved) apply(saved);

  document.addEventListener('DOMContentLoaded', function () {
    if (!root.getAttribute('data-concept') && q === null) return;
    var box = document.createElement('div');
    box.className = 'font-panel';
    box.setAttribute('aria-label', 'Выбор шрифта');
    var title = document.createElement('b');
    title.textContent = 'Шрифт:';
    box.appendChild(title);
    var keys = [''].concat(Object.keys(FONTS));
    keys.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = k ? k.toUpperCase() + ' · ' + FONTS[k][0] : 'Как сейчас';
      if (k) b.style.fontFamily = '"' + FONTS[k][0] + '", sans-serif';
      b.onclick = function () { apply(k); sync(); };
      b.dataset.k = k;
      box.appendChild(b);
    });
    function sync() {
      var cur = root.getAttribute('data-font') || '';
      [].forEach.call(box.querySelectorAll('button'), function (b) { b.classList.toggle('on', b.dataset.k === cur); });
    }
    sync();
    document.body.appendChild(box);
  });
})();
