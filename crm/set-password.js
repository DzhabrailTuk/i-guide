// Задать или сменить пароль входа в CRM: node crm/set-password.js "новый пароль"
// Пароль хранится только в виде хеша (scrypt) в crm/config.json.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const file = path.join(__dirname, 'config.json');
const example = path.join(__dirname, 'config.example.json');
const pass = process.argv[2];
if (!pass || pass.length < 8) { console.error('Укажите пароль не короче 8 символов: node crm/set-password.js "пароль"'); process.exit(1); }
const config = JSON.parse(fs.readFileSync(fs.existsSync(file) ? file : example, 'utf8'));
const salt = crypto.randomBytes(16);
config.passwordSalt = salt.toString('hex');
config.passwordHash = crypto.scryptSync(pass, salt, 64).toString('hex');
fs.writeFileSync(file, JSON.stringify(config, null, 2));
console.log('Пароль сохранён в crm/config.json');
