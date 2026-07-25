import { api } from '../api.js';
import { escapeHtml, formatarDataHora, classeBadgeStatus, ordenarPor, paginar, abrirModal, fecharModal } from '../util.js';
import { icons } from '../icons.js';
import { nomeAtual, eAdmin } from '../app.js';

const STATUS = ['Agendado', 'Em andamento', 'Concluído', 'Cancelado'];
const POR_PAGINA = 10;

function agoraParaInputDatetime(minutosOffset = 0) {
  const d = new Date(Date.now() + minutosOffset * 60000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export async function viewReservas(main) {
  const [reservas, veiculos] = await Promise.all([api.listReservas(), api.listVeiculos()]);
  const veiculoPorId = Object.fromEntries(veiculos.map((v) => [v.ID, v]));

  let estado = { busca: '', status: '', ordenarCampo: 'DataHoraSaida', ordenarDirecao: 'desc', pagina: 1 };

  function filtrarOrdenar() {
    const busca = estado.busca.toLowerCase();
    let lista = reservas.filter((r) => {
      const veiculo = veiculoPorId[r.VeiculoID];
      const texto = `${r.VeiculoID} ${veiculo ? veiculo.Descricao : ''} ${r.Colaborador} ${r.Projeto || ''}`.toLowerCase();
      return (!busca || texto.includes(busca)) && (!estado.status || r.Status === estado.status);
    });
    lista = ordenarPor(lista, estado.ordenarCampo, estado.ordenarDirecao);
    return lista;
  }

  function linhaHtml(r) {
    const veiculo = veiculoPorId[r.VeiculoID];
    const acoes = [];
    if (r.Status === 'Agendado') acoes.push(`<button type="button" class="secundario" data-acao="iniciar" data-id="${escapeHtml(r.ID)}">Iniciar retirada</button>`);
    if (r.Status === 'Agendado' || r.Status === 'Em andamento') {
      acoes.push(`<button type="button" class="secundario" data-acao="retorno" data-id="${escapeHtml(r.ID)}">Registrar retorno</button>`);
      acoes.push(`<button type="button" class="secundario perigo" data-acao="cancelar" data-id="${escapeHtml(r.ID)}">Cancelar</button>`);
    }
    return `
      <tr>
        <td><a href="#/veiculo/${encodeURIComponent(r.VeiculoID)}">${escapeHtml(r.VeiculoID)}</a>${veiculo ? `<br/><span style="color:var(--text-muted)">${escapeHtml(veiculo.Descricao)}</span>` : ''}</td>
        <td>${escapeHtml(r.Colaborador)}${r.Projeto ? `<br/><span style="color:var(--text-muted)">${escapeHtml(r.Projeto)}</span>` : ''}</td>
        <td>${formatarDataHora(r.DataHoraSaida)}</td>
        <td>${formatarDataHora(r.DataHoraRetorno || r.PrevisaoRetorno)}</td>
        <td><span class="badge ${classeBadgeStatus(r.Status)}">${escapeHtml(r.Status)}</span></td>
        <td class="no-print acoes">${acoes.join('')}</td>
      </tr>
    `;
  }

  function renderizarTabela() {
    const filtrados = filtrarOrdenar();
    const { itens: pagina, totalPaginas, paginaAtual, total } = paginar(filtrados, estado.pagina, POR_PAGINA);
    estado.pagina = paginaAtual;

    const corpo = main.querySelector('#corpo-tabela');
    corpo.innerHTML = pagina.length ? pagina.map(linhaHtml).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">Nenhuma reserva encontrada.</td></tr>';

    document.getElementById('paginacao-info').textContent = total === 0 ? 'Nenhuma reserva' : `${total} reserva${total === 1 ? '' : 's'} · página ${paginaAtual} de ${totalPaginas}`;
    document.getElementById('btn-pag-anterior').disabled = paginaAtual <= 1;
    document.getElementById('btn-pag-proxima').disabled = paginaAtual >= totalPaginas;

    ligarAcoesLinha();
  }

  main.innerHTML = `
    <div class="pagina-titulo acoes" style="justify-content: space-between; align-items:center">
      <div>
        <h2>Reservas</h2>
        <div class="subtitulo">Reserva e disponibilidade de veículos da frota</div>
      </div>
      <a class="btn" href="#/reservas/nova">${icons.mais} Nova reserva</a>
    </div>

    <div class="card">
      <div class="tabela-toolbar">
        <div class="topbar-busca" style="flex:1">
          ${icons.busca}
          <input type="search" id="filtro-busca" placeholder="veículo, colaborador, projeto..." />
        </div>
        <select id="filtro-status"><option value="">Todos os status</option>${STATUS.map((s) => `<option>${s}</option>`).join('')}</select>
      </div>
      <div class="tabela-wrap">
        <table>
          <thead>
            <tr><th>Veículo</th><th>Colaborador</th><th>Saída</th><th>Retorno / previsão</th><th>Status</th><th class="no-print">Ações</th></tr>
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

  function ligarAcoesLinha() {
    main.querySelectorAll('[data-acao="iniciar"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirModalIniciar(btn.dataset.id));
    });
    main.querySelectorAll('[data-acao="retorno"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirModalRetorno(btn.dataset.id));
    });
    main.querySelectorAll('[data-acao="cancelar"]').forEach((btn) => {
      btn.addEventListener('click', () => cancelar(btn.dataset.id));
    });
  }

  async function recarregar() {
    const atualizadas = await api.listReservas();
    reservas.length = 0;
    reservas.push(...atualizadas);
    renderizarTabela();
  }

  function abrirModalIniciar(id) {
    abrirModal({
      titulo: 'Iniciar retirada',
      conteudoHtml: `
        <form id="form-iniciar">
          <label>Hodômetro na saída (opcional)
            <input name="HodometroSaida" type="number" />
          </label>
          <p class="msg-erro" id="erro-iniciar" style="display:none"></p>
          <div class="acoes"><button type="submit">Confirmar retirada</button></div>
        </form>
      `
    });
    document.getElementById('form-iniciar').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      try {
        await api.iniciarRetiradaReserva({ ID: id, HodometroSaida: dados.HodometroSaida });
        fecharModal();
        await recarregar();
      } catch (err) {
        const el = document.getElementById('erro-iniciar');
        el.textContent = err.message;
        el.style.display = 'block';
      }
    });
  }

  function abrirModalRetorno(id) {
    abrirModal({
      titulo: 'Registrar retorno',
      conteudoHtml: `
        <form id="form-retorno">
          <label>Hodômetro na chegada
            <input name="HodometroChegada" type="number" required />
          </label>
          <label>Combustível abastecido (litros)
            <input name="CombustivelLitros" type="number" step="0.01" />
          </label>
          <label>Custo do combustível (R$)
            <input name="CombustivelCusto" type="number" step="0.01" />
          </label>
          <label>Observações
            <textarea name="Observacoes"></textarea>
          </label>
          <p class="msg-erro" id="erro-retorno" style="display:none"></p>
          <div class="acoes"><button type="submit">Confirmar retorno</button></div>
        </form>
      `
    });
    document.getElementById('form-retorno').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      try {
        await api.registrarRetornoReserva({ ID: id, ...dados });
        fecharModal();
        await recarregar();
      } catch (err) {
        const el = document.getElementById('erro-retorno');
        el.textContent = err.message;
        el.style.display = 'block';
      }
    });
  }

  async function cancelar(id) {
    if (!confirm('Cancelar esta reserva?')) return;
    try {
      await api.cancelarReserva({ ID: id });
      await recarregar();
    } catch (err) {
      alert(err.message);
    }
  }
}

export async function viewReservaNova(main) {
  const [veiculos, colaboradores, projetos] = await Promise.all([api.listVeiculos(), api.listColaboradores(), api.listProjetos()]);

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Nova reserva</h2>
      <div class="subtitulo">Reserve um veículo por período — verifique a disponibilidade antes de confirmar</div>
    </div>
    <div class="card">
      <form id="form-reserva" class="form-largo grid cols-2">
        <label>Veículo *
          <select name="VeiculoID" id="sel-veiculo" required>
            <option value="" disabled selected>Selecione...</option>
            ${veiculos.map((v) => `<option value="${escapeHtml(v.ID)}">${escapeHtml(v.ID)} — ${escapeHtml(v.Descricao || v.Placa || '')}</option>`).join('')}
          </select>
        </label>
        <label>Colaborador *
          ${eAdmin() ? `
            <select name="Colaborador" required>
              <option value="" disabled ${colaboradores.some((c) => c.Nome === nomeAtual()) ? '' : 'selected'}>Selecione...</option>
              ${colaboradores.map((c) => `<option ${c.Nome === nomeAtual() ? 'selected' : ''}>${escapeHtml(c.Nome)}</option>`).join('')}
            </select>
          ` : `
            <input type="text" value="${escapeHtml(nomeAtual())}" disabled />
            <input type="hidden" name="Colaborador" value="${escapeHtml(nomeAtual())}" />
          `}
        </label>
        <label>Saída (data e hora) *
          <input name="DataHoraSaida" id="input-saida" type="datetime-local" required value="${agoraParaInputDatetime()}" />
        </label>
        <label>Previsão de retorno
          <input name="PrevisaoRetorno" id="input-retorno" type="datetime-local" value="${agoraParaInputDatetime(120)}" />
        </label>
        <label>Projeto (opcional)
          <input name="Projeto" list="lista-projetos-reserva" />
          <datalist id="lista-projetos-reserva">${projetos.map((p) => `<option value="${escapeHtml(p.Codigo)}">`).join('')}</datalist>
        </label>
        <label>Hodômetro na saída (opcional)
          <input name="HodometroSaida" type="number" />
        </label>
        <label style="grid-column: 1 / -1">Observações
          <textarea name="Observacoes"></textarea>
        </label>
        <div style="grid-column: 1 / -1">
          <p id="disponibilidade" class="ajuda" style="display:none"></p>
          <p class="msg-erro" id="erro-reserva" style="display:none"></p>
          <div class="acoes">
            <button type="submit">Confirmar reserva</button>
            <a class="btn secundario" href="#/reservas">Cancelar</a>
          </div>
        </div>
      </form>
    </div>
  `;

  async function checarDisponibilidade() {
    const veiculoId = document.getElementById('sel-veiculo').value;
    const inicio = document.getElementById('input-saida').value;
    const fim = document.getElementById('input-retorno').value;
    const el = document.getElementById('disponibilidade');
    if (!veiculoId || !inicio) { el.style.display = 'none'; return; }
    try {
      const resultado = await api.verificarDisponibilidade(veiculoId, inicio, fim);
      el.style.display = 'block';
      if (resultado.disponivel) {
        el.textContent = 'Veículo disponível nesse período.';
        el.className = 'ajuda';
      } else {
        el.textContent = `Veículo já reservado nesse período (conflito com ${resultado.conflitos.map((c) => c.Colaborador).join(', ')}).`;
        el.className = 'msg-erro';
        el.style.display = 'block';
      }
    } catch (err) { /* silencioso: deixa o submit acusar o erro se persistir */ }
  }

  ['sel-veiculo', 'input-saida', 'input-retorno'].forEach((id) => {
    document.getElementById(id).addEventListener('change', checarDisponibilidade);
  });

  document.getElementById('form-reserva').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target).entries());
    const erroEl = document.getElementById('erro-reserva');
    erroEl.style.display = 'none';
    try {
      await api.criarReserva(dados);
      location.hash = '#/reservas';
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });
}
