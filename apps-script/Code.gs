/**
 * Backend do Sistema de Controle de Insumos, Patrimônio e Equipamentos.
 * Cole este arquivo no editor do Google Apps Script (script.google.com),
 * ligado a uma planilha Google Sheets com as abas:
 *   Itens, Equipamentos, Veiculos, Movimentacoes, Colaboradores, Projetos, MateriaisReferencia,
 *   Reservas, Usuarios
 * (ver docs/planilha-modelo.md para os cabeçalhos exatos de cada aba).
 *
 * Itens = patrimônio de TI (notebook, celular, mouse etc.), alocado a colaboradores.
 * Equipamentos = equipamentos de medição/laboratório, com calibração e locação a projetos.
 * Veiculos = carros da frota, alocados de forma fixa a colaboradores (mesmo padrão de Itens).
 * Movimentacoes é compartilhada pelas três, para manter um histórico único e o custo
 * por projeto consolidado.
 * Reservas = uso de um veículo por um período (agendamento futuro, retirada imediata, empréstimo
 * temporário de um veículo normalmente fixo, ou devolução) — independente da alocação fixa acima.
 * Usuarios = login individual dos analistas (acesso reduzido, só à reserva de veículos).
 *
 * Configuração necessária (menu Configuração do projeto > Propriedades do script):
 *   SHEET_ID     -> ID da planilha (está na URL entre /d/ e /edit)
 *   API_SECRET   -> uma senha/token longo e aleatório, só você e o servidor sabem
 *
 * Depois de colar, publique em Implantar > Nova implantação > Tipo "Aplicativo da Web":
 *   Executar como: Eu
 *   Quem tem acesso: Qualquer pessoa
 * Copie a URL gerada — ela vai para a variável de ambiente APPS_SCRIPT_URL do Netlify.
 */

function getProp_(name) {
  var v = PropertiesService.getScriptProperties().getProperty(name);
  if (!v) throw new Error('Propriedade do script não configurada: ' + name);
  return v;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getProp_('SHEET_ID'));
}

function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Aba não encontrada: ' + name);
  return sheet;
}

function checkToken_(token) {
  if (!token || token !== getProp_('API_SECRET')) {
    throw new Error('Token inválido ou ausente.');
  }
}

function sheetToObjects_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  var headers = data[0];
  return data.slice(1)
    .filter(function (row) { return row.some(function (c) { return c !== '' && c !== null; }); })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

function appendObject_(sheet, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function findRowIndexById_(sheet, idColName, id) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idColName);
  if (idCol === -1) throw new Error('Coluna não encontrada: ' + idColName);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) return i + 1;
  }
  return -1;
}

function updateRowById_(sheet, idColName, id, patch) {
  var rowIdx = findRowIndexById_(sheet, idColName, id);
  if (rowIdx === -1) throw new Error('Registro não encontrado: ' + id);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach(function (h, i) {
    if (patch[h] !== undefined) sheet.getRange(rowIdx, i + 1).setValue(patch[h]);
  });
}

function newId_(prefix) {
  return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function toNumber_(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Leitura (GET) e escrita (POST) — despacho de ações
// ---------------------------------------------------------------------------

function doGet(e) {
  try {
    var params = e.parameter;
    checkToken_(params.token);
    var result = routeRead_(params.action, params);
    return jsonOut_({ ok: true, data: result });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    checkToken_(body.token);
    var result = routeAny_(body.action, body.payload || {});
    return jsonOut_({ ok: true, data: result });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}

var READ_ACTIONS_ = ['listItens', 'getItem', 'listEquipamentos', 'getEquipamento', 'listVeiculos', 'getVeiculo', 'listMovimentacoes', 'listColaboradores', 'listProjetos', 'custoPorProjeto', 'listMateriaisReferencia', 'avisos', 'listReservas', 'getReserva', 'verificarDisponibilidade', 'responsavelNaData', 'verificarUsuario', 'listUsuarios'];

function routeAny_(action, params) {
  return READ_ACTIONS_.indexOf(action) !== -1 ? routeRead_(action, params) : routeWrite_(action, params);
}

function routeRead_(action, params) {
  switch (action) {
    case 'listItens':
      return sheetToObjects_(getSheet_('Itens'));
    case 'getItem':
      return getItem_(params.id);
    case 'listEquipamentos':
      return sheetToObjects_(getSheet_('Equipamentos'));
    case 'getEquipamento':
      return getEquipamento_(params.id);
    case 'listVeiculos':
      return sheetToObjects_(getSheet_('Veiculos'));
    case 'getVeiculo':
      return getVeiculo_(params.id);
    case 'listMovimentacoes':
      return listMovimentacoes_(params.itemId);
    case 'listColaboradores':
      return sheetToObjects_(getSheet_('Colaboradores'));
    case 'listProjetos':
      return sheetToObjects_(getSheet_('Projetos'));
    case 'custoPorProjeto':
      return custoPorProjeto_(params.projeto);
    case 'listMateriaisReferencia':
      return sheetToObjects_(getSheet_('MateriaisReferencia'));
    case 'avisos':
      return avisos_(params.dias ? Number(params.dias) : 60);
    case 'listReservas':
      return listReservas_(params.veiculoId, params.colaborador, params.status);
    case 'getReserva':
      return getReserva_(params.id);
    case 'verificarDisponibilidade':
      return verificarDisponibilidade_(params.veiculoId, params.inicio, params.fim);
    case 'responsavelNaData':
      return responsavelNaData_(params.veiculoId, params.data);
    case 'verificarUsuario':
      return verificarUsuario_(params.usuario, params.senhaHash);
    case 'listUsuarios':
      return listUsuarios_();
    default:
      throw new Error('Ação de leitura desconhecida: ' + action);
  }
}

function routeWrite_(action, payload) {
  switch (action) {
    case 'criarItem':
      return criarItem_(payload);
    case 'registrarEntrada':
      return registrarEntrada_(payload);
    case 'alocarColaborador':
      return alocarColaborador_(payload);
    case 'registrarSaidaProjeto':
      return registrarSaidaProjeto_(payload);
    case 'registrarDevolucao':
      return registrarDevolucao_(payload);
    case 'criarEquipamento':
      return criarEquipamento_(payload);
    case 'registrarLocacao':
      return registrarLocacao_(payload);
    case 'registrarDevolucaoEquipamento':
      return registrarDevolucaoEquipamento_(payload);
    case 'registrarCalibracaoEquipamento':
      return registrarCalibracaoEquipamento_(payload);
    case 'criarVeiculo':
      return criarVeiculo_(payload);
    case 'criarColaborador':
      return criarColaborador_(payload);
    case 'criarProjeto':
      return criarProjeto_(payload);
    case 'criarMaterialReferencia':
      return criarMaterialReferencia_(payload);
    case 'importarLote':
      return importarLote_(payload);
    case 'criarReserva':
      return criarReserva_(payload);
    case 'iniciarRetiradaReserva':
      return iniciarRetiradaReserva_(payload);
    case 'registrarRetornoReserva':
      return registrarRetornoReserva_(payload);
    case 'cancelarReserva':
      return cancelarReserva_(payload);
    case 'criarUsuario':
      return criarUsuario_(payload);
    case 'desativarUsuario':
      return desativarUsuario_(payload);
    default:
      throw new Error('Ação de escrita desconhecida: ' + action);
  }
}

// ---------------------------------------------------------------------------
// Importação em lote (usada pelo Assistente para cadastrar várias linhas de
// uma vez, ex: a partir de uma planilha colada no chat)
// ---------------------------------------------------------------------------

function criadorParaAba_(aba) {
  switch (aba) {
    case 'Itens': return criarItem_;
    case 'Equipamentos': return criarEquipamento_;
    case 'Veiculos': return criarVeiculo_;
    case 'Colaboradores': return criarColaborador_;
    case 'Projetos': return criarProjeto_;
    case 'MateriaisReferencia': return criarMaterialReferencia_;
    default: return null;
  }
}

function importarLote_(p) {
  var criar = p.aba ? criadorParaAba_(p.aba) : null;
  if (!criar) throw new Error('Aba não suportada para importação: ' + p.aba);
  if (!Array.isArray(p.linhas) || p.linhas.length === 0) throw new Error('Informe as linhas a importar.');
  var resultados = [];
  var sucesso = 0;
  p.linhas.forEach(function (linha, i) {
    try {
      criar(linha);
      resultados.push({ linha: i + 1, ok: true });
      sucesso++;
    } catch (err) {
      resultados.push({ linha: i + 1, ok: false, erro: err.message });
    }
  });
  return { total: p.linhas.length, sucesso: sucesso, falhas: p.linhas.length - sucesso, detalhes: resultados };
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

function getItem_(id) {
  var item = sheetToObjects_(getSheet_('Itens')).filter(function (i) { return String(i.ID) === String(id); })[0];
  if (!item) throw new Error('Item não encontrado: ' + id);
  item.historico = listMovimentacoes_(id);
  return item;
}

function criarItem_(p) {
  if (!p.ID) throw new Error('Informe o código do item (ID).');
  var sheet = getSheet_('Itens');
  if (findRowIndexById_(sheet, 'ID', p.ID) !== -1) throw new Error('Já existe um item com este código: ' + p.ID);
  appendObject_(sheet, {
    ID: p.ID,
    Categoria: p.Categoria || '',
    Descricao: p.Descricao || '',
    Marca: p.Marca || '',
    NumeroSerie: p.NumeroSerie || '',
    DataCompra: p.DataCompra || '',
    ValorPago: toNumber_(p.ValorPago),
    Fornecedor: p.Fornecedor || '',
    Status: p.Status || 'Em estoque',
    ColaboradorAtual: p.ColaboradorAtual || '',
    LocalArmazenamento: p.LocalArmazenamento || '',
    Observacoes: p.Observacoes || ''
  });
  return { ID: p.ID };
}

// ---------------------------------------------------------------------------
// Movimentações
// ---------------------------------------------------------------------------

function listMovimentacoes_(itemId) {
  var all = sheetToObjects_(getSheet_('Movimentacoes'));
  all.sort(function (a, b) { return new Date(b.DataHora) - new Date(a.DataHora); });
  if (!itemId) return all;
  return all.filter(function (m) { return String(m.ItemID) === String(itemId); });
}

function registrarMovimentacao_(m) {
  var sheet = getSheet_('Movimentacoes');
  var registro = {
    ID: newId_('MOV'),
    DataHora: new Date(),
    ItemID: m.ItemID || '',
    Tipo: m.Tipo || '',
    Quantidade: m.Quantidade !== undefined ? toNumber_(m.Quantidade) : 1,
    ValorUnitario: toNumber_(m.ValorUnitario),
    Fornecedor: m.Fornecedor || '',
    ProjetoDestino: m.ProjetoDestino || '',
    ColaboradorEnvolvido: m.ColaboradorEnvolvido || '',
    ChecadoPor: m.ChecadoPor || '',
    DataDevolucaoPrevista: m.DataDevolucaoPrevista || '',
    DataDevolucaoReal: m.DataDevolucaoReal || '',
    Observacoes: m.Observacoes || ''
  };
  appendObject_(sheet, registro);
  return registro;
}

function registrarEntrada_(p) {
  if (!p.ItemID) throw new Error('Informe o item da entrada.');
  var itens = getSheet_('Itens');
  if (findRowIndexById_(itens, 'ID', p.ItemID) === -1) throw new Error('Item não cadastrado: ' + p.ItemID);
  var mov = registrarMovimentacao_({
    ItemID: p.ItemID,
    Tipo: 'Entrada-Compra',
    Quantidade: p.Quantidade,
    ValorUnitario: p.ValorUnitario,
    Fornecedor: p.Fornecedor,
    ProjetoDestino: p.ProjetoDestino || '',
    Observacoes: p.Observacoes
  });
  updateRowById_(itens, 'ID', p.ItemID, {
    Status: 'Em estoque',
    ValorPago: toNumber_(p.ValorUnitario),
    Fornecedor: p.Fornecedor || '',
    DataCompra: p.DataCompra || new Date()
  });
  return mov;
}

function encontrarSheetDoAlvo_(id) {
  var candidatos = ['Itens', 'Veiculos'];
  for (var i = 0; i < candidatos.length; i++) {
    var sheet = getSheet_(candidatos[i]);
    if (findRowIndexById_(sheet, 'ID', id) !== -1) return sheet;
  }
  throw new Error('Item/veículo não encontrado: ' + id);
}

function alocarColaborador_(p) {
  if (!p.ItemID || !p.ColaboradorEnvolvido) throw new Error('Informe o item e o colaborador.');
  var sheet = encontrarSheetDoAlvo_(p.ItemID);
  var mov = registrarMovimentacao_({
    ItemID: p.ItemID,
    Tipo: 'Alocacao-Colaborador',
    ColaboradorEnvolvido: p.ColaboradorEnvolvido,
    ProjetoDestino: p.ProjetoDestino || '',
    ValorUnitario: p.ValorUnitario,
    Quantidade: p.Quantidade,
    Observacoes: p.Observacoes
  });
  updateRowById_(sheet, 'ID', p.ItemID, {
    Status: 'Com colaborador',
    ColaboradorAtual: p.ColaboradorEnvolvido
  });
  return mov;
}

function registrarSaidaProjeto_(p) {
  if (!p.ItemID || !p.ProjetoDestino || !p.ColaboradorEnvolvido) {
    throw new Error('Informe item, projeto e solicitante.');
  }
  var itens = getSheet_('Itens');
  var mov = registrarMovimentacao_({
    ItemID: p.ItemID,
    Tipo: 'Saida-Projeto',
    ValorUnitario: p.ValorUnitario,
    Quantidade: p.Quantidade,
    ProjetoDestino: p.ProjetoDestino,
    ColaboradorEnvolvido: p.ColaboradorEnvolvido,
    DataDevolucaoPrevista: p.DataDevolucaoPrevista || '',
    Observacoes: p.Observacoes
  });
  updateRowById_(itens, 'ID', p.ItemID, {
    Status: 'Em projeto',
    ColaboradorAtual: p.ColaboradorEnvolvido
  });
  return mov;
}

function registrarDevolucao_(p) {
  if (!p.ItemID) throw new Error('Informe o item devolvido.');
  var sheet = encontrarSheetDoAlvo_(p.ItemID);
  var mov = registrarMovimentacao_({
    ItemID: p.ItemID,
    Tipo: 'Devolucao',
    ChecadoPor: p.ChecadoPor,
    DataDevolucaoReal: p.DataDevolucaoReal || new Date(),
    Observacoes: p.Observacoes
  });
  updateRowById_(sheet, 'ID', p.ItemID, {
    Status: 'Em estoque',
    ColaboradorAtual: ''
  });
  return mov;
}

// ---------------------------------------------------------------------------
// Equipamentos (medição/laboratório): cadastro, locação a projetos, calibração
// ---------------------------------------------------------------------------

function getEquipamento_(id) {
  var equipamento = sheetToObjects_(getSheet_('Equipamentos')).filter(function (e) { return String(e.ID) === String(id); })[0];
  if (!equipamento) throw new Error('Equipamento não encontrado: ' + id);
  equipamento.historico = listMovimentacoes_(id);
  return equipamento;
}

function criarEquipamento_(p) {
  if (!p.ID) throw new Error('Informe o código do equipamento (ID).');
  var sheet = getSheet_('Equipamentos');
  if (findRowIndexById_(sheet, 'ID', p.ID) !== -1) throw new Error('Já existe um equipamento com este código: ' + p.ID);
  appendObject_(sheet, {
    ID: p.ID,
    Descricao: p.Descricao || '',
    Marca: p.Marca || '',
    NumeroSerie: p.NumeroSerie || '',
    DataCompra: p.DataCompra || '',
    ValorPago: toNumber_(p.ValorPago),
    Fornecedor: p.Fornecedor || '',
    Status: p.Status || 'Em estoque',
    ColaboradorAtual: p.ColaboradorAtual || '',
    LocalArmazenamento: p.LocalArmazenamento || '',
    UltimaCalibracao: p.UltimaCalibracao || '',
    ProximaCalibracao: p.ProximaCalibracao || '',
    NumeroCertificadoCalibracao: p.NumeroCertificadoCalibracao || '',
    Observacoes: p.Observacoes || ''
  });
  return { ID: p.ID };
}

function registrarLocacao_(p) {
  if (!p.ItemID || !p.ProjetoDestino || !p.ColaboradorEnvolvido) {
    throw new Error('Informe equipamento, projeto e solicitante.');
  }
  var equipamentos = getSheet_('Equipamentos');
  var mov = registrarMovimentacao_({
    ItemID: p.ItemID,
    Tipo: 'Locacao-Equipamento',
    ValorUnitario: p.ValorUnitario,
    Quantidade: p.Quantidade,
    ProjetoDestino: p.ProjetoDestino,
    ColaboradorEnvolvido: p.ColaboradorEnvolvido,
    DataDevolucaoPrevista: p.DataDevolucaoPrevista || '',
    Observacoes: p.Observacoes
  });
  updateRowById_(equipamentos, 'ID', p.ItemID, {
    Status: 'Em locação',
    ColaboradorAtual: p.ColaboradorEnvolvido
  });
  return mov;
}

function registrarDevolucaoEquipamento_(p) {
  if (!p.ItemID) throw new Error('Informe o equipamento devolvido.');
  var equipamentos = getSheet_('Equipamentos');
  var mov = registrarMovimentacao_({
    ItemID: p.ItemID,
    Tipo: 'Devolucao-Equipamento',
    ChecadoPor: p.ChecadoPor,
    DataDevolucaoReal: p.DataDevolucaoReal || new Date(),
    Observacoes: p.Observacoes
  });
  updateRowById_(equipamentos, 'ID', p.ItemID, {
    Status: 'Em estoque',
    ColaboradorAtual: ''
  });
  return mov;
}

function registrarCalibracaoEquipamento_(p) {
  if (!p.ItemID || !p.ProximaCalibracao) throw new Error('Informe o equipamento e a próxima calibração.');
  var equipamentos = getSheet_('Equipamentos');
  var mov = registrarMovimentacao_({
    ItemID: p.ItemID,
    Tipo: 'Calibracao',
    Observacoes: p.Observacoes
  });
  updateRowById_(equipamentos, 'ID', p.ItemID, {
    UltimaCalibracao: p.UltimaCalibracao || new Date(),
    ProximaCalibracao: p.ProximaCalibracao,
    NumeroCertificadoCalibracao: p.NumeroCertificadoCalibracao || ''
  });
  return mov;
}

// ---------------------------------------------------------------------------
// Veículos: cadastro e alocação fixa a colaborador (reaproveita alocarColaborador_/registrarDevolucao_)
// ---------------------------------------------------------------------------

function getVeiculo_(id) {
  var veiculo = sheetToObjects_(getSheet_('Veiculos')).filter(function (v) { return String(v.ID) === String(id); })[0];
  if (!veiculo) throw new Error('Veículo não encontrado: ' + id);
  veiculo.historico = listMovimentacoes_(id);
  return veiculo;
}

function criarVeiculo_(p) {
  if (!p.ID) throw new Error('Informe o código do veículo (ID).');
  var sheet = getSheet_('Veiculos');
  if (findRowIndexById_(sheet, 'ID', p.ID) !== -1) throw new Error('Já existe um veículo com este código: ' + p.ID);
  appendObject_(sheet, {
    ID: p.ID,
    Placa: p.Placa || '',
    Descricao: p.Descricao || '',
    Marca: p.Marca || '',
    Ano: p.Ano || '',
    Quilometragem: toNumber_(p.Quilometragem),
    DataCompra: p.DataCompra || '',
    ValorPago: toNumber_(p.ValorPago),
    Fornecedor: p.Fornecedor || '',
    Status: p.Status || 'Em estoque',
    ColaboradorAtual: p.ColaboradorAtual || '',
    LocalArmazenamento: p.LocalArmazenamento || '',
    Observacoes: p.Observacoes || ''
  });
  return { ID: p.ID };
}

// ---------------------------------------------------------------------------
// Reservas: uso/reserva de veículos por período (agendamento, retirada,
// empréstimo temporário de um veículo normalmente fixo, e devolução).
// Independente da alocação fixa acima — um veículo pode ter ColaboradorAtual
// fixo e ainda assim ter Reservas pontuais registradas em cima dele.
// ---------------------------------------------------------------------------

function listReservas_(veiculoId, colaborador, status) {
  var all = sheetToObjects_(getSheet_('Reservas'));
  all.sort(function (a, b) { return new Date(b.DataHoraSaida) - new Date(a.DataHoraSaida); });
  return all.filter(function (r) {
    if (veiculoId && String(r.VeiculoID) !== String(veiculoId)) return false;
    if (colaborador && r.Colaborador !== colaborador) return false;
    if (status && r.Status !== status) return false;
    return true;
  });
}

function getReserva_(id) {
  var reserva = sheetToObjects_(getSheet_('Reservas')).filter(function (r) { return String(r.ID) === String(id); })[0];
  if (!reserva) throw new Error('Reserva não encontrada: ' + id);
  return reserva;
}

function reservasAtivas_(veiculoId) {
  return sheetToObjects_(getSheet_('Reservas')).filter(function (r) {
    return String(r.VeiculoID) === String(veiculoId) && (r.Status === 'Agendado' || r.Status === 'Em andamento');
  });
}

function fimDaReserva_(r) {
  return new Date(r.DataHoraRetorno || r.PrevisaoRetorno || r.DataHoraSaida);
}

function intervalosSobrepoem_(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && inicioB < fimA;
}

function verificarDisponibilidade_(veiculoId, inicio, fim) {
  if (!veiculoId || !inicio) throw new Error('Informe o veículo e a data/hora de início.');
  var inicioData = new Date(inicio);
  var fimData = fim ? new Date(fim) : new Date(inicioData.getTime() + 60 * 60 * 1000);
  var conflitos = reservasAtivas_(veiculoId).filter(function (r) {
    return intervalosSobrepoem_(inicioData, fimData, new Date(r.DataHoraSaida), fimDaReserva_(r));
  });
  return { disponivel: conflitos.length === 0, conflitos: conflitos };
}

function responsavelNaData_(veiculoId, data) {
  if (!veiculoId || !data) throw new Error('Informe o veículo e a data.');
  var alvo = new Date(data);
  var reservas = sheetToObjects_(getSheet_('Reservas')).filter(function (r) {
    if (String(r.VeiculoID) !== String(veiculoId) || r.Status === 'Cancelado') return false;
    return new Date(r.DataHoraSaida) <= alvo && alvo <= fimDaReserva_(r);
  });
  if (reservas.length > 0) {
    return { veiculoId: veiculoId, data: data, colaborador: reservas[0].Colaborador, origem: 'reserva', reservaId: reservas[0].ID };
  }
  var veiculo = getVeiculo_(veiculoId);
  return { veiculoId: veiculoId, data: data, colaborador: veiculo.ColaboradorAtual || '', origem: 'padrao' };
}

function criarReserva_(p) {
  if (!p.VeiculoID || !p.Colaborador || !p.DataHoraSaida) {
    throw new Error('Informe o veículo, o colaborador e a data/hora de saída.');
  }
  if (findRowIndexById_(getSheet_('Veiculos'), 'ID', p.VeiculoID) === -1) {
    throw new Error('Veículo não cadastrado: ' + p.VeiculoID);
  }
  var disponibilidade = verificarDisponibilidade_(p.VeiculoID, p.DataHoraSaida, p.PrevisaoRetorno);
  if (!disponibilidade.disponivel) throw new Error('Veículo já reservado nesse período.');

  var status = new Date(p.DataHoraSaida) <= new Date() ? 'Em andamento' : 'Agendado';
  var registro = {
    ID: newId_('RES'),
    VeiculoID: p.VeiculoID,
    Colaborador: p.Colaborador,
    Projeto: p.Projeto || '',
    Destino: p.Destino || '',
    DataHoraSaida: p.DataHoraSaida,
    PrevisaoRetorno: p.PrevisaoRetorno || '',
    DataHoraRetorno: '',
    HodometroSaida: toNumber_(p.HodometroSaida),
    HodometroChegada: '',
    CombustivelLitros: '',
    CombustivelCusto: '',
    Status: status,
    Observacoes: p.Observacoes || ''
  };
  appendObject_(getSheet_('Reservas'), registro);
  return registro;
}

function iniciarRetiradaReserva_(p) {
  if (!p.ID) throw new Error('Informe a reserva.');
  var reserva = getReserva_(p.ID);
  if (reserva.Status !== 'Agendado') throw new Error('Esta reserva não está aguardando retirada.');
  var patch = { Status: 'Em andamento' };
  if (p.HodometroSaida !== undefined && p.HodometroSaida !== '') patch.HodometroSaida = toNumber_(p.HodometroSaida);
  if (p.DataHoraSaida) patch.DataHoraSaida = p.DataHoraSaida;
  updateRowById_(getSheet_('Reservas'), 'ID', p.ID, patch);
  return getReserva_(p.ID);
}

function registrarRetornoReserva_(p) {
  if (!p.ID) throw new Error('Informe a reserva.');
  var reserva = getReserva_(p.ID);
  if (reserva.Status !== 'Em andamento' && reserva.Status !== 'Agendado') {
    throw new Error('Esta reserva já foi concluída ou cancelada.');
  }
  var patch = {
    DataHoraRetorno: p.DataHoraRetorno || new Date(),
    HodometroChegada: toNumber_(p.HodometroChegada),
    CombustivelLitros: p.CombustivelLitros !== undefined && p.CombustivelLitros !== '' ? toNumber_(p.CombustivelLitros) : '',
    CombustivelCusto: p.CombustivelCusto !== undefined && p.CombustivelCusto !== '' ? toNumber_(p.CombustivelCusto) : '',
    Status: 'Concluído'
  };
  if (p.Observacoes) patch.Observacoes = (reserva.Observacoes ? reserva.Observacoes + ' | ' : '') + p.Observacoes;
  updateRowById_(getSheet_('Reservas'), 'ID', p.ID, patch);

  if (p.HodometroChegada) {
    updateRowById_(getSheet_('Veiculos'), 'ID', reserva.VeiculoID, { Quilometragem: toNumber_(p.HodometroChegada) });
  }
  return getReserva_(p.ID);
}

function cancelarReserva_(p) {
  if (!p.ID) throw new Error('Informe a reserva.');
  var reserva = getReserva_(p.ID);
  if (reserva.Status === 'Concluído') throw new Error('Esta reserva já foi concluída, não pode ser cancelada.');
  updateRowById_(getSheet_('Reservas'), 'ID', p.ID, {
    Status: 'Cancelado',
    Observacoes: (reserva.Observacoes ? reserva.Observacoes + ' | ' : '') + (p.Observacoes || 'Cancelada.')
  });
  return getReserva_(p.ID);
}

// ---------------------------------------------------------------------------
// Usuarios: login individual dos analistas (acesso reduzido, só reserva de
// veículos). Administrador continua com a senha única ADMIN_PASSWORD, fora
// desta aba. A senha em texto puro nunca chega até aqui — o hash é calculado
// na Netlify Function antes de chamar estas ações (ver netlify/functions/_auth.js).
// ---------------------------------------------------------------------------

function listUsuarios_() {
  return sheetToObjects_(getSheet_('Usuarios')).map(function (u) {
    return { Nome: u.Nome, Usuario: u.Usuario, Papel: u.Papel, Status: u.Status };
  });
}

function verificarUsuario_(usuario, senhaHash) {
  if (!usuario || !senhaHash) return { ok: false };
  var linha = sheetToObjects_(getSheet_('Usuarios')).filter(function (u) {
    return String(u.Usuario).toLowerCase() === String(usuario).toLowerCase() && u.Status !== 'Inativo';
  })[0];
  if (!linha || String(linha.SenhaHash) !== String(senhaHash)) return { ok: false };
  return { ok: true, nome: linha.Nome, papel: 'analista' };
}

function criarUsuario_(p) {
  if (!p.Nome || !p.Usuario || !p.SenhaHash) throw new Error('Informe nome, usuário e senha.');
  var sheet = getSheet_('Usuarios');
  var jaExiste = sheetToObjects_(sheet).some(function (u) { return String(u.Usuario).toLowerCase() === String(p.Usuario).toLowerCase(); });
  if (jaExiste) throw new Error('Já existe um usuário com este nome de usuário: ' + p.Usuario);
  appendObject_(sheet, { Nome: p.Nome, Usuario: p.Usuario, SenhaHash: p.SenhaHash, Papel: 'analista', Status: 'Ativo' });
  return { Usuario: p.Usuario };
}

function desativarUsuario_(p) {
  if (!p.Usuario) throw new Error('Informe o usuário.');
  var sheet = getSheet_('Usuarios');
  if (findRowIndexById_(sheet, 'Usuario', p.Usuario) === -1) throw new Error('Usuário não encontrado: ' + p.Usuario);
  updateRowById_(sheet, 'Usuario', p.Usuario, { Status: 'Inativo' });
  return { Usuario: p.Usuario };
}

// ---------------------------------------------------------------------------
// Colaboradores / Projetos / Materiais de Referência
// ---------------------------------------------------------------------------

function criarColaborador_(p) {
  if (!p.Nome) throw new Error('Informe o nome do colaborador.');
  appendObject_(getSheet_('Colaboradores'), {
    Nome: p.Nome,
    Cargo: p.Cargo || '',
    Email: p.Email || '',
    Status: p.Status || 'Ativo'
  });
  return { Nome: p.Nome };
}

function criarProjeto_(p) {
  if (!p.Codigo) throw new Error('Informe o código/nome do projeto.');
  appendObject_(getSheet_('Projetos'), {
    Codigo: p.Codigo,
    Cliente: p.Cliente || '',
    Status: p.Status || 'Ativo'
  });
  return { Codigo: p.Codigo };
}

function criarMaterialReferencia_(p) {
  if (!p.Identificacao) throw new Error('Informe a identificação do material.');
  var sheet = getSheet_('MateriaisReferencia');
  var id = p.ID || newId_('MR');
  appendObject_(sheet, {
    ID: id,
    Identificacao: p.Identificacao,
    Certificador: p.Certificador || '',
    NumeroCertificado: p.NumeroCertificado || '',
    Lote: p.Lote || '',
    IncertezaMedicao: p.IncertezaMedicao || '',
    Validade: p.Validade || '',
    Status: p.Status || 'Em uso',
    Observacoes: p.Observacoes || ''
  });
  return { ID: id };
}

// ---------------------------------------------------------------------------
// Agregações: custo por projeto e avisos de vencimento
// ---------------------------------------------------------------------------

function custoPorProjeto_(projeto) {
  var movs = sheetToObjects_(getSheet_('Movimentacoes')).filter(function (m) { return m.ProjetoDestino; });
  var totals = {};
  movs.forEach(function (m) {
    var custo = toNumber_(m.ValorUnitario) * (m.Quantidade ? toNumber_(m.Quantidade) : 1);
    totals[m.ProjetoDestino] = (totals[m.ProjetoDestino] || 0) + custo;
  });
  if (projeto) return { projeto: projeto, custo: totals[projeto] || 0 };
  return Object.keys(totals).map(function (k) { return { projeto: k, custo: totals[k] }; });
}

function diasAte_(dataStr) {
  if (!dataStr) return null;
  var data = new Date(dataStr);
  if (isNaN(data.getTime())) return null;
  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  return Math.round((data - hoje) / (1000 * 60 * 60 * 24));
}

function avisos_(diasAntecedencia) {
  var calibracoes = sheetToObjects_(getSheet_('Equipamentos'))
    .filter(function (e) { return e.ProximaCalibracao; })
    .map(function (e) {
      return { tipo: 'Calibração', id: e.ID, descricao: e.Descricao, data: e.ProximaCalibracao, diasRestantes: diasAte_(e.ProximaCalibracao) };
    })
    .filter(function (a) { return a.diasRestantes !== null && a.diasRestantes <= diasAntecedencia; });

  var validades = sheetToObjects_(getSheet_('MateriaisReferencia'))
    .filter(function (m) { return m.Validade && m.Status !== 'Descartado'; })
    .map(function (m) {
      return { tipo: 'Validade material de referência', id: m.ID, descricao: m.Identificacao, data: m.Validade, diasRestantes: diasAte_(m.Validade) };
    })
    .filter(function (a) { return a.diasRestantes !== null && a.diasRestantes <= diasAntecedencia; });

  return calibracoes.concat(validades).sort(function (a, b) { return a.diasRestantes - b.diasRestantes; });
}
