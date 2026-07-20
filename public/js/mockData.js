// Dados de exemplo usados apenas quando o site está em modo de demonstração
// (sem o Apps Script configurado ainda). Tudo aqui vive só no navegador
// (localStorage) e nunca é enviado para lugar nenhum.

const CHAVE = 'cip_mock_db';

function semanasA(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function seed() {
  return {
    itens: [
      { ID: 'NB-001', Categoria: 'Notebook', Descricao: 'Lenovo IdeaPad S145', Marca: 'Lenovo', NumeroSerie: 'SN-0001', DataCompra: '2023-02-10', ValorPago: 3200, Fornecedor: 'Fornecedor Exemplo', Status: 'Com colaborador', ColaboradorAtual: 'Colaborador Exemplo', LocalArmazenamento: '', Observacoes: '' },
      { ID: 'CEL-001', Categoria: 'Celular', Descricao: 'Motorola G9', Marca: 'Motorola', NumeroSerie: 'SN-0002', DataCompra: '2023-02-10', ValorPago: 900, Fornecedor: 'Fornecedor Exemplo', Status: 'Em estoque', ColaboradorAtual: '', LocalArmazenamento: 'Armário TI', Observacoes: '' }
    ],
    equipamentos: [
      { ID: 'MP-01', Descricao: 'Medidor Multiparâmetro HI 98194', Marca: 'Hanna', NumeroSerie: '5090070101', DataCompra: '2022-05-01', ValorPago: 8500, Fornecedor: 'Fornecedor Exemplo', Status: 'Em estoque', ColaboradorAtual: '', LocalArmazenamento: 'Sala da Logística', UltimaCalibracao: '2025-08-01', ProximaCalibracao: semanasA(20), NumeroCertificadoCalibracao: 'CERT-1234', Observacoes: '' }
    ],
    veiculos: [
      { ID: 'CARRO-01', Placa: 'ABC1D23', Descricao: 'Fiat Strada', Marca: 'Fiat', Ano: '2022', Quilometragem: 32000, DataCompra: '2022-03-01', ValorPago: 95000, Fornecedor: 'Concessionária Exemplo', Status: 'Com colaborador', ColaboradorAtual: 'Fernando Luna', LocalArmazenamento: '', Observacoes: '' }
    ],
    movimentacoes: [
      { ID: 'MOV-EX0001', DataHora: '2023-02-10T10:00:00', ItemID: 'NB-001', Tipo: 'Entrada-Compra', Quantidade: 1, ValorUnitario: 3200, Fornecedor: 'Fornecedor Exemplo', ProjetoDestino: '', ColaboradorEnvolvido: '', ChecadoPor: '', DataDevolucaoPrevista: '', DataDevolucaoReal: '', Observacoes: 'Registro de exemplo' },
      { ID: 'MOV-EX0002', DataHora: '2023-02-11T09:00:00', ItemID: 'NB-001', Tipo: 'Alocacao-Colaborador', Quantidade: 1, ValorUnitario: 0, Fornecedor: '', ProjetoDestino: '', ColaboradorEnvolvido: 'Colaborador Exemplo', ChecadoPor: '', DataDevolucaoPrevista: '', DataDevolucaoReal: '', Observacoes: '' }
    ],
    colaboradores: [
      { Nome: 'Colaborador Exemplo', Cargo: 'Analista', Email: '', Status: 'Ativo' },
      { Nome: 'Fernando Luna', Cargo: 'Técnico de campo', Email: '', Status: 'Ativo' },
      { Nome: 'Samantha Stocco', Cargo: 'Analista', Email: '', Status: 'Ativo' }
    ],
    projetos: [
      { Codigo: 'P0001-EXEMPLO', Cliente: 'Cliente Exemplo', Status: 'Ativo' }
    ],
    materiaisReferencia: [
      { ID: 'MR-EX01', Identificacao: 'MR-Solução Tampão de pH 7,01', Certificador: 'Elus', NumeroCertificado: 'MR-053/250225-ELPHS7-1673', Lote: '1673', IncertezaMedicao: 'pH (7,01 ± 0,03) @ 25°C', Validade: semanasA(40), Status: 'Em uso', Observacoes: '' }
    ]
  };
}

function carregar() {
  const bruto = localStorage.getItem(CHAVE);
  if (!bruto) {
    const inicial = seed();
    localStorage.setItem(CHAVE, JSON.stringify(inicial));
    return inicial;
  }
  const db = JSON.parse(bruto);
  if (!db.equipamentos) db.equipamentos = [];
  if (!db.veiculos) db.veiculos = [];
  return db;
}

function salvar(db) {
  localStorage.setItem(CHAVE, JSON.stringify(db));
}

export function resetarDadosDemo() {
  localStorage.removeItem(CHAVE);
}

function novoId(prefixo) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function diasAte(dataStr) {
  if (!dataStr) return null;
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  return Math.round((data - hoje) / (1000 * 60 * 60 * 24));
}

function registrarMovimentacao(db, m) {
  const registro = {
    ID: novoId('MOV'),
    DataHora: new Date().toISOString(),
    ItemID: m.ItemID || '',
    Tipo: m.Tipo || '',
    Quantidade: m.Quantidade !== undefined ? Number(m.Quantidade) || 1 : 1,
    ValorUnitario: Number(m.ValorUnitario) || 0,
    Fornecedor: m.Fornecedor || '',
    ProjetoDestino: m.ProjetoDestino || '',
    ColaboradorEnvolvido: m.ColaboradorEnvolvido || '',
    ChecadoPor: m.ChecadoPor || '',
    DataDevolucaoPrevista: m.DataDevolucaoPrevista || '',
    DataDevolucaoReal: m.DataDevolucaoReal || '',
    Observacoes: m.Observacoes || ''
  };
  db.movimentacoes.unshift(registro);
  return registro;
}

function acharItem(db, id) {
  const item = db.itens.find((i) => String(i.ID) === String(id));
  if (!item) throw new Error('Item não encontrado: ' + id);
  return item;
}

function acharEquipamento(db, id) {
  const equipamento = db.equipamentos.find((e) => String(e.ID) === String(id));
  if (!equipamento) throw new Error('Equipamento não encontrado: ' + id);
  return equipamento;
}

function acharVeiculo(db, id) {
  const veiculo = db.veiculos.find((v) => String(v.ID) === String(id));
  if (!veiculo) throw new Error('Veículo não encontrado: ' + id);
  return veiculo;
}

function acharAlvo(db, id) {
  const item = db.itens.find((i) => String(i.ID) === String(id));
  if (item) return item;
  const veiculo = db.veiculos.find((v) => String(v.ID) === String(id));
  if (veiculo) return veiculo;
  throw new Error('Item/veículo não encontrado: ' + id);
}

export function mockCall(action, payload = {}) {
  const db = carregar();
  let resultado;

  switch (action) {
    case 'listItens':
      resultado = db.itens;
      break;
    case 'getItem': {
      const item = acharItem(db, payload.id);
      resultado = { ...item, historico: db.movimentacoes.filter((m) => String(m.ItemID) === String(payload.id)) };
      break;
    }
    case 'listEquipamentos':
      resultado = db.equipamentos;
      break;
    case 'getEquipamento': {
      const equipamento = acharEquipamento(db, payload.id);
      resultado = { ...equipamento, historico: db.movimentacoes.filter((m) => String(m.ItemID) === String(payload.id)) };
      break;
    }
    case 'listVeiculos':
      resultado = db.veiculos;
      break;
    case 'getVeiculo': {
      const veiculo = acharVeiculo(db, payload.id);
      resultado = { ...veiculo, historico: db.movimentacoes.filter((m) => String(m.ItemID) === String(payload.id)) };
      break;
    }
    case 'listMovimentacoes':
      resultado = payload.itemId ? db.movimentacoes.filter((m) => String(m.ItemID) === String(payload.itemId)) : db.movimentacoes;
      break;
    case 'listColaboradores':
      resultado = db.colaboradores;
      break;
    case 'listProjetos':
      resultado = db.projetos;
      break;
    case 'listMateriaisReferencia':
      resultado = db.materiaisReferencia;
      break;
    case 'custoPorProjeto': {
      const totais = {};
      db.movimentacoes.filter((m) => m.ProjetoDestino).forEach((m) => {
        totais[m.ProjetoDestino] = (totais[m.ProjetoDestino] || 0) + (Number(m.ValorUnitario) || 0) * (Number(m.Quantidade) || 1);
      });
      resultado = payload.projeto
        ? { projeto: payload.projeto, custo: totais[payload.projeto] || 0 }
        : Object.keys(totais).map((k) => ({ projeto: k, custo: totais[k] }));
      break;
    }
    case 'avisos': {
      const dias = payload.dias || 60;
      const calibracoes = db.equipamentos
        .filter((e) => e.ProximaCalibracao)
        .map((e) => ({ tipo: 'Calibração', id: e.ID, descricao: e.Descricao, data: e.ProximaCalibracao, diasRestantes: diasAte(e.ProximaCalibracao) }))
        .filter((a) => a.diasRestantes !== null && a.diasRestantes <= dias);
      const validades = db.materiaisReferencia
        .filter((m) => m.Validade && m.Status !== 'Descartado')
        .map((m) => ({ tipo: 'Validade material de referência', id: m.ID, descricao: m.Identificacao, data: m.Validade, diasRestantes: diasAte(m.Validade) }))
        .filter((a) => a.diasRestantes !== null && a.diasRestantes <= dias);
      resultado = calibracoes.concat(validades).sort((a, b) => a.diasRestantes - b.diasRestantes);
      break;
    }
    case 'criarItem': {
      if (!payload.ID) throw new Error('Informe o código do item (ID).');
      if (db.itens.some((i) => i.ID === payload.ID)) throw new Error('Já existe um item com este código: ' + payload.ID);
      const item = {
        ID: payload.ID, Categoria: payload.Categoria || '', Descricao: payload.Descricao || '', Marca: payload.Marca || '',
        NumeroSerie: payload.NumeroSerie || '', DataCompra: payload.DataCompra || '', ValorPago: Number(payload.ValorPago) || 0,
        Fornecedor: payload.Fornecedor || '', Status: payload.Status || 'Em estoque', ColaboradorAtual: payload.ColaboradorAtual || '',
        LocalArmazenamento: payload.LocalArmazenamento || '', Observacoes: payload.Observacoes || ''
      };
      db.itens.push(item);
      resultado = { ID: item.ID };
      break;
    }
    case 'registrarEntrada': {
      const item = acharItem(db, payload.ItemID);
      resultado = registrarMovimentacao(db, { ...payload, Tipo: 'Entrada-Compra' });
      item.Status = 'Em estoque';
      item.ValorPago = Number(payload.ValorUnitario) || 0;
      item.Fornecedor = payload.Fornecedor || '';
      item.DataCompra = payload.DataCompra || new Date().toISOString().slice(0, 10);
      break;
    }
    case 'alocarColaborador': {
      const alvo = acharAlvo(db, payload.ItemID);
      resultado = registrarMovimentacao(db, { ...payload, Tipo: 'Alocacao-Colaborador' });
      alvo.Status = 'Com colaborador';
      alvo.ColaboradorAtual = payload.ColaboradorEnvolvido;
      break;
    }
    case 'registrarSaidaProjeto': {
      const item = acharItem(db, payload.ItemID);
      resultado = registrarMovimentacao(db, { ...payload, Tipo: 'Saida-Projeto' });
      item.Status = 'Em projeto';
      item.ColaboradorAtual = payload.ColaboradorEnvolvido;
      break;
    }
    case 'registrarDevolucao': {
      const alvo = acharAlvo(db, payload.ItemID);
      resultado = registrarMovimentacao(db, { ...payload, Tipo: 'Devolucao', DataDevolucaoReal: payload.DataDevolucaoReal || new Date().toISOString().slice(0, 10) });
      alvo.Status = 'Em estoque';
      alvo.ColaboradorAtual = '';
      break;
    }
    case 'criarEquipamento': {
      if (!payload.ID) throw new Error('Informe o código do equipamento (ID).');
      if (db.equipamentos.some((e) => e.ID === payload.ID)) throw new Error('Já existe um equipamento com este código: ' + payload.ID);
      const equipamento = {
        ID: payload.ID, Descricao: payload.Descricao || '', Marca: payload.Marca || '',
        NumeroSerie: payload.NumeroSerie || '', DataCompra: payload.DataCompra || '', ValorPago: Number(payload.ValorPago) || 0,
        Fornecedor: payload.Fornecedor || '', Status: payload.Status || 'Em estoque', ColaboradorAtual: payload.ColaboradorAtual || '',
        LocalArmazenamento: payload.LocalArmazenamento || '', UltimaCalibracao: payload.UltimaCalibracao || '',
        ProximaCalibracao: payload.ProximaCalibracao || '', NumeroCertificadoCalibracao: payload.NumeroCertificadoCalibracao || '',
        Observacoes: payload.Observacoes || ''
      };
      db.equipamentos.push(equipamento);
      resultado = { ID: equipamento.ID };
      break;
    }
    case 'registrarLocacao': {
      const equipamento = acharEquipamento(db, payload.ItemID);
      resultado = registrarMovimentacao(db, { ...payload, Tipo: 'Locacao-Equipamento' });
      equipamento.Status = 'Em locação';
      equipamento.ColaboradorAtual = payload.ColaboradorEnvolvido;
      break;
    }
    case 'registrarDevolucaoEquipamento': {
      const equipamento = acharEquipamento(db, payload.ItemID);
      resultado = registrarMovimentacao(db, { ...payload, Tipo: 'Devolucao-Equipamento', DataDevolucaoReal: payload.DataDevolucaoReal || new Date().toISOString().slice(0, 10) });
      equipamento.Status = 'Em estoque';
      equipamento.ColaboradorAtual = '';
      break;
    }
    case 'registrarCalibracaoEquipamento': {
      const equipamento = acharEquipamento(db, payload.ItemID);
      resultado = registrarMovimentacao(db, { ...payload, Tipo: 'Calibracao' });
      equipamento.UltimaCalibracao = payload.UltimaCalibracao || new Date().toISOString().slice(0, 10);
      equipamento.ProximaCalibracao = payload.ProximaCalibracao;
      equipamento.NumeroCertificadoCalibracao = payload.NumeroCertificadoCalibracao || '';
      break;
    }
    case 'criarVeiculo': {
      if (!payload.ID) throw new Error('Informe o código do veículo (ID).');
      if (db.veiculos.some((v) => v.ID === payload.ID)) throw new Error('Já existe um veículo com este código: ' + payload.ID);
      const veiculo = {
        ID: payload.ID, Placa: payload.Placa || '', Descricao: payload.Descricao || '', Marca: payload.Marca || '',
        Ano: payload.Ano || '', Quilometragem: Number(payload.Quilometragem) || 0, DataCompra: payload.DataCompra || '',
        ValorPago: Number(payload.ValorPago) || 0, Fornecedor: payload.Fornecedor || '', Status: payload.Status || 'Em estoque',
        ColaboradorAtual: payload.ColaboradorAtual || '', LocalArmazenamento: payload.LocalArmazenamento || '', Observacoes: payload.Observacoes || ''
      };
      db.veiculos.push(veiculo);
      resultado = { ID: veiculo.ID };
      break;
    }
    case 'criarColaborador':
      if (!payload.Nome) throw new Error('Informe o nome do colaborador.');
      db.colaboradores.push({ Nome: payload.Nome, Cargo: payload.Cargo || '', Email: payload.Email || '', Status: payload.Status || 'Ativo' });
      resultado = { Nome: payload.Nome };
      break;
    case 'criarProjeto':
      if (!payload.Codigo) throw new Error('Informe o código/nome do projeto.');
      db.projetos.push({ Codigo: payload.Codigo, Cliente: payload.Cliente || '', Status: payload.Status || 'Ativo' });
      resultado = { Codigo: payload.Codigo };
      break;
    case 'criarMaterialReferencia': {
      if (!payload.Identificacao) throw new Error('Informe a identificação do material.');
      const id = payload.ID || novoId('MR');
      db.materiaisReferencia.push({
        ID: id, Identificacao: payload.Identificacao, Certificador: payload.Certificador || '', NumeroCertificado: payload.NumeroCertificado || '',
        Lote: payload.Lote || '', IncertezaMedicao: payload.IncertezaMedicao || '', Validade: payload.Validade || '',
        Status: payload.Status || 'Em uso', Observacoes: payload.Observacoes || ''
      });
      resultado = { ID: id };
      break;
    }
    default:
      throw new Error('Ação desconhecida (mock): ' + action);
  }

  salvar(db);
  return resultado;
}
