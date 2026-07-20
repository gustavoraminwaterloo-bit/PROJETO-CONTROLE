import { api } from '../api.js';
import { escapeHtml } from '../util.js';

export async function viewSaida(main) {
  const itens = await api.listItens();
  const projetos = await api.listProjetos();
  const colaboradores = await api.listColaboradores();

  const opcoesItens = itens.filter((i) => i.Status === 'Em estoque');
  const opcoesColaboradores = colaboradores.map((c) => `<option>${escapeHtml(c.Nome)}</option>`).join('');

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Registrar saída</h2>
      <div class="subtitulo">Retirada de material do estoque</div>
    </div>
    <div class="card">
      <label>Tipo de saída
        <select id="tipo-saida">
          <option value="colaborador">Alocar a um colaborador (ex: notebook, celular)</option>
          <option value="projeto">Uso/consumo destinado a um projeto (ex: insumo comprado para um projeto específico)</option>
        </select>
      </label>
      <div id="area-form" style="margin-top:14px"></div>
      <p class="ajuda">Só aparecem aqui itens com status "Em estoque". Se o item que você procura não está na lista, verifique a <a href="#/itens">página de Itens</a> — ele pode já estar alocado. Para locação de equipamentos de medição, use a página <a href="#/equipamentos">Equipamentos</a>.</p>
    </div>
  `;

  const area = document.getElementById('area-form');

  function formColaborador() {
    area.innerHTML = `
      <form id="form-saida">
        <label>Item *
          <input name="ItemID" list="lista-itens" required />
          <datalist id="lista-itens">${opcoesItens.map((i) => `<option value="${escapeHtml(i.ID)}">${escapeHtml(i.Descricao)}</option>`).join('')}</datalist>
        </label>
        <label>Colaborador *
          <select name="ColaboradorEnvolvido" required>
            <option value="" disabled selected>Selecione...</option>
            ${opcoesColaboradores}
          </select>
        </label>
        <label>Projeto (opcional — para atribuir o custo deste item a um projeto)
          <input name="ProjetoDestino" list="lista-projetos" />
          <datalist id="lista-projetos">${projetos.map((p) => `<option value="${escapeHtml(p.Codigo)}">`).join('')}</datalist>
        </label>
        <label>Valor a atribuir ao projeto (opcional)
          <input name="ValorUnitario" type="number" step="0.01" />
        </label>
        <label>Observações
          <textarea name="Observacoes"></textarea>
        </label>
        <p class="msg-erro" id="erro-saida" style="display:none"></p>
        <p class="msg-ok" id="ok-saida" style="display:none"></p>
        <button type="submit">Confirmar alocação</button>
      </form>
    `;
    ligarSubmit(api.alocarColaborador);
  }

  function formProjeto() {
    area.innerHTML = `
      <form id="form-saida">
        <label>Item *
          <input name="ItemID" list="lista-itens" required />
          <datalist id="lista-itens">${opcoesItens.map((i) => `<option value="${escapeHtml(i.ID)}">${escapeHtml(i.Descricao)}</option>`).join('')}</datalist>
        </label>
        <label>Projeto *
          <input name="ProjetoDestino" list="lista-projetos" required />
          <datalist id="lista-projetos">${projetos.map((p) => `<option value="${escapeHtml(p.Codigo)}">`).join('')}</datalist>
        </label>
        <label>Solicitante / técnico responsável *
          <select name="ColaboradorEnvolvido" required>
            <option value="" disabled selected>Selecione...</option>
            ${opcoesColaboradores}
          </select>
        </label>
        <label>Valor a atribuir ao projeto (opcional, ex: diária de locação)
          <input name="ValorUnitario" type="number" step="0.01" />
        </label>
        <label>Devolução prevista
          <input name="DataDevolucaoPrevista" type="date" />
        </label>
        <label>Observações
          <textarea name="Observacoes"></textarea>
        </label>
        <p class="msg-erro" id="erro-saida" style="display:none"></p>
        <p class="msg-ok" id="ok-saida" style="display:none"></p>
        <button type="submit">Confirmar saída</button>
      </form>
    `;
    ligarSubmit(api.registrarSaidaProjeto);
  }

  function ligarSubmit(acao) {
    document.getElementById('form-saida').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      const erroEl = document.getElementById('erro-saida');
      const okEl = document.getElementById('ok-saida');
      erroEl.style.display = 'none';
      okEl.style.display = 'none';
      try {
        await acao(dados);
        okEl.textContent = 'Saída registrada com sucesso.';
        okEl.style.display = 'block';
        e.target.reset();
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      }
    });
  }

  document.getElementById('tipo-saida').addEventListener('change', (e) => {
    e.target.value === 'colaborador' ? formColaborador() : formProjeto();
  });
  formColaborador();
}
