import { api } from '../api.js';
import { escapeHtml, formatarData } from '../util.js';

export async function viewMateriaisReferencia(main) {
  const [materiais, colaboradores] = await Promise.all([api.listMateriaisReferencia(), api.listColaboradores()]);
  const opcoesColaboradores = colaboradores.map((c) => `<option>${escapeHtml(c.Nome)}</option>`).join('');

  function seletorResponsavel(m) {
    return `
      <select class="sel-responsavel" data-id="${escapeHtml(m.ID)}">
        <option value="">Sem responsável</option>
        ${colaboradores.map((c) => `<option ${c.Nome === m.ColaboradorAtual ? 'selected' : ''}>${escapeHtml(c.Nome)}</option>`).join('')}
      </select>
    `;
  }

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Materiais de Referência</h2>
      <div class="subtitulo">${materiais.length} materiais cadastrados — controle de validade e responsável atual (PT-007)</div>
    </div>
    <div class="card">
      <h3>Novo material de referência</h3>
      <form id="form-material" class="grid cols-2" style="max-width:none">
        <label>Identificação * <input name="Identificacao" required /></label>
        <label>Certificador <input name="Certificador" /></label>
        <label>Nº do certificado <input name="NumeroCertificado" /></label>
        <label>Lote <input name="Lote" /></label>
        <label>Incerteza de medição <input name="IncertezaMedicao" /></label>
        <label>Validade * <input name="Validade" type="date" required /></label>
        <label>Status
          <select name="Status"><option>Em uso</option><option>Vencido</option><option>Descartado</option></select>
        </label>
        <label>Responsável atual (opcional)
          <select name="ColaboradorAtual">
            <option value="">Sem responsável — fica no almoxarifado</option>
            ${opcoesColaboradores}
          </select>
        </label>
        <label style="grid-column: 1 / -1">Observações <textarea name="Observacoes"></textarea></label>
      </form>
      <p class="msg-erro" id="erro-material" style="display:none"></p>
      <button id="btn-salvar-material" style="margin-top:10px">Salvar material</button>
    </div>

    <div class="card">
      <h3>Lista de materiais</h3>
      <p class="ajuda">Troque o responsável direto aqui na lista — salva sozinho, sem precisar abrir formulário.</p>
      <div class="tabela-wrap">
        <table>
          <thead><tr><th>ID</th><th>Identificação</th><th>Certificador</th><th>Lote</th><th>Validade</th><th>Status</th><th>Responsável atual</th></tr></thead>
          <tbody>
            ${materiais.map((m) => `
              <tr>
                <td>${escapeHtml(m.ID)}</td>
                <td>${escapeHtml(m.Identificacao)}</td>
                <td>${escapeHtml(m.Certificador)}</td>
                <td>${escapeHtml(m.Lote)}</td>
                <td>${formatarData(m.Validade)}</td>
                <td>${escapeHtml(m.Status)}</td>
                <td>${seletorResponsavel(m)}</td>
              </tr>
            `).join('') || '<tr><td colspan="7">Nenhum material cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="msg-erro" id="erro-responsavel" style="display:none"></p>
    </div>
  `;

  document.getElementById('btn-salvar-material').addEventListener('click', async () => {
    const dados = Object.fromEntries(new FormData(document.getElementById('form-material')).entries());
    const erroEl = document.getElementById('erro-material');
    erroEl.style.display = 'none';
    try {
      await api.criarMaterialReferencia(dados);
      await viewMateriaisReferencia(main);
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });

  main.querySelectorAll('.sel-responsavel').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const erroEl = document.getElementById('erro-responsavel');
      erroEl.style.display = 'none';
      sel.disabled = true;
      try {
        await api.atualizarResponsavelMaterialReferencia({ ID: sel.dataset.id, ColaboradorAtual: sel.value });
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      } finally {
        sel.disabled = false;
      }
    });
  });
}
