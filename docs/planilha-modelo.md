# Planilha modelo (Google Sheets)

Crie uma planilha nova no Google Sheets com exatamente estas 5 abas. Os nomes das abas e das colunas
precisam ser digitados **exatamente assim** (maiúsculas/minúsculas e acentos importam), porque o
Apps Script (`apps-script/Code.gs`) lê e escreve usando esses nomes.

Cada aba precisa ter os cabeçalhos na **linha 1**, uma coluna por campo, na ordem abaixo (a ordem em
si não importa para o sistema, mas facilita conferir visualmente).

## Aba `Itens`

| ID | Categoria | Descricao | Marca | NumeroSerie | DataCompra | ValorPago | Fornecedor | Status | ColaboradorAtual | LocalArmazenamento | RequerCalibracao | UltimaCalibracao | ProximaCalibracao | NumeroCertificadoCalibracao | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **ID**: código único do item (ex: `NB-001`, `MP-01`, `CEL-003`). Você escolhe o formato — mantenha os
  códigos que já existem no `LEMCC-V02.xlsx` e no `PT-005-F02-V03.xlsx` para os equipamentos de medição.
- **Categoria**: Notebook / Celular / Mouse / Teclado / Mousepad / Suporte / Adaptador de Tela / Monitor / Equipamento de Medição / Outro
- **Status**: Em estoque / Com colaborador / Em projeto / Em manutenção / Fora de uso
- **RequerCalibracao**: Sim ou Não (só "Sim" entra nos avisos de calibração do painel)

## Aba `Movimentacoes`

| ID | DataHora | ItemID | Tipo | Quantidade | ValorUnitario | Fornecedor | ProjetoDestino | ColaboradorEnvolvido | ChecadoPor | DataDevolucaoPrevista | DataDevolucaoReal | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Preenchida automaticamente pelo sistema — você não precisa digitar nada aqui manualmente, só deixar a
aba criada com os cabeçalhos.

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
