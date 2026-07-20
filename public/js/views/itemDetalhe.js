import { api } from '../api.js';
import { escapeHtml, classeBadgeStatus, formatarMoeda, formatarDataHora } from '../util.js';

function linhaHistorico(m) {
  const detalhes = [];
  if (m.ColaboradorEnvolvido) detalhes.push(`colaborador/solicitante: ${escapeHtml(m.ColaboradorEnvolvido)}`);
  if (m.ProjetoDestino) detalhes.push(`projeto: ${escapeHtml(m.ProjetoDestino)}`);
  if (m.ValorUnitario) detalhes.push(`valor: ${formatarMoeda(m.ValorUnitario)}`);
  if (m.ChecadoPor) detalhes.push(`checado por: ${escapeHtml(m.ChecadoPor)}`);
  if (m.Observacoes) detalhes.push(`obs: ${escapeHtml(m.Observacoes)}`);
  return `<tr><td>${formatarDataHora(m.DataHora)}</td><td>${escapeHtml(m.Tipo)}</td><td>${detalhes.join(' · ')}</td></tr>`;
}

export async function viewItemDetalhe(main, { id }) {
  const [item, colaboradores, projetos] = await Promise.all([api.getItem(id), api.listColaboradores(), api.listProjetos()]);
  const opcoesColaboradores = colaboradores.map((c) => `<option>${escapeHtml(c.Nome)}</option>`).join('');
  const listaProjetos = `<datalist id="lista-projetos-item">${projetos.map((p) => `<option value="${escapeHtml(p.Codigo)}">`).join('')}</datalist>`;

  main.innerHTML = `
    <div class="card">
      <div class="acoes" style="justify-content: space-between; align-items:center">
        <h2 style="margin:0">${escapeHtml(item.ID)} <span class="badge ${classeBadgeStatus(item.Status)}">${escapeHtml(item.Status)}</span></h2>
        <a class="btn secundario no-print" href="#/itens">Voltar</a>
      </div>
      <div class="grid cols-2" style="margin-top:12px">
        <p><strong>Categoria:</strong> ${escapeHtml(item.Categoria || '-')}<br/>
           <strong>Descrição:</strong> ${escapeHtml(item.Descricao || '-')}<br/>
           <strong>Marca:</strong> ${escapeHtml(item.Marca || '-')}<br/>
           <strong>Nº de série:</strong> ${escapeHtml(item.NumeroSerie || '-')}</p>
        <p><strong>Colaborador atual:</strong> ${escapeHtml(item.ColaboradorAtual || '-')}<br/>
           <strong>Local de armazenamento:</strong> ${escapeHtml(item.LocalArmazenamento || '-')}<br/>
           <strong>Valor pago:</strong> ${item.ValorPago ? formatarMoeda(item.ValorPago) : '-'}<br/>
           <strong>Fornecedor:</strong> ${escapeHtml(item.Fornecedor || '-')}</p>
      </div>
      ${item.Observacoes ? `<p><strong>Observações:</strong> ${escapeHtml(item.Observacoes)}</p>` : ''}
    </div>

    <div class="card no-print">
      <h3>Ações rápidas</h3>
      ${listaProjetos}
      <details>
        <summary>Alocar a um colaborador</summary>
        <form id="form-alocar" style="margin-top:10px">
          <label>Colaborador
            <select name="ColaboradorEnvolvido" required>
              <option value="" disabled selected>Selecione...</option>
              ${opcoesColaboradores}
            </select>
          </label>
          <label>Projeto (opcional — para atribuir o custo deste item a um projeto)
            <input name="ProjetoDestino" list="lista-projetos-item" />
          </label>
          <label>Valor a atribuir ao projeto (opcional) <input name="ValorUnitario" type="number" step="0.01" /></label>
          <label>Observações <textarea name="Observacoes"></textarea></label>
          <button type="submit">Confirmar alocação</button>
        </form>
      </details>
      <details style="margin-top:10px">
        <summary>Registrar saída para projeto</summary>
        <form id="form-saida-projeto" style="margin-top:10px">
          <label>Projeto <input name="ProjetoDestino" list="lista-projetos-item" required /></label>
          <label>Solicitante / técnico responsável
            <select name="ColaboradorEnvolvido" required>
              <option value="" disabled selected>Selecione...</option>
              ${opcoesColaboradores}
            </select>
          </label>
          <label>Valor (se houver custo/diária a atribuir ao projeto) <input name="ValorUnitario" type="number" step="0.01" /></label>
          <label>Devolução prevista <input name="DataDevolucaoPrevista" type="date" /></label>
          <label>Observações <textarea name="Observacoes"></textarea></label>
          <button type="submit">Confirmar saída</button>
        </form>
      </details>
      <details style="margin-top:10px">
        <summary>Registrar devolução</summary>
        <form id="form-devolucao" style="margin-top:10px">
          <label>Checado por <input name="ChecadoPor" /></label>
          <label>Observações <textarea name="Observacoes"></textarea></label>
          <button type="submit">Confirmar devolução</button>
        </form>
      </details>
      <p class="msg-erro" id="erro-acao" style="display:none; margin-top:10px"></p>
    </div>

    <div class="card">
      <h3>Histórico</h3>
      <div class="tabela-wrap">
        <table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Detalhes</th></tr></thead>
          <tbody>${item.historico.length ? item.historico.map(linhaHistorico).join('') : '<tr><td colspan="3">Sem movimentações registradas.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;

  function ligarFormulario(idForm, acao) {
    const form = document.getElementById(idForm);
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      dados.ItemID = item.ID;
      const erroEl = document.getElementById('erro-acao');
      erroEl.style.display = 'none';
      try {
        await acao(dados);
        await viewItemDetalhe(main, { id });
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      }
    });
  }

  ligarFormulario('form-alocar', api.alocarColaborador);
  ligarFormulario('form-saida-projeto', api.registrarSaidaProjeto);
  ligarFormulario('form-devolucao', api.registrarDevolucao);
}
