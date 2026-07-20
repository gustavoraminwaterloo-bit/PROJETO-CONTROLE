import { api } from '../api.js';
import { escapeHtml, formatarMoeda, ordenarPor, paginar, classeBadgeStatus } from '../util.js';
import { icons } from '../icons.js';

const STATUS = ['Em estoque', 'Com colaborador', 'Em manutenção', 'Fora de uso'];
const POR_PAGINA = 10;

export async function viewVeiculos(main) {
  const veiculos = await api.listVeiculos();

  let estado = { busca: '', status: '', ordenarCampo: 'ID', ordenarDirecao: 'asc', pagina: 1 };

  const COLUNAS = [
    { campo: 'ID', rotulo: 'Código' },
    { campo: 'Placa', rotulo: 'Placa' },
    { campo: 'Descricao', rotulo: 'Modelo' },
    { campo: 'Status', rotulo: 'Status' },
    { campo: 'ColaboradorAtual', rotulo: 'Responsável' },
    { campo: 'Quilometragem', rotulo: 'Quilometragem' }
  ];

  function filtrarOrdenar() {
    const busca = estado.busca.toLowerCase();
    let lista = veiculos.filter((v) => {
      const texto = `${v.ID} ${v.Placa} ${v.Descricao} ${v.ColaboradorAtual}`.toLowerCase();
      return (!busca || texto.includes(busca)) && (!estado.status || v.Status === estado.status);
    });
    lista = ordenarPor(lista, estado.ordenarCampo, estado.ordenarDirecao);
    return lista;
  }

  function linhaHtml(v) {
    return `
      <tr>
        <td><a href="#/veiculo/${encodeURIComponent(v.ID)}">${escapeHtml(v.ID)}</a></td>
        <td>${escapeHtml(v.Placa)}</td>
        <td>${escapeHtml(v.Descricao)}</td>
        <td><span class="badge ${classeBadgeStatus(v.Status)}">${escapeHtml(v.Status)}</span></td>
        <td>${escapeHtml(v.ColaboradorAtual || '-')}</td>
        <td>${v.Quilometragem ? Number(v.Quilometragem).toLocaleString('pt-BR') + ' km' : '-'}</td>
      </tr>
    `;
  }

  function renderizarTabela() {
    const filtrados = filtrarOrdenar();
    const { itens: pagina, totalPaginas, paginaAtual, total } = paginar(filtrados, estado.pagina, POR_PAGINA);
    estado.pagina = paginaAtual;

    const corpo = main.querySelector('#corpo-tabela');
    corpo.innerHTML = pagina.length ? pagina.map(linhaHtml).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">Nenhum veículo encontrado.</td></tr>';

    main.querySelectorAll('th.ordenavel').forEach((th) => {
      const campo = th.dataset.campo;
      th.classList.toggle('ordenado', campo === estado.ordenarCampo);
      th.querySelector('.seta-ordenar').innerHTML = campo === estado.ordenarCampo && estado.ordenarDirecao === 'desc'
        ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>'
        : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 15l6-6 6 6"/></svg>';
    });

    document.getElementById('paginacao-info').textContent = total === 0 ? 'Nenhum veículo' : `${total} veículo${total === 1 ? '' : 's'} · página ${paginaAtual} de ${totalPaginas}`;
    document.getElementById('btn-pag-anterior').disabled = paginaAtual <= 1;
    document.getElementById('btn-pag-proxima').disabled = paginaAtual >= totalPaginas;
  }

  main.innerHTML = `
    <div class="pagina-titulo acoes" style="justify-content: space-between; align-items:center">
      <div>
        <h2>Veículos</h2>
        <div class="subtitulo">Frota de veículos — alocação fixa a colaboradores (técnicos)</div>
      </div>
      <a class="btn" href="#/veiculos/novo">${icons.mais} Novo veículo</a>
    </div>

    <div class="card">
      <div class="tabela-toolbar">
        <div class="topbar-busca" style="flex:1">
          ${icons.busca}
          <input type="search" id="filtro-busca" placeholder="código, placa, modelo, responsável..." />
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

export async function viewVeiculoForm(main) {
  const colaboradores = await api.listColaboradores();

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Novo veículo</h2>
      <div class="subtitulo">Cadastre um veículo da frota</div>
    </div>
    <div class="card">
      <form id="form-veiculo" class="form-largo grid cols-2">
        <label>Código do veículo (ex: CARRO-01) *
          <input name="ID" required />
        </label>
        <label>Placa
          <input name="Placa" placeholder="ABC1D23" />
        </label>
        <label>Modelo
          <input name="Descricao" placeholder="ex: Fiat Strada" />
        </label>
        <label>Marca
          <input name="Marca" />
        </label>
        <label>Ano
          <input name="Ano" />
        </label>
        <label>Quilometragem
          <input name="Quilometragem" type="number" />
        </label>
        <label>Colaborador responsável (opcional)
          <select name="ColaboradorAtual">
            <option value="">Nenhum — fica disponível</option>
            ${colaboradores.map((c) => `<option>${escapeHtml(c.Nome)}</option>`).join('')}
          </select>
        </label>
        <label>Local (quando não estiver com ninguém)
          <input name="LocalArmazenamento" placeholder="ex: Garagem" />
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
        <label style="grid-column: 1 / -1">Observações
          <textarea name="Observacoes"></textarea>
        </label>
        <div style="grid-column: 1 / -1">
          <p class="msg-erro" id="erro-veiculo" style="display:none"></p>
          <div class="acoes">
            <button type="submit">Salvar veículo</button>
            <a class="btn secundario" href="#/veiculos">Cancelar</a>
          </div>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-veiculo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target).entries());
    if (dados.ColaboradorAtual) dados.Status = 'Com colaborador';
    const erroEl = document.getElementById('erro-veiculo');
    erroEl.style.display = 'none';
    try {
      await api.criarVeiculo(dados);
      if (dados.ColaboradorAtual) {
        await api.alocarColaborador({ ItemID: dados.ID, ColaboradorEnvolvido: dados.ColaboradorAtual, Observacoes: 'Cadastro inicial do veículo' });
      }
      location.hash = `#/veiculo/${encodeURIComponent(dados.ID)}`;
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });
}
