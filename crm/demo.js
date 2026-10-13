// Демо-копия CRM с примерами заявок — чтобы посмотреть, как всё работает, не трогая настоящую базу.
// node crm/demo.js → http://localhost:4401, пароль: demo-iguide. Данные лежат во временной папке и не смешиваются с рабочими.
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dir = path.join(os.tmpdir(), 'iguide-crm-demo');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const salt = crypto.randomBytes(16);
const cfg = { port: 4401, host: '127.0.0.1', allowedOrigins: ['http://localhost:4321'], secureCookie: false, telegram: {}, passwordSalt: salt.toString('hex'), passwordHash: crypto.scryptSync('demo-iguide', salt, 64).toString('hex') };
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(cfg));
process.env.CRM_CONFIG = path.join(dir, 'config.json');
process.env.CRM_DATA = dir;
process.env.PORT = '4401';
require('./server.js');
