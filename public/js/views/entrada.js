import { api } from '../api.js';
import { escapeHtml } from '../util.js';

export async function viewEntrada(main) {
  const itens = await api.listItens();
  const projetos = await api.listProjetos();

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Registrar entrada</h2>
      <div class="subtitulo">Compra de novo material para o estoque</div>
    </div>
    <div class="card">
      <p class="ajuda">Se o item ainda não existe, <a href="#/itens/novo">cadastre-o primeiro</a> e depois registre a entrada.</p>
      <form id="form-entrada">
        <label>Item *
          <input name="ItemID" list="lista-itens" required placeholder="código do item" />
          <datalist id="lista-itens">${itens.map((i) => `<option value="${escapeHtml(i.ID)}">${escapeHtml(i.Descricao)}</option>`).join('')}</datalist>
        </label>
        <label>Quantidade
          <input name="Quantidade" type="number" min="1" value="1" />
        </label>
        <label>Valor pago (unitário) *
          <input name="ValorUnitario" type="number" step="0.01" required />
        </label>
        <label>Fornecedor
          <input name="Fornecedor" />
        </label>
        <label>Data da compra
          <input name="DataCompra" type="date" />
        </label>
        <label>Projeto
          <input name="ProjetoDestino" list="lista-projetos" />
          <datalist id="lista-projetos">${projetos.map((p) => `<option value="${escapeHtml(p.Codigo)}">`).join('')}</datalist>
        </label>
        <label>Observações
          <textarea name="Observacoes"></textarea>
        </label>
        <p class="msg-erro" id="erro-entrada" style="display:none"></p>
        <p class="msg-ok" id="ok-entrada" style="display:none"></p>
        <button type="submit">Registrar entrada</button>
      </form>
    </div>
  `;

  document.getElementById('form-entrada').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target).entries());
    const erroEl = document.getElementById('erro-entrada');
    const okEl = document.getElementById('ok-entrada');
    erroEl.style.display = 'none';
    okEl.style.display = 'none';
    try {
      await api.registrarEntrada(dados);
      okEl.textContent = 'Entrada registrada com sucesso.';
      okEl.style.display = 'block';
      e.target.reset();
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });
}
