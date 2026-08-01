import { api } from '../api.js';
import { escapeHtml, formatarData, formatarMoeda, ordenarPor, paginar, classeBadgeStatus, abrirModal, fecharModal, paraData } from '../util.js';
import { icons } from '../icons.js';

const STATUS = ['Em estoque', 'Em locação', 'Em manutenção', 'Fora de uso'];

// Campos do cadastro que podem ser corrigidos depois de criado. Ficam de fora
// Status e ColaboradorAtual — esses continuam só pelas ações de locação/devolução,
// que já registram o histórico certo (evita um jeito "por trás" de mudar quem
// está com o equipamento sem passar pelo fluxo de locação).
function camposEdicaoEquipamento(e = {}) {
  return `
    <label>Código <input value="${escapeHtml(e.ID || '')}" disabled /></label>
    <div class="grid cols-2">
      <label>Descrição <input name="Descricao" value="${escapeHtml(e.Descricao || '')}" /></label>
      <label>Modelo <input name="Modelo" value="${escapeHtml(e.Modelo || '')}" /></label>
    </div>
    <div class="grid cols-2">
      <label>Marca <input name="Marca" value="${escapeHtml(e.Marca || '')}" /></label>
      <label>Nº de série <input name="NumeroSerie" value="${escapeHtml(e.NumeroSerie || '')}" /></label>
    </div>
    <label>Local de armazenamento <input name="LocalArmazenamento" value="${escapeHtml(e.LocalArmazenamento || '')}" /></label>
    <div class="grid cols-2">
      <label>Valor pago <input name="ValorPago" type="number" step="0.01" value="${escapeHtml(e.ValorPago || '')}" /></label>
      <label>Fornecedor <input name="Fornecedor" value="${escapeHtml(e.Fornecedor || '')}" /></label>
    </div>
    <label>Data da compra <input name="DataCompra" type="date" value="${e.DataCompra ? escapeHtml(String(e.DataCompra).slice(0, 10)) : ''}" /></label>
    <div class="grid cols-2">
      <label>Última calibração <input name="UltimaCalibracao" type="date" value="${e.UltimaCalibracao ? escapeHtml(String(e.UltimaCalibracao).slice(0, 10)) : ''}" /></label>
      <label>Próxima calibração <input name="ProximaCalibracao" type="date" value="${e.ProximaCalibracao ? escapeHtml(String(e.ProximaCalibracao).slice(0, 10)) : ''}" /></label>
    </div>
    <label>Nº do certificado de calibração <input name="NumeroCertificadoCalibracao" value="${escapeHtml(e.NumeroCertificadoCalibracao || '')}" /></label>
    <label>Observações <textarea name="Observacoes">${escapeHtml(e.Observacoes || '')}</textarea></label>
  `;
}
const POR_PAGINA = 10;

function classeCalibracao(dias) {
  if (dias === null) return '';
  if (dias < 0) return 'fora';
  if (dias <= 30) return 'manutencao';
  return 'estoque';
}

function diasAte(dataStr) {
  if (!dataStr) return null;
  const data = paraData(dataStr);
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
    { campo: 'Modelo', rotulo: 'Modelo' },
    { campo: 'Status', rotulo: 'Status' },
    { campo: 'ColaboradorAtual', rotulo: 'Responsável / Projeto' },
    { campo: 'ProximaCalibracao', rotulo: 'Próxima calibração' },
    { campo: null, rotulo: 'Ações' }
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
      <tr data-id="${escapeHtml(e.ID)}" title="Clique duas vezes para editar o cadastro">
        <td><a href="#/equipamento/${encodeURIComponent(e.ID)}">${escapeHtml(e.ID)}</a></td>
        <td>${escapeHtml(e.Descricao)}</td>
        <td>${escapeHtml(e.Modelo || '-')}</td>
        <td><span class="badge ${classeBadgeStatus(e.Status)}">${escapeHtml(e.Status)}</span></td>
        <td>${escapeHtml(e.ColaboradorAtual || '-')}</td>
        <td>${e.ProximaCalibracao ? `<span class="badge ${classeCalibracao(dias)}">${formatarData(e.ProximaCalibracao)}${dias !== null ? ` (${dias < 0 ? 'vencida há ' + Math.abs(dias) + 'd' : dias + 'd'})` : ''}</span>` : '-'}</td>
        <td class="no-print acoes">
          <button type="button" class="secundario icone-only btn-editar-equipamento" data-id="${escapeHtml(e.ID)}" title="Editar cadastro">${icons.editar}</button>
        </td>
      </tr>
    `;
  }

  function renderizarTabela() {
    const filtrados = filtrarOrdenar();
    const { itens: pagina, totalPaginas, paginaAtual, total } = paginar(filtrados, estado.pagina, POR_PAGINA);
    estado.pagina = paginaAtual;

    const corpo = main.querySelector('#corpo-tabela');
    corpo.innerHTML = pagina.length ? pagina.map(linhaHtml).join('') : '<tr><td colspan="7" style="text-align:center; color:var(--text-muted)">Nenhum equipamento encontrado.</td></tr>';

    ligarAcoesLinha();

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
              ${COLUNAS.map((c) => c.campo
                ? `<th class="ordenavel" data-campo="${c.campo}">${c.rotulo} <span class="seta-ordenar"></span></th>`
                : `<th class="no-print">${c.rotulo}</th>`
              ).join('')}
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

  function abrirEdicaoEquipamento(equipamento) {
    abrirModal({
      titulo: `Editar ${equipamento.ID}`,
      conteudoHtml: `
        <form id="form-editar-equipamento">
          ${camposEdicaoEquipamento(equipamento)}
          <p class="msg-erro" id="erro-editar-equipamento" style="display:none"></p>
          <div class="acoes">
            <button type="submit">Salvar alterações</button>
          </div>
        </form>
      `
    });
    document.getElementById('form-editar-equipamento').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      const erroEl = document.getElementById('erro-editar-equipamento');
      erroEl.style.display = 'none';
      try {
        await api.editarEquipamento({ ID: equipamento.ID, ...dados });
        fecharModal();
        await viewEquipamentos(main);
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      }
    });
  }

  function ligarAcoesLinha() {
    main.querySelectorAll('.btn-editar-equipamento').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const equipamento = equipamentos.find((eq) => String(eq.ID) === btn.dataset.id);
        if (equipamento) abrirEdicaoEquipamento(equipamento);
      });
    });
    main.querySelectorAll('#corpo-tabela tr[data-id]').forEach((tr) => {
      tr.addEventListener('dblclick', () => {
        const equipamento = equipamentos.find((eq) => String(eq.ID) === tr.dataset.id);
        if (equipamento) abrirEdicaoEquipamento(equipamento);
      });
    });
  }
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
        <label>Descrição
          <input name="Descricao" />
        </label>
        <label>Marca
          <input name="Marca" />
        </label>
        <label>Modelo
          <input name="Modelo" />
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
