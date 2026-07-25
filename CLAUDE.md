# Portal Operacional Waterloo — guia para a IA de desenvolvimento

Este projeto (também chamado "Controle de Insumos e Patrimônio" na interface) segue o
**Manual de Instruções** definido pelo administrador (`MANUAL DE INSTRUÇÕES.docx`, na pasta raiz do
projeto, fora do controle de versão). Este arquivo resume as regras operacionais pra qualquer sessão
de desenvolvimento — leia o `.docx` para o texto completo quando precisar do detalhe.

## Prioridade (nessa ordem)

1. **Continuidade** — manter o sistema funcionando, preservar o que já existe, evitar quebras.
2. **Execução** — implementar corretamente o que for pedido, respeitando código/arquitetura/dados atuais.
3. **Melhoria** — otimizar, corrigir, melhorar segurança/desempenho/usabilidade dentro do escopo pedido.
4. **Evolução** — novas tecnologias/arquiteturas só depois de propostas e aprovadas pelo administrador.

## Arquitetura atual — preservar, não migrar por conta própria

- Front-end: HTML/CSS/JavaScript puro (sem build), pasta `public/`.
- Hospedagem: Netlify.
- Banco de dados operacional: Google Sheets.
- Backend/automação: Google Apps Script (`apps-script/Code.gs`).
- IA: API da Anthropic/Claude, chamada só a partir de Netlify Functions (`netlify/functions/`).
- Segredos (incl. `ANTHROPIC_API_KEY`) só como variável de ambiente no Netlify — nunca no front-end,
  nunca `NEXT_PUBLIC_*` ou equivalente, nunca no HTML/CSS/JS público, nunca commitado no Git.

**Não trocar por iniciativa própria**: JS puro → React/Next.js, Google Sheets → Supabase/PostgreSQL,
Apps Script → outro backend, Netlify → outro serviço. Essas tecnologias não são proibidas, mas
qualquer migração estrutural precisa ser **proposta e aprovada pelo administrador antes** de
implementar — nunca assumir essa decisão sozinho.

## Antes de alterar algo existente

1. Entender o funcionamento atual e suas dependências.
2. Avaliar o impacto da mudança.
3. Fazer a menor alteração necessária — não reescrever partes funcionais só por preferência de estilo.
4. Testar (inclusive em modo demo — ver `?mock=1` — antes de precisar do backend real).

## Papéis de acesso

- **Administrador**: acesso completo a todos os módulos e à IA.
- **Analista** (login individual, aba `Usuarios`): acesso restrito — reserva de veículos/equipamentos
  e consulta do que lhe é permitido. Nunca ações administrativas (usuários, permissões, cadastros
  estruturais). A restrição é sempre reforçada no servidor (Netlify Function), nunca só escondida na
  interface.

## Sobre a IA (Assistente do site)

- É uma camada de apoio (consulta, análise, automação) — não deve executar ação de escrita sozinha:
  toda ação que altera dados para no cartão de confirmação do usuário antes de rodar de verdade.
- Nunca inventar dados; usar sempre as ferramentas de leitura antes de responder sobre números/códigos.

## Em caso de dúvida estrutural

Se um pedido puder ter impacto estrutural (mudar arquitetura, banco, tecnologia principal), sinalizar
a dúvida e apresentar alternativas ao administrador antes de implementar — não assumir a decisão.
