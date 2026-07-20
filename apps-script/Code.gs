/**
 * Backend do Sistema de Controle de Insumos, Patrimônio e Equipamentos.
 * Cole este arquivo no editor do Google Apps Script (script.google.com),
 * ligado a uma planilha Google Sheets com as abas:
 *   Itens, Equipamentos, Veiculos, Movimentacoes, Colaboradores, Projetos, MateriaisReferencia
 * (ver docs/planilha-modelo.md para os cabeçalhos exatos de cada aba).
 *
 * Itens = patrimônio de TI (notebook, celular, mouse etc.), alocado a colaboradores.
 * Equipamentos = equipamentos de medição/laboratório, com calibração e locação a projetos.
 * Veiculos = carros da frota, alocados de forma fixa a colaboradores (mesmo padrão de Itens).
 * Movimentacoes é compartilhada pelas três, para manter um histórico único e o custo
 * por projeto consolidado.
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

var READ_ACTIONS_ = ['listItens', 'getItem', 'listEquipamentos', 'getEquipamento', 'listVeiculos', 'getVeiculo', 'listMovimentacoes', 'listColaboradores', 'listProjetos', 'custoPorProjeto', 'listMateriaisReferencia', 'avisos'];

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
    default:
      throw new Error('Ação de escrita desconhecida: ' + action);
  }
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
