# Planilha modelo (Google Sheets)

Crie uma planilha nova no Google Sheets com exatamente estas 6 abas. Os nomes das abas e das colunas
precisam ser digitados **exatamente assim** (maiúsculas/minúsculas e acentos importam), porque o
Apps Script (`apps-script/Code.gs`) lê e escreve usando esses nomes.

Cada aba precisa ter os cabeçalhos na **linha 1**, uma coluna por campo, na ordem abaixo (a ordem em
si não importa para o sistema, mas facilita conferir visualmente).

## Aba `Itens` (patrimônio de TI)

| ID | Categoria | Descricao | Marca | NumeroSerie | DataCompra | ValorPago | Fornecedor | Status | ColaboradorAtual | LocalArmazenamento | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|

- **ID**: código único do item (ex: `NB-001`, `CEL-003`). Você escolhe o formato.
- **Categoria**: Notebook / Celular / Mouse / Teclado / Mousepad / Suporte / Adaptador de Tela / Monitor / Outro
- **Status**: Em estoque / Com colaborador / Em projeto / Em manutenção / Fora de uso

Esta aba é só para patrimônio de TI alocado a colaboradores. Equipamentos de medição/laboratório
(com calibração e locação a projetos) vivem na aba `Equipamentos` — ver abaixo.

## Aba `Equipamentos` (medição/laboratório)

| ID | Descricao | Marca | NumeroSerie | DataCompra | ValorPago | Fornecedor | Status | ColaboradorAtual | LocalArmazenamento | UltimaCalibracao | ProximaCalibracao | NumeroCertificadoCalibracao | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **ID**: código único do equipamento (ex: `MP-01`, `BA-02`) — mantenha os códigos que já existem no
  `LEMCC-V02.xlsx` e no `PT-005-F02-V03.xlsx`.
- **Status**: Em estoque / Em locação / Em manutenção / Fora de uso
- **ColaboradorAtual**: quando `Status = Em locação`, é o solicitante/técnico responsável atual.
- Toda calibração e locação (empréstimo a projeto) é feita a partir desta aba, na tela
  "Equipamentos" do site.

## Aba `Movimentacoes`

| ID | DataHora | ItemID | Tipo | Quantidade | ValorUnitario | Fornecedor | ProjetoDestino | ColaboradorEnvolvido | ChecadoPor | DataDevolucaoPrevista | DataDevolucaoReal | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Preenchida automaticamente pelo sistema — você não precisa digitar nada aqui manualmente, só deixar a
aba criada com os cabeçalhos. **Esta aba é compartilhada** entre `Itens` e `Equipamentos` (o
`ItemID` aponta para um código de qualquer uma das duas abas) — é o que permite o custo por projeto
e o histórico de "últimas movimentações" ficarem consolidados num só lugar.

## Aba `Colaboradores`

| Nome | Cargo | Email | Status |
|---|---|---|---|

## Aba `Projetos`

| Codigo | Cliente | Status |
|---|---|---|

Preencha aqui os projetos a partir da lista oficial que vocês já mantêm.

## Aba `MateriaisReferencia`

| ID | Identificacao | Certificador | NumeroCertificado | Lote | IncertezaMedicao | Validade | Status | Observacoes |
|---|---|---|---|---|---|---|---|---|

- **Validade**: use uma data completa (ex: `2026-12-31`), não o formato "dezembro-26" do documento
  Word atual — assim o sistema consegue calcular corretamente quantos dias faltam para vencer.

## Depois de criar a planilha

1. Copie o ID da planilha (o trecho da URL entre `/d/` e `/edit`).
2. Siga o `README.md` para configurar o Apps Script com esse ID.
