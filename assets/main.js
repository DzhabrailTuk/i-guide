// Мобильное меню и заглушка формы (отправка заявок подключается после ответа владельца).
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  if (burger && nav) burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('form[data-lead]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const msg = f.querySelector('.form-msg');
    if (msg) { msg.style.display = 'block'; msg.textContent = 'Форма в тестовом режиме: отправка заявок ещё не подключена.'; }
  }));
});

// Анимации названия I-Guide при прокрутке (лента, буквы, водяной знак)
(() => {
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const progress = el => { const r = el.getBoundingClientRect(), h = innerHeight; return clamp((h - r.top) / (h + r.height)); };
  let bands = [], letters = [], wm = null, wmTimer = 0, lastY = scrollY, ticking = false;
  function frame() {
    ticking = false;
    const on = root.dataset.anim || '';
    if (on.includes('band')) bands.forEach(w => {
      const p = progress(w.parentElement);
      const o = Math.pow(Math.sin(p * Math.PI), 1.4);
      w.style.setProperty('--x', ((0.5 - p) * 34).toFixed(2) + 'vw');
      w.style.setProperty('--o', o.toFixed(3));
      w.style.setProperty('--fill', (ease(clamp((p - .3) / .3)) * 110).toFixed(1) + '%');
      w.style.setProperty('--ls', (0.18 * (1 - ease(clamp(p / .5)))).toFixed(3) + 'em');
      w.style.setProperty('--b', ((1 - o) * 6).toFixed(2) + 'px');
    });
    if (on.includes('letters')) letters.forEach(box => {
      const p = progress(box), n = box.children.length;
      [...box.children].forEach((s, i) => {
        const d = i / n * .12;
        const a = ease(clamp((p - .18 - d) / .2));      // появление
        const z = ease(clamp((p - .64 - d) / .2));      // исчезновение
        const v = a - z;
        s.style.opacity = v.toFixed(3);
        s.style.transform = `translate3d(0,${((1 - a) * 55 - z * 45).toFixed(1)}%,0) rotate(${((1 - a) * 9 - z * 6).toFixed(2)}deg) scale(${(0.9 + 0.1 * v).toFixed(3)})`;
        s.style.filter = `blur(${((1 - v) * 12).toFixed(1)}px)`;
      });
    });
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  function onScroll() {
    request();
    if (wm && (root.dataset.anim || '').includes('watermark')) {
      const dy = scrollY - lastY; lastY = scrollY;
      if (scrollY > 120) {
        wm.style.setProperty('--wy', (dy > 0 ? 0 : 60) + 'px');
        wm.classList.add('on');
      }
      clearTimeout(wmTimer);
      wmTimer = setTimeout(() => { wm.classList.remove('on'); wm.style.setProperty('--wy', '40px'); }, 900);
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    bands = [...document.querySelectorAll('.bb-word')];
    letters = [...document.querySelectorAll('.brand-letters')];
    wm = document.querySelector('.brand-wm');
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', request);
    new MutationObserver(request).observe(root, { attributes: true, attributeFilter: ['data-anim'] });
    frame();
  });
})();

// Панель подбора цвета (config.designLab): готовые палитры + тонкая настройка акцента и тёмного тона
const PALETTES = [['', 'Основная I-Guide (бургунди)', '#821f30', '#0b0b0b'], ['indigo', 'Индиго', '#4b3ee6', '#070b17'], ['mint', 'Мята', '#0c8571', '#0a1f22'], ['ocean', 'Океан', '#1d4fcf', '#08152b'], ['sage', 'Шалфей', '#42664f', '#19221d'], ['lavender', 'Лаванда', '#5a4ad1', '#16142e']];
const hexToHsl = hex => {
  const n = parseInt(hex.replace('#', ''), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = Math.round(h * 60 + 360) % 360;
  }
  return [h, Math.round(s * 100), Math.round(l * 100)];
};
const hslToHex = (h, s, l) => {
  s /= 100; l /= 100;
  const f = n => { const k = (n + h / 30) % 12, c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
};
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  if (!root.hasAttribute('data-lab') || location.search.includes('clean')) return;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  const custom = () => { try { return JSON.parse(ls('ig-custom') || '{}'); } catch (e) { return {}; } };
  const cssVar = k => getComputedStyle(root).getPropertyValue(k).trim();
  const lab = document.createElement('div');
  lab.className = innerWidth < 900 ? 'lab closed' : 'lab';
  document.body.appendChild(lab);

  function setVars(vars) {
    const c = Object.assign(custom(), vars);
    for (const k in vars) root.style.setProperty(k, vars[k]);
    if (vars['--accent']) { root.style.setProperty('--accent-soft', `color-mix(in srgb,${vars['--accent']} 9%,var(--bg))`); c['--accent-soft'] = `color-mix(in srgb,${vars['--accent']} 9%,var(--bg))`; }
    ls('ig-custom', JSON.stringify(c));
  }
  function choosePalette(p) {
    ls('ig-custom', null); root.removeAttribute('style');
    if (p) { root.setAttribute('data-palette', p); ls('ig-palette', p); } else { root.removeAttribute('data-palette'); ls('ig-palette', null); }
    draw();
  }
  function draw() {
    const p = root.getAttribute('data-palette') || '';
    const accent = cssVar('--accent'), ink = cssVar('--ink'), bg = cssVar('--bg');
    const [h, s, l] = hexToHsl(accent);
    const closed = lab.classList.contains('closed');
    lab.innerHTML = `<div class="lab-head"><span>🎨 Подбор цвета</span><span>${closed ? '▲' : '▼'}</span></div><div class="lab-body">
      <h4>Готовые палитры</h4><div class="lab-sw">${PALETTES.map(([k, n, a, b]) => `<button title="${n}" data-p="${k}" aria-pressed="${k === p}" style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></button>`).join('')}</div>
      <div class="lab-name">${(PALETTES.find(x => x[0] === p) || PALETTES[0])[1]}${Object.keys(custom()).length ? ' · изменена' : ''}</div>
      <h4>Акцентный цвет <span class="lab-hex">${accent}</span></h4>
      <label class="lab-row">Оттенок<input type="range" min="0" max="359" value="${h}" data-k="h"></label>
      <label class="lab-row">Насыщенность<input type="range" min="0" max="100" value="${s}" data-k="s"></label>
      <label class="lab-row">Яркость<input type="range" min="15" max="70" value="${l}" data-k="l"></label>
      <label class="lab-row">Точно<input type="color" value="${accent}" data-c="--accent"></label>
      <h4>Тёмный тон <span class="lab-hex">${ink}</span></h4>
      <label class="lab-row">Цвет<input type="color" value="${ink}" data-c="--ink"></label>
      <h4>Фон <span class="lab-hex">${bg}</span></h4>
      <label class="lab-row">Светлота<input type="range" min="80" max="100" value="${hexToHsl(bg)[2]}" data-bg></label>
      <label class="lab-row">Цвет<input type="color" value="${bg}" data-c="--bg"></label>
      <h4>Анимация названия</h4><div class="lab-anim">${[['band','Лента'],['letters','Буквы'],['watermark','Водяной знак']].map(([k,n])=>`<label><input type="checkbox" data-an="${k}" ${(root.dataset.anim||'').includes(k)?'checked':''}> ${n}</label>`).join('')}</div>
      <div class="lab-btns"><button data-a="copy">Скопировать цвета</button><button data-a="reset">Сбросить</button></div>
      <div class="lab-msg"></div></div>`;
    lab.querySelector('.lab-head').onclick = () => { lab.classList.toggle('closed'); draw(); };
    lab.querySelectorAll('[data-p]').forEach(b => b.onclick = () => choosePalette(b.dataset.p));
    const sliders = lab.querySelectorAll('[data-k]');
    sliders.forEach(r => r.oninput = () => {
      const v = Object.fromEntries([...sliders].map(x => [x.dataset.k, +x.value]));
      const hex = hslToHex(v.h, v.s, v.l);
      setVars({ '--accent': hex });
      lab.querySelector('.lab-hex').textContent = hex;
      lab.querySelector('[data-c="--accent"]').value = hex;
    });
    sliders.forEach(r => r.onchange = draw);
    const bgR = lab.querySelector('[data-bg]');
    bgR.oninput = () => { const [bh, bs] = hexToHsl(bg); setVars({ '--bg': hslToHex(bh, bs, +bgR.value) }); };
    bgR.onchange = draw;
    lab.querySelectorAll('[data-c]').forEach(i => i.onchange = () => { setVars({ [i.dataset.c]: i.value }); draw(); });
    lab.querySelectorAll('[data-an]').forEach(c => c.onchange = () => { const v = [...lab.querySelectorAll('[data-an]:checked')].map(x => x.dataset.an).join(' '); root.setAttribute('data-anim', v); ls('ig-anim', v); });
    lab.querySelector('[data-a="reset"]').onclick = () => choosePalette(p);
    lab.querySelector('[data-a="copy"]').onclick = () => {
      const txt = `Акцент: ${cssVar('--accent')}, тёмный тон: ${cssVar('--ink')}, фон: ${cssVar('--bg')}`;
      const msg = lab.querySelector('.lab-msg');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => msg.textContent = 'Скопировано: ' + txt, () => msg.textContent = txt);
    };
  }
  draw();
});

// Плавающая кнопка Telegram: появляется после первого экрана, один раз «подмигивает» подписью
document.addEventListener('DOMContentLoaded', () => {
  const b = document.querySelector('.tg-float');
  if (!b) return;
  let peeked = false;
  const upd = () => {
    const show = scrollY > innerHeight * 0.5 || document.body.scrollHeight <= innerHeight * 1.3;
    b.classList.toggle('show', show);
    if (b.parentElement) b.parentElement.classList.toggle('show', show);
    if (show && !peeked) { peeked = true; b.classList.add('peek'); setTimeout(() => b.classList.remove('peek'), 2600); }
  };
  addEventListener('scroll', upd, { passive: true });
  upd();
});

// Дорожная карта: вкладки маршрутов и появление шагов при прокрутке
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.rm-tab');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.toggle('is-active', x === t));
  }));
  const steps = document.querySelectorAll('.rm-step');
  if (!steps.length || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-rm');
  const show = s => s.classList.add('in');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  steps.forEach(s => io.observe(s));
  // страховка: всё, что выше текущей прокрутки, показываем сразу; через 4 с показываем всё
  addEventListener('scroll', () => steps.forEach(s => { if (s.getBoundingClientRect().top < innerHeight) show(s); }), { passive: true });
  setTimeout(() => steps.forEach(show), 4000);
});

(function(){
  var f=document.querySelectorAll('.formula');
  if(!f.length||!('IntersectionObserver' in window))return;
  document.documentElement.classList.add('js-fm');
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.35});
  f.forEach(function(el){io.observe(el);});
  setTimeout(function(){f.forEach(function(el){if(el.getBoundingClientRect().top<innerHeight)el.classList.add('in');});},50);
})();
