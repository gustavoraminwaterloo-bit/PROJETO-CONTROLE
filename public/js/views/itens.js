import { api } from '../api.js';
import { escapeHtml, classeBadgeStatus, formatarMoeda, ordenarPor, paginar, abrirModal, fecharModal } from '../util.js';
import { icons } from '../icons.js';

const CATEGORIAS_BASE = ['Notebook', 'Celular', 'Mouse', 'Teclado', 'Mousepad', 'Suporte', 'Adaptador de Tela', 'Monitor', 'Outro'];
const STATUS = ['Em estoque', 'Com colaborador', 'Em projeto', 'Em manutenção', 'Fora de uso'];
const POR_PAGINA = 10;

export async function viewItens(main) {
  const itens = await api.listItens();

  let estado = { busca: '', categoria: '', status: '', ordenarCampo: 'ID', ordenarDirecao: 'asc', pagina: 1 };
  const buscaPendente = sessionStorage.getItem('cip_busca_global');
  if (buscaPendente) { estado.busca = buscaPendente; sessionStorage.removeItem('cip_busca_global'); }

  const COLUNAS = [
    { campo: 'ID', rotulo: 'Código' },
    { campo: 'Categoria', rotulo: 'Categoria' },
    { campo: 'Descricao', rotulo: 'Descrição' },
    { campo: 'Status', rotulo: 'Status' },
    { campo: 'ColaboradorAtual', rotulo: 'Colaborador' },
    { campo: 'ValorPago', rotulo: 'Valor' }
  ];

  function filtrarOrdenar() {
    const busca = estado.busca.toLowerCase();
    let lista = itens.filter((i) => {
      const texto = `${i.ID} ${i.Descricao} ${i.ColaboradorAtual}`.toLowerCase();
      return (!busca || texto.includes(busca)) && (!estado.categoria || i.Categoria === estado.categoria) && (!estado.status || i.Status === estado.status);
    });
    lista = ordenarPor(lista, estado.ordenarCampo, estado.ordenarDirecao);
    return lista;
  }

  function linhaHtml(i) {
    return `
      <tr>
        <td><a href="#/item/${encodeURIComponent(i.ID)}">${escapeHtml(i.ID)}</a></td>
        <td>${escapeHtml(i.Categoria)}</td>
        <td>${escapeHtml(i.Descricao)}</td>
        <td><span class="badge ${classeBadgeStatus(i.Status)}">${escapeHtml(i.Status)}</span></td>
        <td>${escapeHtml(i.ColaboradorAtual || '-')}</td>
        <td>${i.ValorPago ? formatarMoeda(i.ValorPago) : '-'}</td>
      </tr>
    `;
  }

  function renderizarTabela() {
    const filtrados = filtrarOrdenar();
    const { itens: pagina, totalPaginas, paginaAtual, total } = paginar(filtrados, estado.pagina, POR_PAGINA);
    estado.pagina = paginaAtual;

    const corpo = main.querySelector('#corpo-tabela');
    corpo.innerHTML = pagina.length ? pagina.map(linhaHtml).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">Nenhum item encontrado.</td></tr>';

    main.querySelectorAll('th.ordenavel').forEach((th) => {
      const campo = th.dataset.campo;
      th.classList.toggle('ordenado', campo === estado.ordenarCampo);
      th.querySelector('.seta-ordenar').innerHTML = campo === estado.ordenarCampo && estado.ordenarDirecao === 'desc'
        ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>'
        : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 15l6-6 6 6"/></svg>';
    });

    document.getElementById('paginacao-info').textContent = total === 0 ? 'Nenhum item' : `${total} ite${total === 1 ? 'm' : 'ns'} · página ${paginaAtual} de ${totalPaginas}`;
    document.getElementById('btn-pag-anterior').disabled = paginaAtual <= 1;
    document.getElementById('btn-pag-proxima').disabled = paginaAtual >= totalPaginas;
  }

  main.innerHTML = `
    <div class="pagina-titulo acoes" style="justify-content: space-between; align-items:center">
      <div>
        <h2>Itens</h2>
        <div class="subtitulo">${itens.length} itens cadastrados no total</div>
      </div>
      <a class="btn" href="#/itens/novo">${icons.mais} Novo item</a>
    </div>

    <div class="card">
      <div class="tabela-toolbar">
        <div class="topbar-busca" style="flex:1">
          ${icons.busca}
          <input type="search" id="filtro-busca" placeholder="código, descrição, colaborador..." value="${escapeHtml(estado.busca)}" />
        </div>
        <select id="filtro-categoria"><option value="">Todas as categorias</option>${CATEGORIAS_BASE.map((c) => `<option ${estado.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <select id="filtro-status"><option value="">Todos os status</option>${STATUS.map((s) => `<option ${estado.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
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
  document.getElementById('filtro-categoria').addEventListener('change', (e) => { estado.categoria = e.target.value; estado.pagina = 1; renderizarTabela(); });
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

export async function viewItemForm(main) {
  const [itensExistentes, colaboradores, projetos] = await Promise.all([api.listItens(), api.listColaboradores(), api.listProjetos()]);
  const categoriasExistentes = [...new Set(itensExistentes.map((i) => i.Categoria).filter(Boolean))];
  const categorias = [...new Set([...CATEGORIAS_BASE, ...categoriasExistentes])];

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Novo item</h2>
      <div class="subtitulo">Cadastre um equipamento, insumo ou material de patrimônio</div>
    </div>
    <div class="card">
      <form id="form-item" class="form-largo grid cols-2">
        <label>Código do item (ex: NB-001, MP-01) *
          <input name="ID" required />
        </label>
        <label>Categoria
          <div class="campo-com-acao">
            <select id="sel-categoria" name="Categoria">${categorias.map((c) => `<option>${escapeHtml(c)}</option>`).join('')}</select>
            <button type="button" class="secundario icone-only" id="btn-nova-categoria" title="Nova categoria">${icons.mais}</button>
          </div>
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
        <label>Colaborador portador (opcional)
          <div class="campo-com-acao">
            <select id="sel-colaborador">
              <option value="">Nenhum — fica em estoque</option>
              ${colaboradores.map((c) => `<option>${escapeHtml(c.Nome)}</option>`).join('')}
            </select>
            <button type="button" class="secundario icone-only" id="btn-novo-colaborador" title="Novo colaborador">${icons.mais}</button>
          </div>
        </label>
        <label>Projeto (opcional — para atribuir o custo deste item a um projeto)
          <input name="ProjetoDestino" list="lista-projetos-item" placeholder="deixe em branco se não for o caso" />
          <datalist id="lista-projetos-item">${projetos.map((p) => `<option value="${escapeHtml(p.Codigo)}">`).join('')}</datalist>
        </label>
        <label style="grid-column: 1 / -1">Observações
          <textarea name="Observacoes"></textarea>
        </label>
        <div style="grid-column: 1 / -1">
          <p class="msg-erro" id="erro-item" style="display:none"></p>
          <div class="acoes">
            <button type="submit">Salvar item</button>
            <a class="btn secundario" href="#/itens">Cancelar</a>
          </div>
        </div>
      </form>
    </div>
  `;

  document.getElementById('btn-nova-categoria').addEventListener('click', () => {
    abrirModal({
      titulo: 'Nova categoria',
      conteudoHtml: `
        <form id="form-nova-categoria">
          <label>Nome da categoria * <input name="nome" required autofocus /></label>
          <div class="acoes"><button type="submit">Adicionar</button></div>
        </form>
      `
    });
    document.getElementById('form-nova-categoria').addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = new FormData(e.target).get('nome').trim();
      if (!nome) return;
      const select = document.getElementById('sel-categoria');
      const opcao = document.createElement('option');
      opcao.textContent = nome;
      select.appendChild(opcao);
      select.value = nome;
      fecharModal();
    });
  });

  document.getElementById('btn-novo-colaborador').addEventListener('click', () => {
    abrirModal({
      titulo: 'Novo colaborador',
      conteudoHtml: `
        <form id="form-novo-colaborador">
          <label>Nome * <input name="Nome" required autofocus /></label>
          <label>Cargo <input name="Cargo" /></label>
          <p class="msg-erro" id="erro-novo-colaborador" style="display:none"></p>
          <div class="acoes"><button type="submit">Adicionar</button></div>
        </form>
      `
    });
    document.getElementById('form-novo-colaborador').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      try {
        await api.criarColaborador(dados);
        const select = document.getElementById('sel-colaborador');
        const opcao = document.createElement('option');
        opcao.textContent = dados.Nome;
        select.appendChild(opcao);
        select.value = dados.Nome;
        fecharModal();
      } catch (err) {
        const erroEl = document.getElementById('erro-novo-colaborador');
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      }
    });
  });

  document.getElementById('form-item').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target).entries());
    const colaboradorEscolhido = document.getElementById('sel-colaborador').value;
    const erroEl = document.getElementById('erro-item');
    erroEl.style.display = 'none';
    try {
      if (colaboradorEscolhido) {
        dados.Status = 'Com colaborador';
        dados.ColaboradorAtual = colaboradorEscolhido;
      }
      await api.criarItem(dados);
      if (colaboradorEscolhido) {
        await api.alocarColaborador({ ItemID: dados.ID, ColaboradorEnvolvido: colaboradorEscolhido, ProjetoDestino: dados.ProjetoDestino, Observacoes: 'Cadastro inicial do item' });
      }
      location.hash = `#/item/${encodeURIComponent(dados.ID)}`;
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });
}
