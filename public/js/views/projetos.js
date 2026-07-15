import { api } from '../api.js';
import { escapeHtml, formatarMoeda } from '../util.js';

export async function viewProjetos(main) {
  const [projetos, custos, movimentacoes] = await Promise.all([
    api.listProjetos(), api.custoPorProjeto(), api.listMovimentacoes()
  ]);

  function custoDe(codigo) {
    return (custos.find((c) => c.projeto === codigo) || { custo: 0 }).custo;
  }
  function movimentacoesDe(codigo) {
    return movimentacoes.filter((m) => m.ProjetoDestino === codigo);
  }

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Projetos</h2>
      <div class="subtitulo">${projetos.length} projetos cadastrados</div>
    </div>
    <div class="card">
      <h3>Novo projeto</h3>
      <form id="form-projeto" class="grid cols-2" style="max-width:none">
        <label>Código / Nome * <input name="Codigo" required /></label>
        <label>Cliente <input name="Cliente" /></label>
        <label>Status
          <select name="Status"><option>Ativo</option><option>Encerrado</option></select>
        </label>
      </form>
      <p class="msg-erro" id="erro-projeto" style="display:none"></p>
      <button id="btn-salvar-projeto" style="margin-top:10px">Salvar projeto</button>
    </div>

    <div class="card">
      <h3>Lista de projetos</h3>
      ${projetos.map((p) => `
        <details style="margin-bottom:8px">
          <summary><strong>${escapeHtml(p.Codigo)}</strong> — ${escapeHtml(p.Cliente || 'sem cliente')} · custo acumulado: <strong>${formatarMoeda(custoDe(p.Codigo))}</strong></summary>
          <div style="margin-top:8px">
            ${movimentacoesDe(p.Codigo).length === 0 ? '<p class="ajuda">Nenhuma movimentação lançada para este projeto.</p>' : `
              <table>
                <thead><tr><th>Item</th><th>Tipo</th><th>Valor</th></tr></thead>
                <tbody>
                  ${movimentacoesDe(p.Codigo).map((m) => `<tr><td><a href="#/item/${encodeURIComponent(m.ItemID)}">${escapeHtml(m.ItemID)}</a></td><td>${escapeHtml(m.Tipo)}</td><td>${formatarMoeda((m.ValorUnitario || 0) * (m.Quantidade || 1))}</td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
        </details>
      `).join('') || '<p>Nenhum projeto cadastrado.</p>'}
    </div>
  `;

  document.getElementById('btn-salvar-projeto').addEventListener('click', async () => {
    const dados = Object.fromEntries(new FormData(document.getElementById('form-projeto')).entries());
    const erroEl = document.getElementById('erro-projeto');
    erroEl.style.display = 'none';
    try {
      await api.criarProjeto(dados);
      await viewProjetos(main);
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });
}
