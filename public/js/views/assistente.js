import { api } from '../api.js';
import { escapeHtml } from '../util.js';

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
  criarMaterialReferencia: 'Cadastrar novo material de referência'
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

export async function viewAssistente(main) {
  let mensagens = [];
  let pendente = null;
  let carregando = false;

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Assistente</h2>
      <div class="subtitulo">Converse para consultar dados ou registrar ações — ações que alteram dados sempre pedem sua confirmação antes de executar.</div>
    </div>
    <div class="card chat-shell">
      <div class="chat-mensagens" id="chat-mensagens">
        <div class="chat-vazio" id="chat-vazio">Pergunte algo como "quais equipamentos vencem calibração este mês?" ou "registra a devolução do MP-01".</div>
      </div>
      <div id="chat-pendente-area"></div>
      <p class="msg-erro" id="chat-erro" style="display:none"></p>
      <form id="form-chat" class="chat-form">
        <input type="text" id="chat-input" placeholder="Digite sua pergunta..." autocomplete="off" />
        <button type="submit" id="chat-enviar">Enviar</button>
      </form>
    </div>
  `;

  const elMensagens = document.getElementById('chat-mensagens');
  const elPendenteArea = document.getElementById('chat-pendente-area');
  const elErro = document.getElementById('chat-erro');
  const elInput = document.getElementById('chat-input');
  const elEnviar = document.getElementById('chat-enviar');

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
      const linhas = Object.entries(pendente.parametros || {})
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
        .join('');
      elPendenteArea.innerHTML = `
        <div class="chat-pendente">
          <h4>Confirmar ação: ${escapeHtml(NOMES_AMIGAVEIS[pendente.ferramenta] || pendente.ferramenta)}</h4>
          <table>${linhas}</table>
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

  document.getElementById('form-chat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = elInput.value.trim();
    if (!texto || carregando) return;
    mensagens.push({ role: 'user', content: texto });
    elInput.value = '';
    await enviar({ mensagens });
  });

  renderizar();
}
