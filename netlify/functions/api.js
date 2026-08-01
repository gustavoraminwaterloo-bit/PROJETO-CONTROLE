// Netlify Function — proxy autenticado entre o site e o Google Apps Script.
// Não usa nenhuma dependência de npm (só módulos nativos do Node), então não
// precisa de "npm install" nem de build: o Netlify já roda isso do jeito que está.
//
// Variáveis de ambiente esperadas (Netlify > Site settings > Environment variables):
//   ADMIN_PASSWORD    -> senha que você vai digitar para entrar no site
//   SESSION_SECRET    -> string longa e aleatória, só para assinar o cookie de sessão
//   APPS_SCRIPT_URL   -> URL do Web App do Apps Script (ver apps-script/Code.gs)
//   APPS_SCRIPT_SECRET-> mesmo valor colocado na propriedade API_SECRET do Apps Script

const { requireEnv, sign, setCookieHeader, json, sessaoPayload, chamarAppsScript } = require('./_auth');

const SESSION_HOURS = 12;

function criarSessao(papel, nome) {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const cookieValue = sign({ exp, papel, nome });
  return json(200, { ok: true, papel, nome }, { 'Set-Cookie': setCookieHeader(cookieValue, SESSION_HOURS * 60 * 60) });
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
    // .trim() evita que espaço extra vindo de copiar/colar a senha (ex: quebra
    // de linha ou espaço no fim) derrube o login por engano.
    const senha = (payload && payload.senha || '').trim();
    if (senha !== requireEnv('ADMIN_PASSWORD')) {
      return json(401, { ok: false, error: 'Senha incorreta.' });
    }
    return criarSessao('admin', 'Administrador');
  }

  if (action === 'logout') {
    return json(200, { ok: true }, { 'Set-Cookie': setCookieHeader('', 0) });
  }

  const sessao = sessaoPayload(event);
  if (!sessao) {
    return json(401, { ok: false, error: 'Sessão expirada. Faça login novamente.' });
  }

  try {
    const result = await chamarAppsScript(action, payload || {});
    return json(200, result);
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
