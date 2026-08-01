# Planilha modelo (Google Sheets)

> **Nota:** as abas `Reservas` (reserva de veículo por período) e `Usuarios` (login individual de
> analista) **não são mais usadas** pelo sistema — a reserva de frota é feita em outro sistema, e o
> acesso aqui é só de administrador (senha única `ADMIN_PASSWORD` no Netlify). Se essas abas já
> existem na sua planilha, pode deixá-las lá como histórico: o sistema simplesmente não as lê mais.

Crie uma planilha nova no Google Sheets com exatamente estas 7 abas. Os nomes das abas e das colunas
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

| ID | Descricao | Marca | Modelo | NumeroSerie | DataCompra | ValorPago | Fornecedor | Status | ColaboradorAtual | LocalArmazenamento | UltimaCalibracao | ProximaCalibracao | NumeroCertificadoCalibracao | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **ID**: código único do equipamento (ex: `MP-01`, `BA-02`) — mantenha os códigos que já existem no
  `LEMCC-V02.xlsx` e no `PT-005-F02-V03.xlsx`.
- **Modelo**: separado de Marca pra bater com a coluna que já existe no LEMCC (ex: Marca `Hanna`,
  Modelo `HI 98194`).
- **Status**: Em estoque / Em locação / Em manutenção / Fora de uso
- **ColaboradorAtual**: quando `Status = Em locação`, é o solicitante/técnico responsável atual.
- Toda calibração e locação (empréstimo a projeto) é feita a partir desta aba, na tela
  "Equipamentos" do site.

## Aba `Veiculos` (frota)

| ID | Placa | Descricao | Marca | Ano | Quilometragem | DataCompra | ValorPago | Fornecedor | Status | ColaboradorAtual | LocalArmazenamento | DataAssinaturaContrato | PeriodoContratoMeses | VencimentoContrato | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **ID**: código único do veículo (ex: `CARRO-01`) — não use a placa como código, já que placa pode
  mudar (ex: revalidação para o padrão Mercosul); guarde a placa no campo `Placa`.
- **Status**: Em estoque / Com colaborador / Em manutenção / Fora de uso
- **DataAssinaturaContrato** / **PeriodoContratoMeses** / **VencimentoContrato**: controle de
  contrato/locação do veículo (quando aplicável) — use uma data completa em `VencimentoContrato` (ex:
  `2030-02-23`), é ela que gera o aviso no Painel, igual já acontece com calibração de equipamento e
  validade de material de referência.
- Alocação e devolução de veículo funcionam igual à de `Itens` (alocação fixa a um colaborador,
  normalmente um técnico) — usa as mesmas ações do sistema, só que na tela "Veículos".

## Aba `Movimentacoes`

| ID | DataHora | ItemID | Tipo | Quantidade | ValorUnitario | Fornecedor | ProjetoDestino | ColaboradorEnvolvido | ChecadoPor | DataDevolucaoPrevista | DataDevolucaoReal | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Preenchida automaticamente pelo sistema — você não precisa digitar nada aqui manualmente, só deixar a
aba criada com os cabeçalhos. **Esta aba é compartilhada** entre `Itens`, `Equipamentos` e
`Veiculos` (o `ItemID` aponta para um código de qualquer uma das três abas) — é o que permite o
custo por projeto e o histórico de "últimas movimentações" ficarem consolidados num só lugar.

## Aba `Colaboradores`

| Nome | Cargo | Email | Status |
|---|---|---|---|

## Aba `Projetos`

| Codigo | Cliente | Status |
|---|---|---|

Preencha aqui os projetos a partir da lista oficial que vocês já mantêm.

## Aba `MateriaisReferencia`

| ID | Identificacao | Certificador | NumeroCertificado | Lote | IncertezaMedicao | Validade | Status | TecnicoResponsavel | Observacoes |
|---|---|---|---|---|---|---|---|---|---|

- **Validade**: use uma data completa (ex: `2026-12-31`), não o formato "dezembro-26" do documento
  Word atual — assim o sistema consegue calcular corretamente quantos dias faltam para vencer.
- **TecnicoResponsavel**: técnico(s) que estão com a solução no momento (segue o PT-007 — o Responsável
  da Logística entrega a solução fracionada para os técnicos e precisa saber com quem cada lote está).
  Como um mesmo lote costuma ser fracionado entre vários técnicos, este campo aceita **vários nomes
  separados por vírgula** (ex: `Fernando Luna, Samantha Stocco`) — assim um lote continua sendo **uma
  única linha**, em vez de linhas repetidas com o mesmo lote/certificado. Na tela **Materiais de
  Referência** o lote aparece no card de cada técnico da lista (indicando com quem está compartilhado),
  e a edição é por caixas de seleção — clique duas vezes na linha para abrir.

## Depois de criar a planilha

1. Copie o ID da planilha (o trecho da URL entre `/d/` e `/edit`).
2. Siga o `README.md` para configurar o Apps Script com esse ID.
