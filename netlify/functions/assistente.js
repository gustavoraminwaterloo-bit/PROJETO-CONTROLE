// Netlify Function — assistente de IA que consulta e atualiza os dados do
// sistema por conversa. Suporta mais de um provedor de IA (ver _ia_gemini.js
// e _ia_claude.js) — escolha via variável de ambiente IA_PROVIDER.
//
// Regra de segurança central: a IA nunca executa uma ação de ESCRITA por
// conta própria. Quando ela pede pra chamar uma ferramenta marcada como
// escrita (ver _ferramentas.js), a function PARA e devolve um "pendente"
// pro site mostrar um botão de confirmar/cancelar — só depois disso a ação
// de fato é executada no Apps Script.
//
// Variáveis de ambiente adicionais (além das já usadas em api.js):
//   IA_PROVIDER        -> "gemini" (padrão) ou "claude"
//   GEMINI_API_KEY      -> chave de API do Gemini (aistudio.google.com/apikey), se IA_PROVIDER=gemini
//   GEMINI_MODEL         -> opcional, padrão "gemini-2.5-flash"
//   ANTHROPIC_API_KEY   -> chave de API da Anthropic (console.anthropic.com), se IA_PROVIDER=claude
//   ANTHROPIC_MODEL      -> opcional, padrão "claude-sonnet-5"

const { json, sessaoValida, chamarAppsScript } = require('./_auth');
const { paraLLM, eDeEscrita, existeFerramenta } = require('./_ferramentas');
const iaGemini = require('./_ia_gemini');
const iaClaude = require('./_ia_claude');

const MAX_ITERACOES = 5;

function provedorIA() {
  return (process.env.IA_PROVIDER || 'gemini').toLowerCase() === 'claude' ? iaClaude : iaGemini;
}

function dataDeHoje() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function systemPrompt() {
  return `Você é o assistente de dados do sistema de Controle de Insumos, Patrimônio e Equipamentos de uma empresa. Hoje é ${dataDeHoje()}.

O sistema controla:
- Itens: patrimônio de TI (notebook, celular, mouse, teclado etc.), alocado a colaboradores.
- Equipamentos: equipamentos de medição/laboratório, com calibração periódica e locação a projetos.
- Veiculos: veículos da frota, alocados de forma fixa a colaboradores (geralmente técnicos).
- Colaboradores, Projetos e Materiais de Referência (com validade).

Regras importantes:
- Sempre use as ferramentas disponíveis para responder perguntas sobre dados — nunca invente números, datas ou códigos.
- Se precisar de um código (ID) que o usuário não informou exatamente, procure primeiro com uma ferramenta de leitura (ex: listItens, listEquipamentos) antes de agir.
- Chame no máximo UMA ferramenta por resposta. Se precisar de várias etapas, peça uma por vez.
- Se o usuário colar ou descrever várias linhas de uma planilha (vários itens/equipamentos de uma vez), extraia os campos de cada linha e use a ferramenta importarLote UMA vez com todas as linhas, em vez de chamar a ferramenta de criar várias vezes.
- Antes de propor uma ação que muda dados, explique em texto simples o que você está prestes a fazer (o usuário vai confirmar ou cancelar essa ação numa tela própria — você não precisa pedir "confirma?" em texto, só descreva a ação com clareza).
- Se o pedido do usuário for ambíguo (ex: qual item exatamente, qual colaborador), pergunte antes de chamar uma ferramenta de escrita.
- Seja direto e objetivo nas respostas, em português do Brasil.`;
}

function primeiroToolUse(content) {
  return (content || []).find((b) => b.type === 'tool_use') || null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método não permitido.' });
  }
  if (!sessaoValida(event)) {
    return json(401, { ok: false, error: 'Sessão expirada. Faça login novamente.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { ok: false, error: 'Corpo da requisição inválido.' });
  }

  let mensagens = Array.isArray(body.mensagens) ? body.mensagens.slice() : [];
  const { chamar } = provedorIA();

  try {
    if (body.confirmar || body.cancelar) {
      if (!body.toolUseId || !body.ferramenta) {
        return json(400, { ok: false, error: 'Confirmação sem os dados da ação pendente.' });
      }
      let conteudoResultado;
      if (body.cancelar) {
        conteudoResultado = 'Ação cancelada pelo usuário. Não foi executada.';
      } else {
        if (!existeFerramenta(body.ferramenta) || !eDeEscrita(body.ferramenta)) {
          return json(400, { ok: false, error: 'Ação não reconhecida.' });
        }
        const resultado = await chamarAppsScript(body.ferramenta, body.parametros || {});
        conteudoResultado = JSON.stringify(resultado);
      }
      mensagens.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: body.toolUseId, name: body.ferramenta, content: conteudoResultado }] });
    }

    for (let i = 0; i < MAX_ITERACOES; i++) {
      const resposta = await chamar(mensagens, paraLLM(), systemPrompt());
      mensagens.push({ role: 'assistant', content: resposta.content });

      const toolUse = primeiroToolUse(resposta.content);
      if (!toolUse) {
        return json(200, { ok: true, mensagens, pendente: null });
      }

      if (!existeFerramenta(toolUse.name)) {
        mensagens.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, name: toolUse.name, content: 'Ferramenta desconhecida.', is_error: true }] });
        continue;
      }

      if (eDeEscrita(toolUse.name)) {
        return json(200, {
          ok: true,
          mensagens,
          pendente: { toolUseId: toolUse.id, ferramenta: toolUse.name, parametros: toolUse.input }
        });
      }

      const resultado = await chamarAppsScript(toolUse.name, toolUse.input);
      mensagens.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, name: toolUse.name, content: JSON.stringify(resultado) }] });
    }

    return json(200, { ok: true, mensagens, pendente: null, aviso: 'Muitas etapas seguidas — parei por segurança. Pode reformular o pedido?' });
  } catch (err) {
    return json(500, { ok: false, error: err.message });
  }
};
