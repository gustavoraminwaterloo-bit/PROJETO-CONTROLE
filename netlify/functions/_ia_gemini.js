// Adaptador do provedor de IA: Google Gemini (Generative Language API).
// Mesma interface que _ia_claude.js: chamar(mensagens, ferramentas, systemPrompt)
// -> { content: [ blocos normalizados ] }, para o resto do assistente.js não
// precisar saber qual provedor está por trás.

const { requireEnv } = require('./_auth');

function tipoGemini(t) {
  return { string: 'STRING', number: 'NUMBER', integer: 'INTEGER', object: 'OBJECT', array: 'ARRAY', boolean: 'BOOLEAN' }[t] || 'STRING';
}

function schemaParaGemini(schema) {
  if (!schema) return { type: 'STRING' };
  if (schema.type === 'object') {
    const properties = {};
    Object.entries(schema.properties || {}).forEach(([k, v]) => { properties[k] = schemaParaGemini(v); });
    const out = { type: 'OBJECT', properties };
    if (schema.required && schema.required.length) out.required = schema.required;
    return out;
  }
  if (schema.type === 'array') {
    return { type: 'ARRAY', items: schemaParaGemini(schema.items || { type: 'string' }) };
  }
  const out = { type: tipoGemini(schema.type) };
  if (schema.enum) out.enum = schema.enum;
  return out;
}

function ferramentasParaGemini(ferramentas) {
  return [{
    functionDeclarations: ferramentas.map((f) => ({
      name: f.name,
      description: f.description,
      parameters: schemaParaGemini(f.input_schema)
    }))
  }];
}

function blocoParaParteGemini(bloco) {
  if (bloco.type === 'text') return { text: bloco.text };
  if (bloco.type === 'tool_use') return { functionCall: { name: bloco.name, args: bloco.input || {} } };
  if (bloco.type === 'tool_result') {
    let resposta;
    try { resposta = JSON.parse(bloco.content); } catch (err) { resposta = { resultado: bloco.content }; }
    return { functionResponse: { name: bloco.name || 'ferramenta', response: resposta } };
  }
  return { text: '' };
}

function mensagensParaGemini(mensagens) {
  return mensagens.map((m) => {
    const blocos = Array.isArray(m.content) ? m.content : [{ type: 'text', text: m.content }];
    const parts = blocos.map(blocoParaParteGemini);
    const temToolResult = blocos.some((b) => b.type === 'tool_result');
    const role = m.role === 'assistant' ? 'model' : (temToolResult ? 'function' : 'user');
    return { role, parts };
  });
}

function partesParaBlocosNormalizados(parts) {
  return (parts || []).map((p, i) => {
    if (typeof p.text === 'string') return { type: 'text', text: p.text };
    if (p.functionCall) {
      return { type: 'tool_use', id: `call_${Date.now()}_${i}`, name: p.functionCall.name, input: p.functionCall.args || {} };
    }
    return null;
  }).filter(Boolean);
}

async function chamar(mensagens, ferramentas, systemPrompt) {
  const apiKey = requireEnv('GEMINI_API_KEY');
  const modelo = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: mensagensParaGemini(mensagens),
      tools: ferramentasParaGemini(ferramentas)
    })
  });
  const dados = await res.json();
  if (!res.ok) {
    throw new Error((dados && dados.error && dados.error.message) || 'Erro ao chamar o Gemini.');
  }
  const candidato = dados.candidates && dados.candidates[0];
  const parts = candidato && candidato.content && candidato.content.parts;
  if (!parts) {
    const motivo = (candidato && candidato.finishReason) || 'sem resposta';
    throw new Error(`O Gemini não retornou conteúdo (motivo: ${motivo}).`);
  }
  return { content: partesParaBlocosNormalizados(parts) };
}

module.exports = { chamar };
