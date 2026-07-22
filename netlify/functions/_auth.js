// Helpers compartilhados entre as Netlify Functions deste projeto (sessão de
// login e chamada ao Apps Script). Não é uma function em si — é importado
// pelas outras (api.js, assistente.js). Só módulos nativos do Node.

const crypto = require('crypto');

const COOKIE_NAME = 'cip_session';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input) {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente não configurada: ${name}`);
  return v;
}

function sign(payload) {
  const secret = requireEnv('SESSION_SECRET');
  const body = base64url(JSON.stringify(payload));
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `${body}.${hmac}`;
}

function verify(token) {
  if (!token || token.indexOf('.') === -1) return null;
  const [body, hmac] = token.split('.');
  const secret = requireEnv('SESSION_SECRET');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(hmac, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(base64urlDecode(body));
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function setCookieHeader(value, maxAgeSeconds) {
  const isLocalDev = process.env.NETLIFY_DEV === 'true';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (!isLocalDev) parts.push('Secure');
  return parts.join('; ');
}

function json(statusCode, data, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extraHeaders || {}),
    body: JSON.stringify(data)
  };
}

function sessaoValida(event) {
  const cookies = parseCookies(event.headers.cookie);
  return !!verify(cookies[COOKIE_NAME]);
}

async function chamarAppsScript(action, payload) {
  const url = requireEnv('APPS_SCRIPT_URL');
  const secret = requireEnv('APPS_SCRIPT_SECRET');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: secret, action, payload })
  });
  return res.json();
}

module.exports = {
  COOKIE_NAME, requireEnv, sign, verify, parseCookies, setCookieHeader, json, sessaoValida, chamarAppsScript
};
