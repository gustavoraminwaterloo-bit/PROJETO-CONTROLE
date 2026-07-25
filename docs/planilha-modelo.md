# Planilha modelo (Google Sheets)

Crie uma planilha nova no Google Sheets com exatamente estas 9 abas. Os nomes das abas e das colunas
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

## Aba `Reservas` (uso/reserva de veículos por período)

| ID | VeiculoID | Colaborador | Projeto | DataHoraSaida | PrevisaoRetorno | DataHoraRetorno | HodometroSaida | HodometroChegada | CombustivelLitros | CombustivelCusto | Status | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **ID**: gerado pelo sistema (ex: `RES-A1B2C3D4`), não precisa preencher na mão.
- **VeiculoID**: código do veículo (aba `Veiculos`).
- **Colaborador**: quem está usando o veículo nesse período (pode ser diferente do
  `ColaboradorAtual` fixo do veículo — ver abaixo).
- **Status**: `Agendado` (reserva futura, ainda não retirou) / `Em andamento` (já retirou, ainda não
  devolveu) / `Concluído` / `Cancelado`.
- Esta aba serve tanto para veículos de uso compartilhado (ex: um HB20 que qualquer analista pode
  reservar por data/hora) quanto para um **empréstimo temporário de um veículo normalmente fixo** a um
  técnico (ex: a Fiorino do Rubens emprestada ao Fernando por alguns dias). Nesse segundo caso, o
  `ColaboradorAtual` do veículo na aba `Veiculos` **não muda** — ele continua sendo o responsável
  padrão; a linha em `Reservas` é que registra quem esteve com o carro naquele intervalo exato de
  datas. Isso permite consultar depois, por data, quem estava de fato com qual veículo (útil por
  exemplo pra apurar responsabilidade em multa de trânsito): se existir uma Reserva cobrindo aquele
  veículo+data, o responsável é o `Colaborador` dela; senão, é o `ColaboradorAtual` padrão do veículo.
- Ao registrar o retorno, preencha `DataHoraRetorno`, `HodometroChegada`, `CombustivelLitros` (se
  abasteceu) e `CombustivelCusto` — o sistema também atualiza a `Quilometragem` do veículo.

## Aba `Usuarios` (login individual dos analistas)

| Nome | Usuario | SenhaHash | Papel | Status |
|---|---|---|---|---|

- Esta aba guarda só os logins de **analistas** (acesso reduzido, só à reserva de veículos). O login
  de administrador continua sendo a senha única `ADMIN_PASSWORD` configurada no Netlify — não entra
  nesta aba.
- **SenhaHash**: nunca digite a senha em texto puro aqui. As linhas desta aba são criadas pela tela
  "Usuários" do site (menu do administrador), que já converte a senha num hash antes de gravar — a
  senha em texto puro nunca é salva na planilha.
- **Papel**: sempre `analista` nesta aba.
- **Status**: `Ativo` / `Inativo` (desativar em vez de apagar a linha, para manter o histórico de quem
  fez cada reserva).

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

| ID | Identificacao | Certificador | NumeroCertificado | Lote | IncertezaMedicao | Validade | Status | ColaboradorAtual | Observacoes |
|---|---|---|---|---|---|---|---|---|---|

- **Validade**: use uma data completa (ex: `2026-12-31`), não o formato "dezembro-26" do documento
  Word atual — assim o sistema consegue calcular corretamente quantos dias faltam para vencer.
- **ColaboradorAtual**: técnico que está com a solução no momento (segue o PT-007 — o Responsável da
  Logística entrega a solução fracionada para o técnico e precisa saber com quem cada lote está). Na
  tela **Materiais de Referência**, dá pra trocar isso a qualquer momento num campo direto na lista,
  sem precisar abrir formulário.

## Depois de criar a planilha

1. Copie o ID da planilha (o trecho da URL entre `/d/` e `/edit`).
2. Siga o `README.md` para configurar o Apps Script com esse ID.
