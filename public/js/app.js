import { MODO_DEMO, api } from './api.js';
import { icons } from './icons.js';
import { formatarData, iniciaisNome } from './util.js';
import { viewLogin } from './views/login.js';
import { viewDashboard } from './views/dashboard.js';
import { viewItens, viewItemForm } from './views/itens.js';
import { viewItemDetalhe } from './views/itemDetalhe.js';
import { viewEntrada } from './views/entrada.js';
import { viewSaida } from './views/saida.js';
import { viewColaboradores } from './views/colaboradores.js';
import { viewProjetos } from './views/projetos.js';
import { viewMateriaisReferencia } from './views/materiaisReferencia.js';
import { viewEtiquetas } from './views/etiquetas.js';

const CHAVE_LOGADO = MODO_DEMO ? 'cip_demo_logado' : 'cip_logado';

export function estaLogado() {
  return sessionStorage.getItem(CHAVE_LOGADO) === '1' || localStorage.getItem(CHAVE_LOGADO) === '1';
}

export function marcarLogado(valor) {
  if (valor) sessionStorage.setItem(CHAVE_LOGADO, '1');
  else { sessionStorage.removeItem(CHAVE_LOGADO); }
}

const ROTAS = [
  { padrao: /^#\/login$/, view: viewLogin, semShell: true },
  { padrao: /^#\/$/, view: viewDashboard },
  { padrao: /^#\/itens$/, view: viewItens },
  { padrao: /^#\/itens\/novo$/, view: viewItemForm },
  { padrao: /^#\/item\/([^/]+)$/, view: viewItemDetalhe, params: ['id'] },
  { padrao: /^#\/entrada$/, view: viewEntrada },
  { padrao: /^#\/saida$/, view: viewSaida },
  { padrao: /^#\/colaboradores$/, view: viewColaboradores },
  { padrao: /^#\/projetos$/, view: viewProjetos },
  { padrao: /^#\/materiais-referencia$/, view: viewMateriaisReferencia },
  { padrao: /^#\/etiquetas$/, view: viewEtiquetas }
];

const ITENS_MENU = [
  ['#/', 'Painel', 'painel'],
  ['#/itens', 'Itens', 'box'],
  ['#/entrada', 'Entrada', 'entrada'],
  ['#/saida', 'Saída', 'saida'],
  ['#/colaboradores', 'Colaboradores', 'colaboradores'],
  ['#/projetos', 'Projetos', 'projetos'],
  ['#/materiais-referencia', 'Materiais de Referência', 'frasco'],
  ['#/etiquetas', 'Etiquetas', 'etiqueta']
];

function layoutBase() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${MODO_DEMO ? '<div class="mock-aviso">Modo de demonstração — os dados ficam só neste navegador. Configure o Apps Script/Netlify para usar em produção.</div>' : ''}
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="logo-icone">${icons.logo}</div>
          <div class="nome-sistema">Controle<br /><small>Insumos &amp; Patrimônio</small></div>
        </div>
        <nav class="sidebar-nav" id="menu"></nav>
        <div class="sidebar-user">
          <div class="avatar">${iniciaisNome('Administrador')}</div>
          <div class="info">
            <div class="nome">Administrador</div>
            <div class="papel">${MODO_DEMO ? 'Modo demonstração' : 'Sessão ativa'}</div>
          </div>
          <button id="btn-sair" class="no-print" title="Sair" aria-label="Sair">${icons.sair}</button>
        </div>
      </aside>
      <div class="overlay-sidebar no-print" id="overlay-sidebar"></div>
      <div class="shell-main">
        <header class="topbar no-print">
          <button class="botao-hamburger" id="btn-hamburger" aria-label="Abrir menu">${icons.menu}</button>
          <div class="topbar-busca">
            ${icons.busca}
            <input type="search" id="busca-global" placeholder="Buscar item, colaborador, projeto..." />
          </div>
          <div class="topbar-acoes">
            <button class="icon-btn" id="btn-notificacoes" aria-label="Notificações">
              ${icons.sino}
              <span class="contador" id="contador-avisos" style="display:none">0</span>
            </button>
          </div>
        </header>
        <main id="main" class="content"></main>
      </div>
    </div>
  `;

  document.getElementById('btn-sair').addEventListener('click', async () => {
    await api.logout();
    marcarLogado(false);
    location.hash = '#/login';
  });

  document.getElementById('btn-hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('aberta');
    document.getElementById('overlay-sidebar').classList.toggle('ativa');
  });
  document.getElementById('overlay-sidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('aberta');
    document.getElementById('overlay-sidebar').classList.remove('ativa');
  });

  document.getElementById('busca-global').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      sessionStorage.setItem('cip_busca_global', e.target.value.trim());
      location.hash = '#/itens';
    }
  });

  document.getElementById('btn-notificacoes').addEventListener('click', (e) => {
    e.stopPropagation();
    abrirDropdownNotificacoes();
  });

  atualizarContadorAvisos();
}

async function atualizarContadorAvisos() {
  try {
    const avisos = await api.avisos(60);
    const contador = document.getElementById('contador-avisos');
    if (!contador) return;
    if (avisos.length > 0) {
      contador.textContent = avisos.length > 9 ? '9+' : avisos.length;
      contador.style.display = 'flex';
    } else {
      contador.style.display = 'none';
    }
  } catch (err) { /* silencioso: sem sessão ainda, por exemplo */ }
}

async function abrirDropdownNotificacoes() {
  const existente = document.querySelector('.painel-dropdown');
  if (existente) { existente.remove(); return; }

  const painel = document.createElement('div');
  painel.className = 'painel-dropdown';
  painel.innerHTML = '<div class="titulo">Avisos</div><div class="vazio">Carregando...</div>';
  document.querySelector('.topbar-acoes').appendChild(painel);

  const fechar = (e) => {
    if (!painel.contains(e.target)) { painel.remove(); document.removeEventListener('click', fechar); }
  };
  setTimeout(() => document.addEventListener('click', fechar), 0);

  try {
    const avisos = await api.avisos(60);
    painel.innerHTML = `
      <div class="titulo">Avisos (${avisos.length})</div>
      ${avisos.length === 0
        ? '<div class="vazio">Nenhum aviso no momento.</div>'
        : avisos.slice(0, 8).map((a) => `
          <a class="item" href="#/item/${encodeURIComponent(a.id)}" style="display:block">
            <strong>${a.tipo}</strong> — ${a.descricao || a.id}<br/>
            <span style="color:var(--text-muted)">vence em ${formatarData(a.data)} ${a.diasRestantes < 0 ? '(vencido)' : `(${a.diasRestantes}d)`}</span>
          </a>
        `).join('')}
    `;
  } catch (err) {
    painel.innerHTML = `<div class="vazio">Erro ao carregar avisos.</div>`;
  }
}

function atualizarMenu() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  const atual = location.hash || '#/';
  menu.innerHTML = ITENS_MENU.map(([href, rotulo, icone]) =>
    `<a href="${href}" class="${atual === href ? 'ativo' : ''}">${icons[icone] || ''}<span>${rotulo}</span></a>`
  ).join('');
  document.getElementById('sidebar')?.classList.remove('aberta');
  document.getElementById('overlay-sidebar')?.classList.remove('ativa');
}

async function rotear() {
  const hash = location.hash || '#/';

  if (hash !== '#/login' && !estaLogado()) {
    location.hash = '#/login';
    return;
  }

  const rota = ROTAS.find((r) => r.padrao.test(hash)) || { view: viewDashboard };
  const match = rota.padrao ? hash.match(rota.padrao) : null;
  const params = {};
  if (rota.params && match) rota.params.forEach((nome, i) => { params[nome] = decodeURIComponent(match[i + 1]); });

  if (rota.semShell) {
    document.getElementById('app').innerHTML = MODO_DEMO ? '<div class="mock-aviso">Modo de demonstração — os dados ficam só neste navegador.</div>' : '';
    const container = document.createElement('div');
    document.getElementById('app').appendChild(container);
    try {
      await rota.view(container, params);
    } catch (err) {
      container.innerHTML = `<p class="msg-erro">${err.message}</p>`;
    }
    return;
  }

  if (!document.getElementById('menu')) layoutBase();
  atualizarMenu();

  const main = document.getElementById('main');
  main.innerHTML = '<p style="color:var(--text-muted)">Carregando...</p>';
  try {
    await rota.view(main, params);
  } catch (err) {
    main.innerHTML = `<div class="card"><p class="msg-erro">Erro ao carregar a página: ${err.message}</p></div>`;
  }
  atualizarContadorAvisos();
}

window.addEventListener('sessao-expirada', () => {
  marcarLogado(false);
  document.getElementById('app').innerHTML = '';
  location.hash = '#/login';
});

window.addEventListener('hashchange', rotear);
window.addEventListener('DOMContentLoaded', rotear);
rotear();
