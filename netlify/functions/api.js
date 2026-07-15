// Netlify Function — proxy autenticado entre o site e o Google Apps Script.
// Não usa nenhuma dependência de npm (só módulos nativos do Node), então não
// precisa de "npm install" nem de build: o Netlify já roda isso do jeito que está.
//
// Variáveis de ambiente esperadas (Netlify > Site settings > Environment variables):
//   ADMIN_PASSWORD    -> senha que você vai digitar para entrar no site
//   SESSION_SECRET    -> string longa e aleatória, só para assinar o cookie de sessão
//   APPS_SCRIPT_URL   -> URL do Web App do Apps Script (ver apps-script/Code.gs)
//   APPS_SCRIPT_SECRET-> mesmo valor colocado na propriedade API_SECRET do Apps Script

const crypto = require('crypto');

const COOKIE_NAME = 'cip_session';
const SESSION_HOURS = 12;

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input) {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
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

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente não configurada: ${name}`);
  return v;
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

async function forwardToAppsScript(action, payload) {
  const url = requireEnv('APPS_SCRIPT_URL');
  const secret = requireEnv('APPS_SCRIPT_SECRET');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: secret, action, payload })
  });
  const data = await res.json();
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método não permitido.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { ok: false, error: 'Corpo da requisição inválido.' });
  }

  const { action, payload } = body;

  if (action === 'login') {
    const senha = payload && payload.senha;
    if (senha !== requireEnv('ADMIN_PASSWORD')) {
      return json(401, { ok: false, error: 'Senha incorreta.' });
    }
    const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
    const cookieValue = sign({ exp });
    return json(200, { ok: true }, { 'Set-Cookie': setCookieHeader(cookieValue, SESSION_HOURS * 60 * 60) });
  }

  if (action === 'logout') {
    return json(200, { ok: true }, { 'Set-Cookie': setCookieHeader('', 0) });
  }

  const cookies = parseCookies(event.headers.cookie);
  const session = verify(cookies[COOKIE_NAME]);
  if (!session) {
    return json(401, { ok: false, error: 'Sessão expirada. Faça login novamente.' });
  }

  try {
    const result = await forwardToAppsScript(action, payload || {});
    return json(200, result);
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
