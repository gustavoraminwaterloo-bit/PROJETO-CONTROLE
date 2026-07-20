import { icons } from './icons.js';

export function linkDoAviso(aviso) {
  if (aviso.tipo === 'Calibração') return `#/equipamento/${encodeURIComponent(aviso.id)}`;
  return '#/materiais-referencia';
}

export function avisoLembretePG005() {
  return `
    <div class="aviso atencao">
      ${icons.alerta}
      <div>
        <strong>Lembrete:</strong> para locação de multiparâmetro, kit de baixa vazão, bomba de
        bexiga, interface, medidor de NA, caixa controladora, turbidímetro, mangueira 6mm ou bexiga
        para amostragem — preencha o <strong>PG005</strong> e anexe o pedido de compras.
      </div>
    </div>
  `;
}

export function formatarMoeda(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarData(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('pt-BR');
}

export function formatarDataHora(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return String(valor);
  return d.toLocaleString('pt-BR');
}

export function paraInputData(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function classeBadgeStatus(status) {
  const mapa = {
    'Em estoque': 'estoque',
    'Com colaborador': 'colaborador',
    'Em projeto': 'projeto',
    'Em locação': 'projeto',
    'Em manutenção': 'manutencao',
    'Fora de uso': 'fora'
  };
  return mapa[status] || '';
}

export function qs(seletor, contexto = document) {
  return contexto.querySelector(seletor);
}

export function qsa(seletor, contexto = document) {
  return Array.from(contexto.querySelectorAll(seletor));
}

export function serializarFormulario(form) {
  const dados = {};
  new FormData(form).forEach((valor, chave) => { dados[chave] = valor; });
  return dados;
}

export function diaISO(data) {
  const d = data ? new Date(data) : new Date();
  return d.toISOString().slice(0, 10);
}

export function iniciaisNome(nome) {
  const partes = String(nome || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '?';
}

export function ordenarPor(lista, campo, direcao = 'asc') {
  const copia = [...lista];
  copia.sort((a, b) => {
    let va = a[campo]; let vb = b[campo];
    const na = Number(va); const nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') { va = na; vb = nb; }
    else { va = String(va ?? '').toLowerCase(); vb = String(vb ?? '').toLowerCase(); }
    if (va < vb) return direcao === 'asc' ? -1 : 1;
    if (va > vb) return direcao === 'asc' ? 1 : -1;
    return 0;
  });
  return copia;
}

export function paginar(lista, pagina, porPagina) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaSegura - 1) * porPagina;
  return { itens: lista.slice(inicio, inicio + porPagina), totalPaginas, paginaAtual: paginaSegura, total: lista.length };
}

let raizModal = null;
export function abrirModal({ titulo, conteudoHtml, aoFechar }) {
  fecharModal();
  raizModal = document.createElement('div');
  raizModal.className = 'modal-overlay';
  raizModal.innerHTML = `
    <div class="modal-caixa" role="dialog" aria-modal="true">
      <div class="modal-topo">
        <h3>${titulo}</h3>
        <button type="button" class="fechar icone-only" aria-label="Fechar">${'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>'}</button>
      </div>
      <div class="modal-corpo">${conteudoHtml}</div>
    </div>
  `;
  document.body.appendChild(raizModal);
  const fechar = () => { fecharModal(); if (aoFechar) aoFechar(); };
  raizModal.querySelector('.fechar').addEventListener('click', fechar);
  raizModal.addEventListener('click', (e) => { if (e.target === raizModal) fechar(); });
  document.addEventListener('keydown', escFechaModal);
  return raizModal;
}

function escFechaModal(e) {
  if (e.key === 'Escape') fecharModal();
}

export function fecharModal() {
  if (raizModal) {
    raizModal.remove();
    raizModal = null;
    document.removeEventListener('keydown', escFechaModal);
  }
}
