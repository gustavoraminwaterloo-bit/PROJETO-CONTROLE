import { api } from '../api.js';
import { escapeHtml } from '../util.js';
import { icons } from '../icons.js';

const NOMES_AMIGAVEIS = {
  listItens: 'Consultar itens de TI', getItem: 'Consultar item', listEquipamentos: 'Consultar equipamentos',
  getEquipamento: 'Consultar equipamento', listVeiculos: 'Consultar veículos', getVeiculo: 'Consultar veículo',
  listColaboradores: 'Consultar colaboradores', listProjetos: 'Consultar projetos', listMateriaisReferencia: 'Consultar materiais de referência',
  listMovimentacoes: 'Consultar movimentações', custoPorProjeto: 'Calcular custo por projeto', avisos: 'Consultar avisos',
  criarItem: 'Cadastrar novo item de TI', registrarEntrada: 'Registrar entrada (compra)', alocarColaborador: 'Alocar a um colaborador',
  registrarSaidaProjeto: 'Registrar saída para projeto', registrarDevolucao: 'Registrar devolução',
  criarEquipamento: 'Cadastrar novo equipamento', registrarLocacao: 'Registrar locação de equipamento',
  registrarDevolucaoEquipamento: 'Registrar devolução de equipamento', registrarCalibracaoEquipamento: 'Registrar calibração',
  criarVeiculo: 'Cadastrar novo veículo', criarColaborador: 'Cadastrar novo colaborador', criarProjeto: 'Cadastrar novo projeto',
  criarMaterialReferencia: 'Cadastrar novo material de referência', importarLote: 'Importar várias linhas de uma vez'
};

function extrairTexto(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

function primeiroToolUse(content) {
  return Array.isArray(content) ? content.find((b) => b.type === 'tool_use') : null;
}

function ehApenasToolResult(content) {
  return Array.isArray(content) && content.length > 0 && content.every((b) => b.type === 'tool_result');
}

function corpoConfirmacao(pendente) {
  if (pendente.ferramenta === 'importarLote') {
    const linhas = (pendente.parametros && pendente.parametros.linhas) || [];
    const aba = (pendente.parametros && pendente.parametros.aba) || '?';
    const amostra = linhas.slice(0, 5).map((linha) => {
      const resumo = Object.entries(linha).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ');
      return `<tr><td>${escapeHtml(resumo)}</td></tr>`;
    }).join('');
    return `
      <p style="margin:0 0 8px">Aba <strong>${escapeHtml(aba)}</strong> — <strong>${linhas.length}</strong> linha${linhas.length === 1 ? '' : 's'} serão cadastradas.</p>
      <table>${amostra}</table>
      ${linhas.length > 5 ? `<p class="ajuda">+ ${linhas.length - 5} outra${linhas.length - 5 === 1 ? '' : 's'} linha${linhas.length - 5 === 1 ? '' : 's'}...</p>` : ''}
    `;
  }
  const linhas = Object.entries(pendente.parametros || {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('');
  return `<table>${linhas}</table>`;
}

export async function viewAssistente(main) {
  let mensagens = [];
  let pendente = null;
  let carregando = false;

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Assistente</h2>
      <div class="subtitulo">Converse para consultar dados ou registrar ações — ações que alteram dados sempre pedem sua confirmação antes de executar. Pode colar várias linhas de uma planilha ou anexar um .csv/.txt para cadastrar tudo de uma vez.</div>
    </div>
    <div class="card chat-shell">
      <div class="chat-mensagens" id="chat-mensagens">
        <div class="chat-vazio" id="chat-vazio">Pergunte algo como "quais equipamentos vencem calibração este mês?", "registra a devolução do MP-01", ou cole linhas de uma planilha para cadastrar em lote.</div>
      </div>
      <div id="chat-pendente-area"></div>
      <p class="msg-erro" id="chat-erro" style="display:none"></p>
      <form id="form-chat" class="chat-form">
        <input type="file" id="chat-arquivo" accept=".csv,.txt" style="display:none" />
        <button type="button" class="secundario icone-only" id="chat-anexar" title="Anexar .csv/.txt">${icons.anexo}</button>
        <textarea id="chat-input" rows="1" placeholder="Digite sua pergunta ou cole os dados da planilha..." autocomplete="off"></textarea>
        <button type="submit" id="chat-enviar">Enviar</button>
      </form>
    </div>
  `;

  const elMensagens = document.getElementById('chat-mensagens');
  const elPendenteArea = document.getElementById('chat-pendente-area');
  const elErro = document.getElementById('chat-erro');
  const elInput = document.getElementById('chat-input');
  const elEnviar = document.getElementById('chat-enviar');
  const elArquivo = document.getElementById('chat-arquivo');

  function renderizar() {
    document.getElementById('chat-vazio')?.remove();
    elMensagens.innerHTML = '';
    mensagens.forEach((m) => {
      if (m.role === 'user') {
        if (ehApenasToolResult(m.content)) return;
        const texto = extrairTexto(m.content) || (typeof m.content === 'string' ? m.content : '');
        if (texto) elMensagens.insertAdjacentHTML('beforeend', `<div class="chat-bolha usuario">${escapeHtml(texto)}</div>`);
      } else {
        const texto = extrairTexto(m.content);
        if (texto) elMensagens.insertAdjacentHTML('beforeend', `<div class="chat-bolha assistente">${escapeHtml(texto)}</div>`);
        const toolUse = primeiroToolUse(m.content);
        if (toolUse) {
          elMensagens.insertAdjacentHTML('beforeend', `<div class="chat-bolha sistema">🔎 ${escapeHtml(NOMES_AMIGAVEIS[toolUse.name] || toolUse.name)}...</div>`);
        }
      }
    });

    if (carregando) {
      elMensagens.insertAdjacentHTML('beforeend', `<div class="chat-bolha sistema">Pensando...</div>`);
    }

    if (pendente) {
      elPendenteArea.innerHTML = `
        <div class="chat-pendente">
          <h4>Confirmar ação: ${escapeHtml(NOMES_AMIGAVEIS[pendente.ferramenta] || pendente.ferramenta)}</h4>
          ${corpoConfirmacao(pendente)}
          <div class="acoes">
            <button type="button" id="btn-confirmar-pendente" class="sucesso">Confirmar</button>
            <button type="button" id="btn-cancelar-pendente" class="secundario">Cancelar</button>
          </div>
        </div>
      `;
      document.getElementById('btn-confirmar-pendente').addEventListener('click', () => resolverPendente(true));
      document.getElementById('btn-cancelar-pendente').addEventListener('click', () => resolverPendente(false));
    } else {
      elPendenteArea.innerHTML = '';
    }

    elMensagens.scrollTop = elMensagens.scrollHeight;
  }

  async function enviar(corpo) {
    carregando = true;
    elErro.style.display = 'none';
    elEnviar.disabled = true;
    elInput.disabled = true;
    renderizar();
    try {
      const resposta = await api.assistente(corpo);
      if (!resposta.ok) throw new Error(resposta.error || 'Erro desconhecido.');
      mensagens = resposta.mensagens;
      pendente = resposta.pendente;
      if (resposta.aviso) {
        mensagens.push({ role: 'assistant', content: [{ type: 'text', text: resposta.aviso }] });
      }
    } catch (err) {
      elErro.textContent = err.message;
      elErro.style.display = 'block';
    } finally {
      carregando = false;
      elEnviar.disabled = false;
      elInput.disabled = false;
      renderizar();
      elInput.focus();
    }
  }

  async function resolverPendente(confirmar) {
    const { toolUseId, ferramenta, parametros } = pendente;
    pendente = null;
    await enviar({ mensagens, confirmar, cancelar: !confirmar, toolUseId, ferramenta, parametros });
  }

  elInput.addEventListener('input', () => {
    elInput.style.height = 'auto';
    elInput.style.height = `${Math.min(elInput.scrollHeight, 220)}px`;
  });

  elInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('form-chat').requestSubmit();
    }
  });

  elArquivo.addEventListener('change', () => {
    const arquivo = elArquivo.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const prefixo = elInput.value.trim() ? `${elInput.value.trim()}\n\n` : `Cadastre os dados desta planilha (${arquivo.name}):\n\n`;
      elInput.value = prefixo + String(leitor.result || '');
      elInput.dispatchEvent(new Event('input'));
      elInput.focus();
    };
    leitor.readAsText(arquivo);
    elArquivo.value = '';
  });

  document.getElementById('chat-anexar').addEventListener('click', () => elArquivo.click());

  document.getElementById('form-chat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = elInput.value.trim();
    if (!texto || carregando) return;
    mensagens.push({ role: 'user', content: texto });
    elInput.value = '';
    elInput.style.height = 'auto';
    await enviar({ mensagens });
  });

  renderizar();
}
