// SEO-проверка собранного сайта: node seo-check.js (после node build.js)
// Ищет: не один H1, дубли title/description, слишком длинные/короткие мета-теги.
const fs = require('fs'), path = require('path');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
const T = {}, D = {}, issues = [];
for (const f of walk(path.join(__dirname, 'dist'))) {
  const u = '/' + path.relative(path.join(__dirname, 'dist'), f).split(path.sep).join('/').replace(/index\.html$/, '');
  if (u.includes('404') || u.includes('dizayn')) continue;
  const h = fs.readFileSync(f, 'utf8');
  if (/name="robots" content="noindex/.test(h)) continue;
  const t = (h.match(/<title>([^<]*)/) || [])[1] || '';
  const d = (h.match(/name="description" content="([^"]*)/) || [])[1] || '';
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  (T[t] = T[t] || []).push(u); (D[d] = D[d] || []).push(u);
  if (h1 !== 1) issues.push(`H1 = ${h1}: ${u}`);
  if (t.length > 95) issues.push(`title ${t.length} симв.: ${u}`);
  if (d.length < 90 || d.length > 260) issues.push(`description ${d.length} симв.: ${u}`);
}
for (const [, u] of Object.entries(T)) if (u.length > 1) issues.push('дубль title: ' + u.join(', '));
for (const [, u] of Object.entries(D)) if (u.length > 1) issues.push('дубль description: ' + u.join(', '));
console.log(issues.length ? issues.join('\n') : 'SEO-проверка: всё чисто');
