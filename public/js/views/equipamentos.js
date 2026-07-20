import { api } from '../api.js';
import { escapeHtml, formatarData, formatarMoeda, ordenarPor, paginar, classeBadgeStatus } from '../util.js';
import { icons } from '../icons.js';

const STATUS = ['Em estoque', 'Em locação', 'Em manutenção', 'Fora de uso'];
const POR_PAGINA = 10;

function classeCalibracao(dias) {
  if (dias === null) return '';
  if (dias < 0) return 'fora';
  if (dias <= 30) return 'manutencao';
  return 'estoque';
}

function diasAte(dataStr) {
  if (!dataStr) return null;
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  return Math.round((data - hoje) / (1000 * 60 * 60 * 24));
}

export async function viewEquipamentos(main) {
  const equipamentos = await api.listEquipamentos();

  let estado = { busca: '', status: '', ordenarCampo: 'ID', ordenarDirecao: 'asc', pagina: 1 };

  const COLUNAS = [
    { campo: 'ID', rotulo: 'Código' },
    { campo: 'Descricao', rotulo: 'Descrição' },
    { campo: 'Status', rotulo: 'Status' },
    { campo: 'ColaboradorAtual', rotulo: 'Responsável / Projeto' },
    { campo: 'ProximaCalibracao', rotulo: 'Próxima calibração' }
  ];

  function filtrarOrdenar() {
    const busca = estado.busca.toLowerCase();
    let lista = equipamentos.filter((e) => {
      const texto = `${e.ID} ${e.Descricao} ${e.ColaboradorAtual}`.toLowerCase();
      return (!busca || texto.includes(busca)) && (!estado.status || e.Status === estado.status);
    });
    lista = ordenarPor(lista, estado.ordenarCampo, estado.ordenarDirecao);
    return lista;
  }

  function linhaHtml(e) {
    const dias = diasAte(e.ProximaCalibracao);
    return `
      <tr>
        <td><a href="#/equipamento/${encodeURIComponent(e.ID)}">${escapeHtml(e.ID)}</a></td>
        <td>${escapeHtml(e.Descricao)}</td>
        <td><span class="badge ${classeBadgeStatus(e.Status)}">${escapeHtml(e.Status)}</span></td>
        <td>${escapeHtml(e.ColaboradorAtual || '-')}</td>
        <td>${e.ProximaCalibracao ? `<span class="badge ${classeCalibracao(dias)}">${formatarData(e.ProximaCalibracao)}${dias !== null ? ` (${dias < 0 ? 'vencida há ' + Math.abs(dias) + 'd' : dias + 'd'})` : ''}</span>` : '-'}</td>
      </tr>
    `;
  }

  function renderizarTabela() {
    const filtrados = filtrarOrdenar();
    const { itens: pagina, totalPaginas, paginaAtual, total } = paginar(filtrados, estado.pagina, POR_PAGINA);
    estado.pagina = paginaAtual;

    const corpo = main.querySelector('#corpo-tabela');
    corpo.innerHTML = pagina.length ? pagina.map(linhaHtml).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">Nenhum equipamento encontrado.</td></tr>';

    main.querySelectorAll('th.ordenavel').forEach((th) => {
      const campo = th.dataset.campo;
      th.classList.toggle('ordenado', campo === estado.ordenarCampo);
      th.querySelector('.seta-ordenar').innerHTML = campo === estado.ordenarCampo && estado.ordenarDirecao === 'desc'
        ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>'
        : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 15l6-6 6 6"/></svg>';
    });

    document.getElementById('paginacao-info').textContent = total === 0 ? 'Nenhum equipamento' : `${total} equipamento${total === 1 ? '' : 's'} · página ${paginaAtual} de ${totalPaginas}`;
    document.getElementById('btn-pag-anterior').disabled = paginaAtual <= 1;
    document.getElementById('btn-pag-proxima').disabled = paginaAtual >= totalPaginas;
  }

  main.innerHTML = `
    <div class="pagina-titulo acoes" style="justify-content: space-between; align-items:center">
      <div>
        <h2>Equipamentos</h2>
        <div class="subtitulo">Equipamentos de medição/laboratório — calibração e locação a projetos</div>
      </div>
      <a class="btn" href="#/equipamentos/novo">${icons.mais} Novo equipamento</a>
    </div>

    <div class="card">
      <div class="tabela-toolbar">
        <div class="topbar-busca" style="flex:1">
          ${icons.busca}
          <input type="search" id="filtro-busca" placeholder="código, descrição, responsável..." />
        </div>
        <select id="filtro-status"><option value="">Todos os status</option>${STATUS.map((s) => `<option>${s}</option>`).join('')}</select>
      </div>
      <div class="tabela-wrap">
        <table>
          <thead>
            <tr>
              ${COLUNAS.map((c) => `<th class="ordenavel" data-campo="${c.campo}">${c.rotulo} <span class="seta-ordenar"></span></th>`).join('')}
            </tr>
          </thead>
          <tbody id="corpo-tabela"></tbody>
        </table>
      </div>
      <div class="paginacao">
        <span class="info" id="paginacao-info"></span>
        <div class="botoes">
          <button type="button" class="secundario" id="btn-pag-anterior">Anterior</button>
          <button type="button" class="secundario" id="btn-pag-proxima">Próxima</button>
        </div>
      </div>
    </div>
  `;

  renderizarTabela();

  document.getElementById('filtro-busca').addEventListener('input', (e) => { estado.busca = e.target.value; estado.pagina = 1; renderizarTabela(); });
  document.getElementById('filtro-status').addEventListener('change', (e) => { estado.status = e.target.value; estado.pagina = 1; renderizarTabela(); });
  document.getElementById('btn-pag-anterior').addEventListener('click', () => { estado.pagina--; renderizarTabela(); });
  document.getElementById('btn-pag-proxima').addEventListener('click', () => { estado.pagina++; renderizarTabela(); });
  main.querySelectorAll('th.ordenavel').forEach((th) => {
    th.addEventListener('click', () => {
      const campo = th.dataset.campo;
      if (estado.ordenarCampo === campo) estado.ordenarDirecao = estado.ordenarDirecao === 'asc' ? 'desc' : 'asc';
      else { estado.ordenarCampo = campo; estado.ordenarDirecao = 'asc'; }
      renderizarTabela();
    });
  });
}

export async function viewEquipamentoForm(main) {
  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Novo equipamento</h2>
      <div class="subtitulo">Cadastre um equipamento de medição/laboratório</div>
    </div>
    <div class="card">
      <form id="form-equipamento" class="form-largo grid cols-2">
        <label>Código do equipamento (ex: MP-01, BA-02) *
          <input name="ID" required />
        </label>
        <label>Descrição / Modelo
          <input name="Descricao" />
        </label>
        <label>Marca
          <input name="Marca" />
        </label>
        <label>Nº de série
          <input name="NumeroSerie" />
        </label>
        <label>Local de armazenamento
          <input name="LocalArmazenamento" placeholder="ex: Sala da Logística" />
        </label>
        <label>Valor pago
          <input name="ValorPago" type="number" step="0.01" />
        </label>
        <label>Fornecedor
          <input name="Fornecedor" />
        </label>
        <label>Data da compra
          <input name="DataCompra" type="date" />
        </label>
        <label>Última calibração
          <input name="UltimaCalibracao" type="date" />
        </label>
        <label>Próxima calibração
          <input name="ProximaCalibracao" type="date" />
        </label>
        <label>Nº do certificado de calibração
          <input name="NumeroCertificadoCalibracao" />
        </label>
        <label style="grid-column: 1 / -1">Observações
          <textarea name="Observacoes"></textarea>
        </label>
        <div style="grid-column: 1 / -1">
          <p class="msg-erro" id="erro-equipamento" style="display:none"></p>
          <div class="acoes">
            <button type="submit">Salvar equipamento</button>
            <a class="btn secundario" href="#/equipamentos">Cancelar</a>
          </div>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-equipamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target).entries());
    const erroEl = document.getElementById('erro-equipamento');
    erroEl.style.display = 'none';
    try {
      await api.criarEquipamento(dados);
      location.hash = `#/equipamento/${encodeURIComponent(dados.ID)}`;
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });
}
