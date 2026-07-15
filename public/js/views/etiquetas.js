import { api } from '../api.js';
import { escapeHtml } from '../util.js';

function gerarQrDataUrl(texto) {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr.createDataURL(6, 4);
}

function urlDoItem(baseUrl, id) {
  return `${baseUrl.replace(/\/$/, '')}/#/item/${encodeURIComponent(id)}`;
}

export async function viewEtiquetas(main) {
  const itens = await api.listItens();
  const baseUrlPadrao = location.protocol === 'file:' ? 'https://SEU-SITE.netlify.app' : location.origin;

  main.innerHTML = `
    <div class="pagina-titulo no-print">
      <h2>Etiquetas com QR Code</h2>
      <div class="subtitulo">Gere e imprima etiquetas para colar nos itens</div>
    </div>
    <div class="card no-print">
      <p class="ajuda">Cada QR abre a página de histórico do item. Ajuste a URL base se este site ainda não estiver publicado, e o tamanho da etiqueta conforme sua impressora térmica.</p>
      <div class="grid cols-3">
        <label>URL base do site
          <input id="url-base" value="${escapeHtml(baseUrlPadrao)}" />
        </label>
        <label>Largura da etiqueta (mm)
          <input id="etq-largura" type="number" value="40" />
        </label>
        <label>Altura da etiqueta (mm)
          <input id="etq-altura" type="number" value="30" />
        </label>
      </div>
      <div style="margin-top:10px">
        <label style="flex-direction: row; align-items:center; gap:6px"><input type="checkbox" id="marcar-todos" /> Selecionar todos</label>
      </div>
      <div class="grid cols-3" id="lista-selecao" style="margin-top:8px; max-height:220px; overflow:auto; border:1px solid var(--cinza-borda); border-radius:8px; padding:10px">
        ${itens.map((i) => `
          <label style="flex-direction: row; align-items:center; gap:6px; font-weight:400">
            <input type="checkbox" class="chk-item" value="${escapeHtml(i.ID)}" />
            ${escapeHtml(i.ID)} — ${escapeHtml(i.Descricao || '')}
          </label>
        `).join('')}
      </div>
      <button id="btn-gerar" style="margin-top:12px">Gerar etiquetas</button>
      <button id="btn-imprimir" class="secundario" style="margin-top:12px">Imprimir</button>
    </div>

    <style id="estilo-etiqueta"></style>
    <div class="etiquetas-grade" id="grade-etiquetas"></div>
  `;

  function atualizarEstiloImpressao() {
    const largura = document.getElementById('etq-largura').value || 40;
    const altura = document.getElementById('etq-altura').value || 30;
    document.getElementById('estilo-etiqueta').textContent = `
      @media print {
        @page { size: ${largura}mm ${altura}mm; margin: 2mm; }
        .etiqueta { width: ${largura}mm; height: ${altura}mm; page-break-after: always; }
      }
    `;
  }

  document.getElementById('marcar-todos').addEventListener('change', (e) => {
    document.querySelectorAll('.chk-item').forEach((chk) => { chk.checked = e.target.checked; });
  });

  document.getElementById('btn-gerar').addEventListener('click', () => {
    atualizarEstiloImpressao();
    const baseUrl = document.getElementById('url-base').value;
    const selecionados = Array.from(document.querySelectorAll('.chk-item:checked')).map((c) => c.value);
    const grade = document.getElementById('grade-etiquetas');
    if (selecionados.length === 0) {
      grade.innerHTML = '<p class="no-print">Selecione ao menos um item.</p>';
      return;
    }
    grade.innerHTML = selecionados.map((id) => {
      const item = itens.find((i) => i.ID === id);
      const link = urlDoItem(baseUrl, id);
      return `
        <div class="etiqueta">
          <img src="${gerarQrDataUrl(link)}" alt="QR ${escapeHtml(id)}" />
          <div><strong>${escapeHtml(id)}</strong></div>
          <div>${escapeHtml(item?.Descricao || '')}</div>
        </div>
      `;
    }).join('');
  });

  document.getElementById('btn-imprimir').addEventListener('click', () => window.print());
}
