// Adaptador do provedor de IA: Anthropic (Claude). Mesma interface que os
// outros adaptadores (_ia_gemini.js): chamar(mensagens, ferramentas, systemPrompt)
// -> { content: [ blocos normalizados ] }.

const { requireEnv } = require('./_auth');

function paraMensagensClaude(mensagens) {
  return mensagens.map((m) => ({
    role: m.role,
    content: Array.isArray(m.content)
      ? m.content.map((b) => (b.type === 'tool_result' ? { type: 'tool_result', tool_use_id: b.tool_use_id, content: b.content } : b))
      : m.content
  }));
}

async function chamar(mensagens, ferramentas, systemPrompt) {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const modelo = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1500,
      system: systemPrompt,
      tools: ferramentas,
      messages: paraMensagensClaude(mensagens)
    })
  });
  const dados = await res.json();
  if (!res.ok) {
    throw new Error((dados && dados.error && dados.error.message) || 'Erro ao chamar o Claude.');
  }
  return { content: dados.content };
}

module.exports = { chamar };
