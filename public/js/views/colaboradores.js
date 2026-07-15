import { api } from '../api.js';
import { escapeHtml, classeBadgeStatus } from '../util.js';

export async function viewColaboradores(main) {
  const [colaboradores, itens] = await Promise.all([api.listColaboradores(), api.listItens()]);

  function itensDe(nome) {
    return itens.filter((i) => i.ColaboradorAtual === nome);
  }

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Colaboradores</h2>
      <div class="subtitulo">${colaboradores.length} colaboradores cadastrados</div>
    </div>
    <div class="card">
      <h3>Novo colaborador</h3>
      <form id="form-colaborador" class="grid cols-2" style="max-width:none">
        <label>Nome * <input name="Nome" required /></label>
        <label>Cargo <input name="Cargo" /></label>
        <label>Email <input name="Email" type="email" /></label>
        <label>Status
          <select name="Status"><option>Ativo</option><option>Inativo</option></select>
        </label>
      </form>
      <p class="msg-erro" id="erro-colab" style="display:none"></p>
      <button id="btn-salvar-colab" style="margin-top:10px">Salvar colaborador</button>
    </div>

    <div class="card">
      <h3>Lista de colaboradores</h3>
      ${colaboradores.map((c) => `
        <details style="margin-bottom:8px">
          <summary><strong>${escapeHtml(c.Nome)}</strong> — ${escapeHtml(c.Cargo || 'sem cargo')} ${c.Status === 'Inativo' ? '<span class="badge fora">Inativo</span>' : ''}</summary>
          <div style="margin-top:8px">
            ${itensDe(c.Nome).length === 0 ? '<p class="ajuda">Nenhum item alocado no momento.</p>' : `
              <table>
                <thead><tr><th>Item</th><th>Descrição</th><th>Status</th></tr></thead>
                <tbody>
                  ${itensDe(c.Nome).map((i) => `<tr><td><a href="#/item/${encodeURIComponent(i.ID)}">${escapeHtml(i.ID)}</a></td><td>${escapeHtml(i.Descricao)}</td><td><span class="badge ${classeBadgeStatus(i.Status)}">${escapeHtml(i.Status)}</span></td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
        </details>
      `).join('') || '<p>Nenhum colaborador cadastrado.</p>'}
    </div>
  `;

  document.getElementById('btn-salvar-colab').addEventListener('click', async () => {
    const dados = Object.fromEntries(new FormData(document.getElementById('form-colaborador')).entries());
    const erroEl = document.getElementById('erro-colab');
    erroEl.style.display = 'none';
    try {
      await api.criarColaborador(dados);
      await viewColaboradores(main);
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });
}
