// Catálogo de ferramentas que a IA do assistente pode chamar. Cada ferramenta
// mapeia 1:1 para uma ação do Apps Script (o nome da tool é o nome da action).
// `escrita: true` marca ações que alteram dados — essas nunca são executadas
// direto pela IA; ficam pendentes até o usuário confirmar no site.

const texto = { type: 'string' };
const numero = { type: 'number' };

function ferramenta(name, description, properties, required, escrita) {
  return {
    name,
    description,
    escrita: !!escrita,
    input_schema: { type: 'object', properties, required: required || [] }
  };
}

const FERRAMENTAS = [
  // --- Leitura (executam direto) ---------------------------------------
  ferramenta('listItens', 'Lista todos os itens de patrimônio de TI (notebook, celular, mouse, teclado etc.), com status e colaborador atual.', {}),
  ferramenta('getItem', 'Busca um item de TI específico pelo código (ID), incluindo o histórico de movimentações.', { id: texto }, ['id']),
  ferramenta('listEquipamentos', 'Lista todos os equipamentos de medição/laboratório, com status, colaborador/projeto atual e datas de calibração.', {}),
  ferramenta('getEquipamento', 'Busca um equipamento de medição específico pelo código (ID), incluindo o histórico de movimentações.', { id: texto }, ['id']),
  ferramenta('listVeiculos', 'Lista todos os veículos da frota, com placa, status e colaborador responsável atual.', {}),
  ferramenta('getVeiculo', 'Busca um veículo específico pelo código (ID), incluindo o histórico de movimentações.', { id: texto }, ['id']),
  ferramenta('listColaboradores', 'Lista todos os colaboradores cadastrados (nome, cargo, status).', {}),
  ferramenta('listProjetos', 'Lista todos os projetos cadastrados.', {}),
  ferramenta('listMateriaisReferencia', 'Lista os materiais de referência de laboratório e suas validades.', {}),
  ferramenta('listMovimentacoes', 'Lista o histórico de movimentações (entradas, saídas, locações, devoluções, calibrações). Se informar itemId, filtra só as movimentações daquele item/equipamento/veículo.', { itemId: texto }),
  ferramenta('custoPorProjeto', 'Calcula o custo acumulado de um projeto (ou de todos os projetos, se não informar nenhum) somando as movimentações vinculadas a ele.', { projeto: texto }),
  ferramenta('avisos', 'Lista os avisos de calibração de equipamentos e validade de materiais de referência vencendo dentro de N dias (padrão 60).', { dias: numero }),
  ferramenta('listReservas', 'Lista reservas/usos de veículos (agendamentos futuros, retiradas em andamento, concluídas ou canceladas). Pode filtrar por veiculoId, colaborador ou status (Agendado, Em andamento, Concluído, Cancelado).', { veiculoId: texto, colaborador: texto, status: texto }),
  ferramenta('getReserva', 'Busca uma reserva específica pelo código (ID).', { id: texto }, ['id']),
  ferramenta('verificarDisponibilidade', 'Verifica se um veículo está disponível num período (data/hora de início e fim) — usa antes de propor uma nova reserva.', { veiculoId: texto, inicio: texto, fim: texto }, ['veiculoId', 'inicio']),
  ferramenta('responsavelNaData', 'Descobre quem estava de fato com um veículo numa data específica — considera reservas/empréstimos pontuais registrados naquele período; se não houver nenhum, devolve o responsável fixo (técnico) do veículo. Útil para apurar responsabilidade em multa de trânsito.', { veiculoId: texto, data: texto }, ['veiculoId', 'data']),

  // --- Escrita (sempre pedem confirmação do usuário antes de executar) --
  ferramenta('criarItem', 'Cadastra um novo item de patrimônio de TI.', {
    ID: texto, Categoria: texto, Descricao: texto, Marca: texto, NumeroSerie: texto, DataCompra: texto,
    ValorPago: numero, Fornecedor: texto, Status: texto, ColaboradorAtual: texto, LocalArmazenamento: texto, Observacoes: texto
  }, ['ID'], true),
  ferramenta('registrarEntrada', 'Registra a entrada (compra) de um item de TI já cadastrado, atualizando valor pago e fornecedor.', {
    ItemID: texto, Quantidade: numero, ValorUnitario: numero, Fornecedor: texto, DataCompra: texto, ProjetoDestino: texto, Observacoes: texto
  }, ['ItemID'], true),
  ferramenta('alocarColaborador', 'Aloca (entrega) um item de TI ou veículo a um colaborador, de forma fixa. Funciona tanto para itens de TI quanto para veículos — use o mesmo ItemID do item ou do veículo.', {
    ItemID: texto, ColaboradorEnvolvido: texto, ProjetoDestino: texto, ValorUnitario: numero, Quantidade: numero, Observacoes: texto
  }, ['ItemID', 'ColaboradorEnvolvido'], true),
  ferramenta('registrarSaidaProjeto', 'Registra a saída de um item de TI destinado a um projeto específico (uso/consumo, não é para equipamento de medição).', {
    ItemID: texto, ProjetoDestino: texto, ColaboradorEnvolvido: texto, ValorUnitario: numero, Quantidade: numero, DataDevolucaoPrevista: texto, Observacoes: texto
  }, ['ItemID', 'ProjetoDestino', 'ColaboradorEnvolvido'], true),
  ferramenta('registrarDevolucao', 'Registra a devolução de um item de TI ou veículo, voltando o status para "Em estoque". Funciona tanto para itens de TI quanto para veículos.', {
    ItemID: texto, ChecadoPor: texto, DataDevolucaoReal: texto, Observacoes: texto
  }, ['ItemID'], true),
  ferramenta('criarEquipamento', 'Cadastra um novo equipamento de medição/laboratório.', {
    ID: texto, Descricao: texto, Marca: texto, Modelo: texto, NumeroSerie: texto, DataCompra: texto, ValorPago: numero, Fornecedor: texto,
    Status: texto, ColaboradorAtual: texto, LocalArmazenamento: texto, UltimaCalibracao: texto, ProximaCalibracao: texto,
    NumeroCertificadoCalibracao: texto, Observacoes: texto
  }, ['ID'], true),
  ferramenta('registrarLocacao', 'Registra a locação (empréstimo) de um equipamento de medição para um projeto/solicitante.', {
    ItemID: texto, ProjetoDestino: texto, ColaboradorEnvolvido: texto, ValorUnitario: numero, Quantidade: numero, DataDevolucaoPrevista: texto, Observacoes: texto
  }, ['ItemID', 'ProjetoDestino', 'ColaboradorEnvolvido'], true),
  ferramenta('registrarDevolucaoEquipamento', 'Registra a devolução de um equipamento de medição que estava locado, voltando o status para "Em estoque".', {
    ItemID: texto, ChecadoPor: texto, DataDevolucaoReal: texto, Observacoes: texto
  }, ['ItemID'], true),
  ferramenta('registrarCalibracaoEquipamento', 'Registra uma calibração realizada num equipamento de medição, atualizando a próxima data de calibração.', {
    ItemID: texto, UltimaCalibracao: texto, ProximaCalibracao: texto, NumeroCertificadoCalibracao: texto, Observacoes: texto
  }, ['ItemID', 'ProximaCalibracao'], true),
  ferramenta('criarVeiculo', 'Cadastra um novo veículo na frota.', {
    ID: texto, Placa: texto, Descricao: texto, Marca: texto, Ano: texto, Quilometragem: numero, DataCompra: texto,
    ValorPago: numero, Fornecedor: texto, Status: texto, ColaboradorAtual: texto, LocalArmazenamento: texto,
    DataAssinaturaContrato: texto, PeriodoContratoMeses: numero, VencimentoContrato: texto, Observacoes: texto
  }, ['ID'], true),
  ferramenta('atualizarContratoVeiculo', 'Atualiza a data de assinatura, período (em meses) e vencimento do contrato/locação de um veículo já cadastrado.', {
    ID: texto, DataAssinaturaContrato: texto, PeriodoContratoMeses: numero, VencimentoContrato: texto
  }, ['ID'], true),
  ferramenta('criarColaborador', 'Cadastra um novo colaborador.', {
    Nome: texto, Cargo: texto, Email: texto, Status: texto
  }, ['Nome'], true),
  ferramenta('criarProjeto', 'Cadastra um novo projeto.', {
    Codigo: texto, Cliente: texto, Status: texto
  }, ['Codigo'], true),
  ferramenta('criarMaterialReferencia', 'Cadastra um novo material de referência de laboratório.', {
    ID: texto, Identificacao: texto, Certificador: texto, NumeroCertificado: texto, Lote: texto, IncertezaMedicao: texto,
    Validade: texto, Status: texto, TecnicoResponsavel: texto, Observacoes: texto
  }, ['Identificacao'], true),
  ferramenta('atualizarResponsavelMaterialReferencia', 'Troca qual técnico está com um material de referência/solução no momento (sem mudar status ou outros campos) — use quando o usuário disser algo como "a solução de pH agora está com o Fernando".', {
    ID: texto, TecnicoResponsavel: texto
  }, ['ID'], true),
  ferramenta('importarLote', 'Cadastra várias linhas de uma vez (importação em lote) numa das abas — use quando o usuário colar ou enviar dados de uma planilha com várias linhas, em vez de chamar a ferramenta de criar uma por uma. Cada linha deve ter os mesmos campos da ferramenta de criar daquela aba (ex: para "Itens", cada linha tem ID, Categoria, Descricao etc.).', {
    aba: { type: 'string', enum: ['Itens', 'Equipamentos', 'Veiculos', 'Colaboradores', 'Projetos', 'MateriaisReferencia'] },
    linhas: { type: 'array', items: { type: 'object' } }
  }, ['aba', 'linhas'], true),
  ferramenta('criarReserva', 'Cria uma reserva de veículo — agendamento futuro (se a saída for numa data futura) ou retirada imediata (se a saída for agora). Verifique a disponibilidade antes de propor esta ação.', {
    VeiculoID: texto, Colaborador: texto, Projeto: texto, DataHoraSaida: texto, PrevisaoRetorno: texto, HodometroSaida: numero, Observacoes: texto
  }, ['VeiculoID', 'Colaborador', 'DataHoraSaida'], true),
  ferramenta('iniciarRetiradaReserva', 'Marca uma reserva Agendada como retirada (Em andamento), opcionalmente atualizando o hodômetro de saída.', {
    ID: texto, HodometroSaida: numero, DataHoraSaida: texto
  }, ['ID'], true),
  ferramenta('registrarRetornoReserva', 'Registra o retorno/devolução de uma reserva de veículo, com hodômetro de chegada e combustível abastecido.', {
    ID: texto, HodometroChegada: numero, CombustivelLitros: numero, CombustivelCusto: numero, Observacoes: texto
  }, ['ID', 'HodometroChegada'], true),
  ferramenta('cancelarReserva', 'Cancela uma reserva de veículo que ainda não foi concluída.', {
    ID: texto, Observacoes: texto
  }, ['ID'], true)
];

function paraLLM() {
  return FERRAMENTAS.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
}

function eDeEscrita(nome) {
  const f = FERRAMENTAS.find((x) => x.name === nome);
  return !!(f && f.escrita);
}

function existeFerramenta(nome) {
  return FERRAMENTAS.some((x) => x.name === nome);
}

module.exports = { FERRAMENTAS, paraLLM, eDeEscrita, existeFerramenta };
