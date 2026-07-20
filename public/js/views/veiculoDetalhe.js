import { api } from '../api.js';
import { escapeHtml, formatarMoeda, formatarDataHora, classeBadgeStatus } from '../util.js';

function linhaHistorico(m) {
  const detalhes = [];
  if (m.ColaboradorEnvolvido) detalhes.push(`colaborador: ${escapeHtml(m.ColaboradorEnvolvido)}`);
  if (m.ChecadoPor) detalhes.push(`checado por: ${escapeHtml(m.ChecadoPor)}`);
  if (m.Observacoes) detalhes.push(`obs: ${escapeHtml(m.Observacoes)}`);
  return `<tr><td>${formatarDataHora(m.DataHora)}</td><td>${escapeHtml(m.Tipo)}</td><td>${detalhes.join(' · ')}</td></tr>`;
}

export async function viewVeiculoDetalhe(main, { id }) {
  const [veiculo, colaboradores] = await Promise.all([api.getVeiculo(id), api.listColaboradores()]);
  const opcoesColaboradores = colaboradores.map((c) => `<option>${escapeHtml(c.Nome)}</option>`).join('');

  main.innerHTML = `
    <div class="card">
      <div class="acoes" style="justify-content: space-between; align-items:center">
        <h2 style="margin:0">${escapeHtml(veiculo.ID)} <span class="badge ${classeBadgeStatus(veiculo.Status)}">${escapeHtml(veiculo.Status)}</span></h2>
        <a class="btn secundario no-print" href="#/veiculos">Voltar</a>
      </div>
      <div class="grid cols-2" style="margin-top:12px">
        <p><strong>Placa:</strong> ${escapeHtml(veiculo.Placa || '-')}<br/>
           <strong>Modelo:</strong> ${escapeHtml(veiculo.Descricao || '-')}<br/>
           <strong>Marca:</strong> ${escapeHtml(veiculo.Marca || '-')}<br/>
           <strong>Ano:</strong> ${escapeHtml(veiculo.Ano || '-')}<br/>
           <strong>Quilometragem:</strong> ${veiculo.Quilometragem ? Number(veiculo.Quilometragem).toLocaleString('pt-BR') + ' km' : '-'}</p>
        <p><strong>Responsável atual:</strong> ${escapeHtml(veiculo.ColaboradorAtual || '-')}<br/>
           <strong>Local:</strong> ${escapeHtml(veiculo.LocalArmazenamento || '-')}<br/>
           <strong>Valor pago:</strong> ${veiculo.ValorPago ? formatarMoeda(veiculo.ValorPago) : '-'}<br/>
           <strong>Fornecedor:</strong> ${escapeHtml(veiculo.Fornecedor || '-')}</p>
      </div>
      ${veiculo.Observacoes ? `<p><strong>Observações:</strong> ${escapeHtml(veiculo.Observacoes)}</p>` : ''}
    </div>

    <div class="card no-print">
      <h3>Ações rápidas</h3>
      <details>
        <summary>Alocar a um colaborador</summary>
        <form id="form-alocar" style="margin-top:10px">
          <label>Colaborador
            <select name="ColaboradorEnvolvido" required>
              <option value="" disabled selected>Selecione...</option>
              ${opcoesColaboradores}
            </select>
          </label>
          <label>Observações <textarea name="Observacoes"></textarea></label>
          <button type="submit">Confirmar alocação</button>
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
          <tbody>${veiculo.historico.length ? veiculo.historico.map(linhaHistorico).join('') : '<tr><td colspan="3">Sem movimentações registradas.</td></tr>'}</tbody>
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
      dados.ItemID = veiculo.ID;
      const erroEl = document.getElementById('erro-acao');
      erroEl.style.display = 'none';
      try {
        await acao(dados);
        await viewVeiculoDetalhe(main, { id });
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      }
    });
  }

  ligarFormulario('form-alocar', api.alocarColaborador);
  ligarFormulario('form-devolucao', api.registrarDevolucao);
}
