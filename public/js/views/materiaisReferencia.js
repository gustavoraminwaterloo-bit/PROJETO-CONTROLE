import { api } from '../api.js';
import { escapeHtml, formatarData, classeBadgeStatus, abrirModal, fecharModal, paraData } from '../util.js';
import { icons } from '../icons.js';

const SEM_RESPONSAVEL = 'Sem responsável';

// Um lote é fracionado entre vários técnicos (PT-007), então TecnicoResponsavel
// guarda uma lista separada por vírgula — um lote = um registro, sem duplicar
// linha por técnico. O mesmo material aparece no card de cada técnico da lista.
function tecnicosDoMaterial(m) {
  return String(m.TecnicoResponsavel || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

function diasAte(dataStr) {
  if (!dataStr) return null;
  const data = paraData(dataStr);
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
  // 'Substituído' sai da lista ativa junto com 'Removido': o lote foi trocado por
  // outro (PT-007-F01), então o card do técnico deve mostrar só o lote atual. A
  // linha antiga continua na planilha, e a troca fica no histórico de movimentações.
  const visiveis = materiais.filter((m) => m.Status !== 'Removido' && m.Status !== 'Substituído');

  const grupos = new Map();
  visiveis.forEach((m) => {
    const chaves = tecnicosDoMaterial(m);
    (chaves.length ? chaves : [SEM_RESPONSAVEL]).forEach((chave) => {
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(m);
    });
  });
  const tecnicos = [...grupos.keys()].sort((a, b) => {
    if (a === SEM_RESPONSAVEL) return 1;
    if (b === SEM_RESPONSAVEL) return -1;
    return a.localeCompare(b, 'pt-BR');
  });

  function linhaItem(m, tecnicoDoCard) {
    const dias = diasAte(m.Validade);
    const v = statusValidade(dias);
    const outros = tecnicosDoMaterial(m).filter((t) => t !== tecnicoDoCard);
    return `
      <tr data-id="${escapeHtml(m.ID)}" title="Clique duas vezes para editar">
        <td>${escapeHtml(m.Identificacao)}${m.Lote ? `<br/><span style="color:var(--text-muted)">lote ${escapeHtml(m.Lote)}</span>` : ''}${outros.length ? `<br/><span style="color:var(--text-muted); font-size:0.85em">compartilhado com ${escapeHtml(outros.join(', '))}</span>` : ''}</td>
        <td>${formatarData(m.Validade)} ${v ? `<span class="badge ${v.classe}">${v.rotulo}</span>` : ''}</td>
        <td><span class="badge ${classeBadgeStatus(m.Status)}">${escapeHtml(m.Status)}</span></td>
        <td class="no-print acoes">
          <button type="button" class="secundario icone-only btn-editar" data-id="${escapeHtml(m.ID)}" title="Editar">${icons.editar}</button>
          <button type="button" class="secundario icone-only btn-duplicar" data-id="${escapeHtml(m.ID)}" title="Novo lote desta mesma solução">${icons.mais}</button>
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
            <tbody>${itens.map((m) => linhaItem(m, nome)).join('')}</tbody>
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

  // Caixinhas de técnico — compartilhado entre "novo/editar material" e
  // "novo lote", pra a lista de responsáveis funcionar igual nos dois.
  function fieldsetTecnicos(selecionados) {
    return `
      <fieldset style="border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; margin:0">
        <legend style="font-size:0.85rem; font-weight:600; color:var(--text-secondary); padding:0 4px">Técnicos responsáveis</legend>
        <small class="ajuda" style="display:block; margin-bottom:8px">Marque todos que estão com uma fração deste lote. Nenhum marcado = fica no almoxarifado.</small>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:4px 12px">
          ${colaboradores.map((c) => `
            <label style="flex-direction:row; align-items:center; gap:7px; font-weight:400">
              <input type="checkbox" name="tecnico" value="${escapeHtml(c.Nome)}" ${selecionados.includes(c.Nome) ? 'checked' : ''} style="width:auto; margin:0" />
              ${escapeHtml(c.Nome)}
            </label>
          `).join('')}
        </div>
      </fieldset>
    `;
  }

  function abrirFormulario({ titulo, material, tecnicoFixo, aoSalvar }) {
    const jaSelecionados = material ? tecnicosDoMaterial(material) : [];
    abrirModal({
      titulo,
      conteudoHtml: `
        <form id="form-material-modal">
          ${camposFormulario(material)}
          ${tecnicoFixo === undefined
            ? fieldsetTecnicos(jaSelecionados)
            : `<input type="hidden" name="tecnico" value="${escapeHtml(tecnicoFixo)}" />`}
          <p class="msg-erro" id="erro-material-modal" style="display:none"></p>
          <div class="acoes">
            <button type="submit">Salvar</button>
          </div>
        </form>
      `
    });
    document.getElementById('form-material-modal').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const dados = Object.fromEntries(formData.entries());
      // getAll: os técnicos são checkboxes com o mesmo name, e .entries() só
      // guardaria o último. Vira a lista separada por vírgula que o backend espera.
      delete dados.tecnico;
      dados.TecnicoResponsavel = formData.getAll('tecnico').join(', ');
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

  function abrirEdicaoMaterial(material) {
    if (!material) return;
    abrirFormulario({
      titulo: `Editar ${material.Identificacao}`,
      material,
      aoSalvar: (dados) => api.editarMaterialReferencia({ ID: material.ID, ...dados })
    });
  }

  // Novo lote da mesma solução: o que não muda entre compras (identificação,
  // certificador, incerteza) vem copiado da origem e nem aparece no formulário —
  // só se preenche lote, certificado e validade. Se for troca de lote, o checkbox
  // marca o antigo como Substituído e registra o histórico do PT-007-F01.
  function abrirNovoLote(origem) {
    if (!origem) return;
    abrirModal({
      titulo: `Novo lote — ${origem.Identificacao}`,
      conteudoHtml: `
        <form id="form-novo-lote">
          <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; font-size:0.85rem; color:var(--text-secondary)">
            <strong style="color:var(--text-primary)">${escapeHtml(origem.Identificacao)}</strong><br/>
            ${escapeHtml(origem.Certificador || 'sem certificador')} · lote atual ${escapeHtml(origem.Lote || '-')}
            ${origem.IncertezaMedicao ? `<br/>${escapeHtml(origem.IncertezaMedicao)}` : ''}
          </div>
          <div class="grid cols-2">
            <label>Lote novo * <input name="Lote" required autofocus /></label>
            <label>Validade * <input name="Validade" type="date" required /></label>
          </div>
          <label>Nº do certificado * <input name="NumeroCertificado" required /></label>
          ${fieldsetTecnicos(tecnicosDoMaterial(origem))}
          <label style="flex-direction:row; align-items:center; gap:7px; font-weight:400">
            <input type="checkbox" name="SubstituirOrigem" id="chk-substituir" style="width:auto; margin:0" />
            Substituir o lote atual (${escapeHtml(origem.Lote || 'sem lote')})
          </label>
          <label id="campo-motivo" style="display:none">Motivo da substituição
            <input name="Motivo" placeholder="ex: consumo, validade vencida" />
          </label>
          <label>Observações <textarea name="Observacoes"></textarea></label>
          <p class="msg-erro" id="erro-novo-lote" style="display:none"></p>
          <div class="acoes"><button type="submit">Cadastrar novo lote</button></div>
        </form>
      `
    });

    const chk = document.getElementById('chk-substituir');
    chk.addEventListener('change', () => {
      document.getElementById('campo-motivo').style.display = chk.checked ? '' : 'none';
    });

    document.getElementById('form-novo-lote').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const dados = Object.fromEntries(formData.entries());
      delete dados.tecnico;
      dados.TecnicoResponsavel = formData.getAll('tecnico').join(', ');
      dados.IDOrigem = origem.ID;
      dados.SubstituirOrigem = formData.get('SubstituirOrigem') === 'on';
      const erroEl = document.getElementById('erro-novo-lote');
      erroEl.style.display = 'none';
      try {
        await api.duplicarMaterialReferencia(dados);
        fecharModal();
        await viewMateriaisReferencia(main);
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.style.display = 'block';
      }
    });
  }

  main.querySelectorAll('.btn-editar').forEach((btn) => {
    btn.addEventListener('click', () => {
      abrirEdicaoMaterial(visiveis.find((m) => m.ID === btn.dataset.id));
    });
  });

  main.querySelectorAll('.btn-duplicar').forEach((btn) => {
    btn.addEventListener('click', () => {
      abrirNovoLote(visiveis.find((m) => m.ID === btn.dataset.id));
    });
  });

  main.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
    tr.addEventListener('dblclick', () => {
      abrirEdicaoMaterial(visiveis.find((m) => m.ID === tr.dataset.id));
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
