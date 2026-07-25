// Netlify Function — proxy autenticado entre o site e o Google Apps Script.
// Não usa nenhuma dependência de npm (só módulos nativos do Node), então não
// precisa de "npm install" nem de build: o Netlify já roda isso do jeito que está.
//
// Variáveis de ambiente esperadas (Netlify > Site settings > Environment variables):
//   ADMIN_PASSWORD    -> senha que você vai digitar para entrar no site
//   SESSION_SECRET    -> string longa e aleatória, só para assinar o cookie de sessão
//   APPS_SCRIPT_URL   -> URL do Web App do Apps Script (ver apps-script/Code.gs)
//   APPS_SCRIPT_SECRET-> mesmo valor colocado na propriedade API_SECRET do Apps Script

const { requireEnv, sign, parseCookies, setCookieHeader, json, sessaoPayload, hashSenha, chamarAppsScript, COOKIE_NAME } = require('./_auth');
const { acaoPermitidaParaPapel } = require('./_permissoes');

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
    const senha = payload && payload.senha;
    if (senha !== requireEnv('ADMIN_PASSWORD')) {
      return json(401, { ok: false, error: 'Senha incorreta.' });
    }
    return criarSessao('admin', 'Administrador');
  }

  if (action === 'loginAnalista') {
    const usuario = payload && payload.usuario;
    const senha = payload && payload.senha;
    if (!usuario || !senha) {
      return json(400, { ok: false, error: 'Informe usuário e senha.' });
    }
    let resultado;
    try {
      resultado = await chamarAppsScript('verificarUsuario', { usuario, senhaHash: hashSenha(senha) });
    } catch (err) {
      return json(500, { ok: false, error: err.message });
    }
    if (!resultado.ok || !resultado.data || !resultado.data.ok) {
      return json(401, { ok: false, error: 'Usuário ou senha incorretos.' });
    }
    return criarSessao('analista', resultado.data.nome);
  }

  if (action === 'logout') {
    return json(200, { ok: true }, { 'Set-Cookie': setCookieHeader('', 0) });
  }

  const sessao = sessaoPayload(event);
  if (!sessao) {
    return json(401, { ok: false, error: 'Sessão expirada. Faça login novamente.' });
  }

  if (!acaoPermitidaParaPapel(action, sessao.papel)) {
    return json(403, { ok: false, error: 'Ação não permitida para este perfil de acesso.' });
  }

  // Criação de usuário: a senha em texto puro só existe aqui, na Netlify Function
  // — vira hash antes de qualquer chamada ao Apps Script/planilha (nunca é salva
  // em texto puro em lugar nenhum).
  if (action === 'criarUsuario') {
    const { Nome, Usuario, senha } = payload || {};
    if (!senha) return json(400, { ok: false, error: 'Informe a senha do novo usuário.' });
    try {
      const result = await chamarAppsScript('criarUsuario', { Nome, Usuario, SenhaHash: hashSenha(senha) });
      return json(200, result);
    } catch (err) {
      return json(500, { ok: false, error: err.message });
    }
  }

  try {
    const result = await chamarAppsScript(action, payload || {});
    return json(200, result);
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
