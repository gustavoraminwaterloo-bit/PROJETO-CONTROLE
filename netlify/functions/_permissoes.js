// Ações que o papel "analista" pode chamar — acesso reduzido, só à reserva de
// veículos e ao que ela precisa consultar. Compartilhado entre api.js (chamadas
// diretas do site) e assistente.js (chamadas feitas pela IA em nome da sessão),
// pra não ter duas listas que podem ficar desalinhadas.

const ACOES_ANALISTA = [
  'listVeiculos', 'getVeiculo',
  'listReservas', 'getReserva', 'verificarDisponibilidade', 'responsavelNaData',
  'criarReserva', 'iniciarRetiradaReserva', 'registrarRetornoReserva', 'cancelarReserva',
  'listColaboradores', 'listProjetos', 'avisos'
];

function acaoPermitidaParaPapel(acao, papel) {
  return papel !== 'analista' || ACOES_ANALISTA.indexOf(acao) !== -1;
}

module.exports = { ACOES_ANALISTA, acaoPermitidaParaPapel };
