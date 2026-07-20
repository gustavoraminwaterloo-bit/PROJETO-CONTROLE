import { api } from '../api.js';
import { escapeHtml, classeBadgeStatus } from '../util.js';

export async function viewColaboradores(main) {
  const [colaboradores, itens, equipamentos, veiculos] = await Promise.all([
    api.listColaboradores(), api.listItens(), api.listEquipamentos(), api.listVeiculos()
  ]);

  function tudoDe(nome) {
    return [
      ...itens.filter((i) => i.ColaboradorAtual === nome).map((i) => ({ ...i, tipoRotulo: 'Item', link: `#/item/${encodeURIComponent(i.ID)}` })),
      ...veiculos.filter((v) => v.ColaboradorAtual === nome).map((v) => ({ ...v, Descricao: `${v.Descricao} (${v.Placa})`, tipoRotulo: 'Veículo', link: `#/veiculo/${encodeURIComponent(v.ID)}` })),
      ...equipamentos.filter((e) => e.ColaboradorAtual === nome).map((e) => ({ ...e, tipoRotulo: 'Equipamento (locação)', link: `#/equipamento/${encodeURIComponent(e.ID)}` }))
    ];
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
        <label>Cargo <input name="Cargo" placeholder="ex: Técnico de campo, Analista" /></label>
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
      ${colaboradores.map((c) => {
        const posses = tudoDe(c.Nome);
        return `
        <details style="margin-bottom:8px">
          <summary><strong>${escapeHtml(c.Nome)}</strong> — ${escapeHtml(c.Cargo || 'sem cargo')} ${c.Status === 'Inativo' ? '<span class="badge fora">Inativo</span>' : ''} <span class="ajuda">(${posses.length} item${posses.length === 1 ? '' : 's'})</span></summary>
          <div style="margin-top:8px">
            ${posses.length === 0 ? '<p class="ajuda">Nenhum item, equipamento ou veículo alocado no momento.</p>' : `
              <table>
                <thead><tr><th>Tipo</th><th>Código</th><th>Descrição</th><th>Status</th></tr></thead>
                <tbody>
                  ${posses.map((p) => `<tr><td>${escapeHtml(p.tipoRotulo)}</td><td><a href="${p.link}">${escapeHtml(p.ID)}</a></td><td>${escapeHtml(p.Descricao)}</td><td><span class="badge ${classeBadgeStatus(p.Status)}">${escapeHtml(p.Status)}</span></td></tr>`).join('')}
                </tbody>
              </table>
            `}
          </div>
        </details>
      `;
      }).join('') || '<p>Nenhum colaborador cadastrado.</p>'}
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
