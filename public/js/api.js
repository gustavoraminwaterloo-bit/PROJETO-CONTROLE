import { mockCall } from './mockData.js';

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
      return payload && payload.senha ? { ok: true } : { ok: false, error: 'Digite uma senha.' };
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
  if (resposta.status === 401) window.dispatchEvent(new CustomEvent('sessao-expirada'));
  return dados;
}

async function chamarOuFalhar(action, payload) {
  const r = await chamar(action, payload);
  if (!r.ok) throw new Error(r.error || 'Erro desconhecido.');
  return r.data;
}

export const api = {
  login: (senha) => chamar('login', { senha }),
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
  criarMaterialReferencia: (payload) => chamarOuFalhar('criarMaterialReferencia', payload)
};
