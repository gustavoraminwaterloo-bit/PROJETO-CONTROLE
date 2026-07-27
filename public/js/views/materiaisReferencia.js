import { api } from '../api.js';
import { escapeHtml, formatarData, classeBadgeStatus, abrirModal, fecharModal } from '../util.js';
import { icons } from '../icons.js';

const SEM_RESPONSAVEL = 'Sem responsável';

function diasAte(dataStr) {
  if (!dataStr) return null;
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  return Math.round((data - hoje) / (1000 * 60 * 60 * 24));
}

function statusValidade(dias) {
  if (dias === null) return null;
  if (dias < 0) return { classe: 'fora', rotulo: 'Vencido' };
  if (dias <= 30) return { classe: 'projeto', rotulo: 'Atenção' };
  return { classe: 'estoque', rotulo: 'Em dia' };
}

function camposFormulario(m = {}) {
  return `
    <label>Identificação * <input name="Identificacao" value="${escapeHtml(m.Identificacao || '')}" required /></label>
    <div class="grid cols-2">
      <label>Certificador <input name="Certificador" value="${escapeHtml(m.Certificador || '')}" /></label>
      <label>Nº do certificado <input name="NumeroCertificado" value="${escapeHtml(m.NumeroCertificado || '')}" /></label>
    </div>
    <div class="grid cols-2">
      <label>Lote <input name="Lote" value="${escapeHtml(m.Lote || '')}" /></label>
      <label>Validade * <input name="Validade" type="date" value="${m.Validade ? String(m.Validade).slice(0, 10) : ''}" required /></label>
    </div>
    <label>Incerteza de medição <input name="IncertezaMedicao" value="${escapeHtml(m.IncertezaMedicao || '')}" /></label>
    <label>Status
      <select name="Status">
        ${['Em uso', 'Vencido', 'Descartado'].map((s) => `<option ${m.Status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </label>
    <label>Observações <textarea name="Observacoes">${escapeHtml(m.Observacoes || '')}</textarea></label>
  `;
}

export async function viewMateriaisReferencia(main) {
  const [materiais, colaboradores] = await Promise.all([api.listMateriaisReferencia(), api.listColaboradores()]);
  const visiveis = materiais.filter((m) => m.Status !== 'Removido');

  const grupos = new Map();
  visiveis.forEach((m) => {
    const chave = m.TecnicoResponsavel || SEM_RESPONSAVEL;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(m);
  });
  const tecnicos = [...grupos.keys()].sort((a, b) => {
    if (a === SEM_RESPONSAVEL) return 1;
    if (b === SEM_RESPONSAVEL) return -1;
    return a.localeCompare(b, 'pt-BR');
  });

  function linhaItem(m) {
    const dias = diasAte(m.Validade);
    const v = statusValidade(dias);
    return `
      <tr>
        <td>${escapeHtml(m.Identificacao)}${m.Lote ? `<br/><span style="color:var(--text-muted)">lote ${escapeHtml(m.Lote)}</span>` : ''}</td>
        <td>${formatarData(m.Validade)} ${v ? `<span class="badge ${v.classe}">${v.rotulo}</span>` : ''}</td>
        <td><span class="badge ${classeBadgeStatus(m.Status)}">${escapeHtml(m.Status)}</span></td>
        <td class="no-print acoes">
          <button type="button" class="secundario icone-only btn-editar" data-id="${escapeHtml(m.ID)}" title="Editar">${icons.editar}</button>
          <button type="button" class="secundario perigo icone-only btn-remover" data-id="${escapeHtml(m.ID)}" title="Remover">${icons.x}</button>
        </td>
      </tr>
    `;
  }

  function cardTecnico(nome, itens) {
    return `
      <div class="card">
        <div class="pagina-titulo acoes" style="justify-content: space-between; align-items:center; margin-bottom:10px">
          <h3 style="margin:0">${escapeHtml(nome)}</h3>
          <button type="button" class="secundario btn-novo" data-tecnico="${escapeHtml(nome === SEM_RESPONSAVEL ? '' : nome)}">${icons.mais} Novo material</button>
        </div>
        <div class="tabela-wrap">
          <table>
            <thead><tr><th>Identificação</th><th>Validade</th><th>Status</th><th class="no-print">Ações</th></tr></thead>
            <tbody>${itens.map(linhaItem).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  main.innerHTML = `
    <div class="pagina-titulo acoes" style="justify-content: space-between; align-items:center">
      <div>
        <h2>Materiais de Referência</h2>
        <div class="subtitulo">${visiveis.length} materiais — agrupados por técnico responsável (PT-007)</div>
      </div>
      <button type="button" class="secundario" id="btn-novo-geral">${icons.mais} Novo material</button>
    </div>
    ${tecnicos.length ? tecnicos.map((t) => cardTecnico(t, grupos.get(t))).join('') : '<div class="card">Nenhum material cadastrado.</div>'}
  `;

  function abrirFormulario({ titulo, material, tecnicoFixo, aoSalvar }) {
    abrirModal({
      titulo,
      conteudoHtml: `
        <form id="form-material-modal">
          ${camposFormulario(material)}
          ${tecnicoFixo === undefined ? `
            <label>Técnico responsável
              <select name="TecnicoResponsavel">
                <option value="">Sem responsável — fica no almoxarifado</option>
                ${colaboradores.map((c) => `<option ${c.Nome === (material && material.TecnicoResponsavel) ? 'selected' : ''}>${escapeHtml(c.Nome)}</option>`).join('')}
              </select>
            </label>
          ` : `<input type="hidden" name="TecnicoResponsavel" value="${escapeHtml(tecnicoFixo)}" />`}
          <p class="msg-erro" id="erro-material-modal" style="display:none"></p>
          <div class="acoes">
            <button type="submit">Salvar</button>
          </div>
        </form>
      `
    });
    document.getElementById('form-material-modal').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      const erroEl = document.getElementById('erro-material-modal');
      erroEl.style.display = 'none';
      try {
        await aoSalvar(dados);
        fecharModal();
        await viewMateriaisReferencia(main);
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      }
    });
  }

  main.querySelectorAll('.btn-novo').forEach((btn) => {
    btn.addEventListener('click', () => {
      abrirFormulario({
        titulo: 'Novo material de referência',
        tecnicoFixo: btn.dataset.tecnico,
        aoSalvar: (dados) => api.criarMaterialReferencia(dados)
      });
    });
  });

  document.getElementById('btn-novo-geral').addEventListener('click', () => {
    abrirFormulario({
      titulo: 'Novo material de referência',
      aoSalvar: (dados) => api.criarMaterialReferencia(dados)
    });
  });

  main.querySelectorAll('.btn-editar').forEach((btn) => {
    btn.addEventListener('click', () => {
      const material = visiveis.find((m) => m.ID === btn.dataset.id);
      abrirFormulario({
        titulo: `Editar ${material.Identificacao}`,
        material,
        aoSalvar: (dados) => api.editarMaterialReferencia({ ID: material.ID, ...dados })
      });
    });
  });

  main.querySelectorAll('.btn-remover').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const material = visiveis.find((m) => m.ID === btn.dataset.id);
      if (!confirm(`Remover "${material.Identificacao}"? O histórico de lote/certificado fica preservado, só sai da lista ativa.`)) return;
      try {
        await api.removerMaterialReferencia({ ID: material.ID });
        await viewMateriaisReferencia(main);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
