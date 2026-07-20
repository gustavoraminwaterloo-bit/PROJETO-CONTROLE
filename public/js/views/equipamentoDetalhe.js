import { api } from '../api.js';
import { escapeHtml, formatarMoeda, formatarData, formatarDataHora, avisoLembretePG005, classeBadgeStatus } from '../util.js';

function linhaHistorico(m) {
  const detalhes = [];
  if (m.ColaboradorEnvolvido) detalhes.push(`solicitante: ${escapeHtml(m.ColaboradorEnvolvido)}`);
  if (m.ProjetoDestino) detalhes.push(`projeto: ${escapeHtml(m.ProjetoDestino)}`);
  if (m.ValorUnitario) detalhes.push(`valor: ${formatarMoeda(m.ValorUnitario)}`);
  if (m.ChecadoPor) detalhes.push(`checado por: ${escapeHtml(m.ChecadoPor)}`);
  if (m.Observacoes) detalhes.push(`obs: ${escapeHtml(m.Observacoes)}`);
  return `<tr><td>${formatarDataHora(m.DataHora)}</td><td>${escapeHtml(m.Tipo)}</td><td>${detalhes.join(' · ')}</td></tr>`;
}

export async function viewEquipamentoDetalhe(main, { id }) {
  const [equipamento, colaboradores, projetos] = await Promise.all([api.getEquipamento(id), api.listColaboradores(), api.listProjetos()]);
  const opcoesColaboradores = colaboradores.map((c) => `<option>${escapeHtml(c.Nome)}</option>`).join('');
  const listaProjetos = `<datalist id="lista-projetos-equip">${projetos.map((p) => `<option value="${escapeHtml(p.Codigo)}">`).join('')}</datalist>`;

  main.innerHTML = `
    <div class="card">
      <div class="acoes" style="justify-content: space-between; align-items:center">
        <h2 style="margin:0">${escapeHtml(equipamento.ID)} <span class="badge ${classeBadgeStatus(equipamento.Status)}">${escapeHtml(equipamento.Status)}</span></h2>
        <a class="btn secundario no-print" href="#/equipamentos">Voltar</a>
      </div>
      <div class="grid cols-2" style="margin-top:12px">
        <p><strong>Descrição:</strong> ${escapeHtml(equipamento.Descricao || '-')}<br/>
           <strong>Marca:</strong> ${escapeHtml(equipamento.Marca || '-')}<br/>
           <strong>Nº de série:</strong> ${escapeHtml(equipamento.NumeroSerie || '-')}<br/>
           <strong>Local de armazenamento:</strong> ${escapeHtml(equipamento.LocalArmazenamento || '-')}</p>
        <p><strong>Responsável / projeto atual:</strong> ${escapeHtml(equipamento.ColaboradorAtual || '-')}<br/>
           <strong>Valor pago:</strong> ${equipamento.ValorPago ? formatarMoeda(equipamento.ValorPago) : '-'}<br/>
           <strong>Fornecedor:</strong> ${escapeHtml(equipamento.Fornecedor || '-')}</p>
      </div>
      <p><strong>Última calibração:</strong> ${formatarData(equipamento.UltimaCalibracao)} ·
         <strong>Próxima calibração:</strong> ${formatarData(equipamento.ProximaCalibracao)} ·
         <strong>Certificado:</strong> ${escapeHtml(equipamento.NumeroCertificadoCalibracao || '-')}</p>
      ${equipamento.Observacoes ? `<p><strong>Observações:</strong> ${escapeHtml(equipamento.Observacoes)}</p>` : ''}
    </div>

    <div class="card no-print">
      <h3>Ações rápidas</h3>
      ${listaProjetos}
      <details>
        <summary>Registrar locação (empréstimo para projeto)</summary>
        <div style="margin-top:10px">${avisoLembretePG005()}</div>
        <form id="form-locacao" style="margin-top:10px">
          <label>Projeto <input name="ProjetoDestino" list="lista-projetos-equip" required /></label>
          <label>Solicitante / técnico responsável
            <select name="ColaboradorEnvolvido" required>
              <option value="" disabled selected>Selecione...</option>
              ${opcoesColaboradores}
            </select>
          </label>
          <label>Valor (diária/custo a atribuir ao projeto, se houver) <input name="ValorUnitario" type="number" step="0.01" /></label>
          <label>Devolução prevista <input name="DataDevolucaoPrevista" type="date" /></label>
          <label>Observações <textarea name="Observacoes"></textarea></label>
          <button type="submit">Confirmar locação</button>
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
      <details style="margin-top:10px">
        <summary>Registrar calibração</summary>
        <form id="form-calibracao" style="margin-top:10px">
          <label>Data da calibração realizada <input name="UltimaCalibracao" type="date" required /></label>
          <label>Próxima calibração prevista <input name="ProximaCalibracao" type="date" required /></label>
          <label>Nº do certificado <input name="NumeroCertificadoCalibracao" /></label>
          <label>Observações <textarea name="Observacoes"></textarea></label>
          <button type="submit">Confirmar calibração</button>
        </form>
      </details>
      <p class="msg-erro" id="erro-acao" style="display:none; margin-top:10px"></p>
    </div>

    <div class="card">
      <h3>Histórico</h3>
      <div class="tabela-wrap">
        <table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Detalhes</th></tr></thead>
          <tbody>${equipamento.historico.length ? equipamento.historico.map(linhaHistorico).join('') : '<tr><td colspan="3">Sem movimentações registradas.</td></tr>'}</tbody>
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
      dados.ItemID = equipamento.ID;
      const erroEl = document.getElementById('erro-acao');
      erroEl.style.display = 'none';
      try {
        await acao(dados);
        await viewEquipamentoDetalhe(main, { id });
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      }
    });
  }

  ligarFormulario('form-locacao', api.registrarLocacao);
  ligarFormulario('form-devolucao', api.registrarDevolucaoEquipamento);
  ligarFormulario('form-calibracao', api.registrarCalibracaoEquipamento);
}
