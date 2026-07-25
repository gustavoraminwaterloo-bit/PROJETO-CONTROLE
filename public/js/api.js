import { mockCall, encontrarUsuarioDemo } from './mockData.js';

// Modo de demonstração: liga automaticamente quando o site é aberto como
// arquivo local (sem servidor) ou quando o usuário força com ?mock=1.
// Nesse modo nada é enviado para fora do navegador.
const params = new URLSearchParams(location.search);
if (params.get('mock') === '1') localStorage.setItem('cip_force_mock', '1');
if (params.get('mock') === '0') localStorage.removeItem('cip_force_mock');

export const MODO_DEMO = location.protocol === 'file:' || localStorage.getItem('cip_force_mock') === '1';

async function chamar(action, payload) {
  if (MODO_DEMO) {
    if (action === 'login') {
      return payload && payload.senha ? { ok: true, papel: 'admin', nome: 'Administrador' } : { ok: false, error: 'Digite uma senha.' };
    }
    if (action === 'loginAnalista') {
      if (!(payload && payload.usuario && payload.senha)) return { ok: false, error: 'Informe usuário e senha.' };
      const usuario = encontrarUsuarioDemo(payload.usuario);
      return { ok: true, papel: 'analista', nome: usuario ? usuario.Nome : payload.usuario };
    }
    if (action === 'logout') {
      return { ok: true };
    }
    try {
      return { ok: true, data: mockCall(action, payload) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
  const resposta = await fetch('/api', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  const dados = await resposta.json().catch(() => ({ ok: false, error: 'Resposta inválida do servidor.' }));
  // 401 num login/loginAnalista é só "senha errada" — não uma sessão expirando.
  // Só trata como sessão expirada quando é uma ação autenticada de verdade.
  if (resposta.status === 401 && action !== 'login' && action !== 'loginAnalista') {
    window.dispatchEvent(new CustomEvent('sessao-expirada'));
  }
  return dados;
}

async function chamarOuFalhar(action, payload) {
  const r = await chamar(action, payload);
  if (!r.ok) throw new Error(r.error || 'Erro desconhecido.');
  return r.data;
}

async function chamarAssistente(corpo) {
  if (MODO_DEMO) {
    const mensagens = Array.isArray(corpo.mensagens) ? corpo.mensagens.slice() : [];
    mensagens.push({
      role: 'assistant',
      content: [{ type: 'text', text: 'O assistente de IA só funciona com o backend real configurado (variável GEMINI_API_KEY no Netlify). Em modo de demonstração não há IA disponível — veja o README para configurar.' }]
    });
    return { ok: true, mensagens, pendente: null };
  }
  const resposta = await fetch('/assistente', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });
  const dados = await resposta.json().catch(() => ({ ok: false, error: 'Resposta inválida do servidor.' }));
  if (resposta.status === 401) window.dispatchEvent(new CustomEvent('sessao-expirada'));
  return dados;
}

export const api = {
  login: (senha) => chamar('login', { senha }),
  loginAnalista: (usuario, senha) => chamar('loginAnalista', { usuario, senha }),
  logout: () => chamar('logout', {}),

  listItens: () => chamarOuFalhar('listItens'),
  getItem: (id) => chamarOuFalhar('getItem', { id }),
  listEquipamentos: () => chamarOuFalhar('listEquipamentos'),
  getEquipamento: (id) => chamarOuFalhar('getEquipamento', { id }),
  listVeiculos: () => chamarOuFalhar('listVeiculos'),
  getVeiculo: (id) => chamarOuFalhar('getVeiculo', { id }),
  listMovimentacoes: (itemId) => chamarOuFalhar('listMovimentacoes', { itemId }),
  listColaboradores: () => chamarOuFalhar('listColaboradores'),
  listProjetos: () => chamarOuFalhar('listProjetos'),
  custoPorProjeto: (projeto) => chamarOuFalhar('custoPorProjeto', { projeto }),
  listMateriaisReferencia: () => chamarOuFalhar('listMateriaisReferencia'),
  avisos: (dias) => chamarOuFalhar('avisos', { dias }),
  listReservas: (veiculoId, colaborador, status) => chamarOuFalhar('listReservas', { veiculoId, colaborador, status }),
  getReserva: (id) => chamarOuFalhar('getReserva', { id }),
  verificarDisponibilidade: (veiculoId, inicio, fim) => chamarOuFalhar('verificarDisponibilidade', { veiculoId, inicio, fim }),
  responsavelNaData: (veiculoId, data) => chamarOuFalhar('responsavelNaData', { veiculoId, data }),
  listUsuarios: () => chamarOuFalhar('listUsuarios'),

  criarItem: (payload) => chamarOuFalhar('criarItem', payload),
  registrarEntrada: (payload) => chamarOuFalhar('registrarEntrada', payload),
  alocarColaborador: (payload) => chamarOuFalhar('alocarColaborador', payload),
  registrarSaidaProjeto: (payload) => chamarOuFalhar('registrarSaidaProjeto', payload),
  registrarDevolucao: (payload) => chamarOuFalhar('registrarDevolucao', payload),
  criarEquipamento: (payload) => chamarOuFalhar('criarEquipamento', payload),
  registrarLocacao: (payload) => chamarOuFalhar('registrarLocacao', payload),
  registrarDevolucaoEquipamento: (payload) => chamarOuFalhar('registrarDevolucaoEquipamento', payload),
  registrarCalibracaoEquipamento: (payload) => chamarOuFalhar('registrarCalibracaoEquipamento', payload),
  criarVeiculo: (payload) => chamarOuFalhar('criarVeiculo', payload),
  criarColaborador: (payload) => chamarOuFalhar('criarColaborador', payload),
  criarProjeto: (payload) => chamarOuFalhar('criarProjeto', payload),
  criarMaterialReferencia: (payload) => chamarOuFalhar('criarMaterialReferencia', payload),
  criarReserva: (payload) => chamarOuFalhar('criarReserva', payload),
  iniciarRetiradaReserva: (payload) => chamarOuFalhar('iniciarRetiradaReserva', payload),
  registrarRetornoReserva: (payload) => chamarOuFalhar('registrarRetornoReserva', payload),
  cancelarReserva: (payload) => chamarOuFalhar('cancelarReserva', payload),
  criarUsuario: (payload) => chamarOuFalhar('criarUsuario', payload),
  desativarUsuario: (payload) => chamarOuFalhar('desativarUsuario', payload),

  assistente: (corpo) => chamarAssistente(corpo)
};
