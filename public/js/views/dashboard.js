import { api } from '../api.js';
import { formatarMoeda, formatarData, formatarDataHora, escapeHtml, diaISO, classeBadgeStatus, linkDoAviso } from '../util.js';
import { icons } from '../icons.js';

function statCard({ icone, classeIcone, valor, rotulo, tendencia }) {
  return `
    <div class="stat-card">
      <div class="topo">
        <div class="icone ${classeIcone}">${icone}</div>
      </div>
      <div class="valor">${valor}</div>
      <div class="rotulo">${rotulo}</div>
      ${tendencia ? `<div class="tendencia ${tendencia.classe}">${tendencia.icone || ''} ${tendencia.texto}</div>` : ''}
    </div>
  `;
}

function tendenciaDeContagem(hoje, ontem) {
  if (ontem === 0 && hoje === 0) return { classe: 'neutra', texto: 'sem alterações vs. ontem' };
  const diff = hoje - ontem;
  if (diff === 0) return { classe: 'neutra', texto: 'igual a ontem' };
  const classe = diff > 0 ? 'positiva' : 'negativa';
  const icone = diff > 0 ? icons.tendenciaCima : icons.tendenciaBaixo;
  return { classe, icone, texto: `${diff > 0 ? '+' : ''}${diff} vs. ontem` };
}

function ultimosNDias(n) {
  const dias = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(diaISO(d));
  }
  return dias;
}

function graficoMovimentacoes(movimentacoes) {
  const dias = ultimosNDias(7);
  const porDia = dias.map((dia) => {
    const doDia = movimentacoes.filter((m) => diaISO(m.DataHora) === dia);
    return {
      dia,
      entradas: doDia.filter((m) => m.Tipo === 'Entrada-Compra').length,
      saidas: doDia.filter((m) => m.Tipo === 'Saida-Projeto' || m.Tipo === 'Alocacao-Colaborador' || m.Tipo === 'Locacao-Equipamento').length
    };
  });

  const maxValor = Math.max(1, ...porDia.map((d) => Math.max(d.entradas, d.saidas)));
  const largura = 640;
  const altura = 200;
  const margemEsq = 30;
  const margemInf = 26;
  const areaW = largura - margemEsq - 10;
  const areaH = altura - margemInf - 10;
  const grupoW = areaW / porDia.length;
  const barraW = Math.min(18, grupoW / 3.2);

  const linhasGrade = [0, 0.5, 1].map((f) => {
    const y = 10 + areaH * (1 - f);
    return `<line class="linha-grade" x1="${margemEsq}" y1="${y}" x2="${largura - 10}" y2="${y}" /><text x="4" y="${y + 3}">${Math.round(maxValor * f)}</text>`;
  }).join('');

  const barras = porDia.map((d, i) => {
    const cx = margemEsq + grupoW * i + grupoW / 2;
    const hEntrada = (d.entradas / maxValor) * areaH;
    const hSaida = (d.saidas / maxValor) * areaH;
    const yBase = 10 + areaH;
    const label = new Date(d.dia + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `
      <rect class="barra" data-tip="${label} · Entradas: ${d.entradas}" x="${cx - barraW - 2}" y="${yBase - hEntrada}" width="${barraW}" height="${Math.max(hEntrada, 1)}" rx="3" fill="var(--series-entrada)" />
      <rect class="barra" data-tip="${label} · Saídas: ${d.saidas}" x="${cx + 2}" y="${yBase - hSaida}" width="${barraW}" height="${Math.max(hSaida, 1)}" rx="3" fill="var(--series-saida)" />
      <text x="${cx}" y="${altura - 6}" text-anchor="middle">${label}</text>
    `;
  }).join('');

  return `
    <div class="grafico-legenda">
      <span class="item"><span class="pastilha" style="background:var(--series-entrada)"></span>Entradas</span>
      <span class="item"><span class="pastilha" style="background:var(--series-saida)"></span>Saídas / alocações</span>
    </div>
    <div style="position:relative">
      <svg class="grafico-svg" viewBox="0 0 ${largura} ${altura}" style="width:100%; height:auto">
        ${linhasGrade}
        ${barras}
      </svg>
    </div>
  `;
}

function ligarTooltipsGrafico(main) {
  const svg = main.querySelector('.grafico-svg');
  if (!svg) return;
  let tip;
  svg.querySelectorAll('.barra').forEach((barra) => {
    barra.addEventListener('mouseenter', (e) => {
      tip = document.createElement('div');
      tip.className = 'grafico-tooltip';
      tip.textContent = barra.getAttribute('data-tip');
      document.body.appendChild(tip);
      moverTooltip(e);
    });
    barra.addEventListener('mousemove', moverTooltip);
    barra.addEventListener('mouseleave', () => { tip?.remove(); });
  });
  function moverTooltip(e) {
    if (!tip) return;
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY}px`;
  }
}

function linhaAviso(a) {
  const urgente = a.diasRestantes < 0 || a.diasRestantes <= 15;
  const classe = urgente ? 'aviso' : 'aviso atencao';
  return `
    <div class="${classe}">
      ${icons.alerta}
      <div>
        <strong>${escapeHtml(a.tipo)}</strong> — ${escapeHtml(a.descricao || a.id)}
        (<a href="${linkDoAviso(a)}">${escapeHtml(a.id)}</a>):
        vence em ${formatarData(a.data)}
        ${a.diasRestantes < 0 ? `<strong>(vencido há ${Math.abs(a.diasRestantes)} dias)</strong>` : `(faltam ${a.diasRestantes} dias)`}
      </div>
    </div>
  `;
}

function ehTipoEquipamento(tipo) {
  return tipo === 'Locacao-Equipamento' || tipo === 'Devolucao-Equipamento' || tipo === 'Calibracao';
}

function linhaMovimentacao(m) {
  const link = ehTipoEquipamento(m.Tipo) ? `#/equipamento/${encodeURIComponent(m.ItemID)}` : `#/item/${encodeURIComponent(m.ItemID)}`;
  return `
    <tr>
      <td>${formatarDataHora(m.DataHora)}</td>
      <td><a href="${link}">${escapeHtml(m.ItemID)}</a></td>
      <td><span class="badge ${classeBadgeStatus(mapaTipoStatus(m.Tipo))}">${escapeHtml(m.Tipo)}</span></td>
      <td>${escapeHtml(m.ColaboradorEnvolvido || m.ProjetoDestino || '-')}</td>
    </tr>
  `;
}

function mapaTipoStatus(tipo) {
  const mapa = {
    'Entrada-Compra': 'Em estoque',
    'Alocacao-Colaborador': 'Com colaborador',
    'Saida-Projeto': 'Em projeto',
    'Devolucao': 'Em estoque',
    'Locacao-Equipamento': 'Em locação',
    'Devolucao-Equipamento': 'Em estoque',
    'Calibracao': 'Em estoque'
  };
  return mapa[tipo] || '';
}

export async function viewDashboard(main) {
  const [itens, equipamentos, custos, avisos, movimentacoes] = await Promise.all([
    api.listItens(),
    api.listEquipamentos(),
    api.custoPorProjeto(),
    api.avisos(60),
    api.listMovimentacoes()
  ]);

  const hoje = diaISO();
  const ontem = diaISO(new Date(Date.now() - 86400000));
  const entradasHoje = movimentacoes.filter((m) => m.Tipo === 'Entrada-Compra' && diaISO(m.DataHora) === hoje).length;
  const entradasOntem = movimentacoes.filter((m) => m.Tipo === 'Entrada-Compra' && diaISO(m.DataHora) === ontem).length;
  const saidasHoje = movimentacoes.filter((m) => (m.Tipo === 'Saida-Projeto' || m.Tipo === 'Alocacao-Colaborador' || m.Tipo === 'Locacao-Equipamento') && diaISO(m.DataHora) === hoje).length;
  const saidasOntem = movimentacoes.filter((m) => (m.Tipo === 'Saida-Projeto' || m.Tipo === 'Alocacao-Colaborador' || m.Tipo === 'Locacao-Equipamento') && diaISO(m.DataHora) === ontem).length;
  const emEstoque = itens.filter((i) => i.Status === 'Em estoque').length;
  const equipamentosEmLocacao = equipamentos.filter((e) => e.Status === 'Em locação').length;
  const custoTotal = custos.reduce((soma, c) => soma + c.custo, 0);

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Painel</h2>
      <div class="subtitulo">Visão geral do estoque, movimentações e avisos</div>
    </div>

    <div class="grid cols-4">
      ${statCard({ icone: icons.box, classeIcone: 'icone-azul', valor: emEstoque, rotulo: 'Itens em estoque' })}
      ${statCard({ icone: icons.entrada, classeIcone: 'icone-verde', valor: entradasHoje, rotulo: 'Entradas hoje', tendencia: tendenciaDeContagem(entradasHoje, entradasOntem) })}
      ${statCard({ icone: icons.saida, classeIcone: 'icone-roxo', valor: saidasHoje, rotulo: 'Saídas hoje', tendencia: tendenciaDeContagem(saidasHoje, saidasOntem) })}
      ${statCard({ icone: icons.equipamento, classeIcone: 'icone-roxo', valor: equipamentosEmLocacao, rotulo: 'Equipamentos em locação' })}
      ${statCard({ icone: icons.alerta, classeIcone: 'icone-amarelo', valor: avisos.length, rotulo: 'Avisos críticos (60 dias)' })}
    </div>

    <div class="card">
      <h3>Movimentações — últimos 7 dias</h3>
      ${graficoMovimentacoes(movimentacoes)}
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h3>Últimas movimentações</h3>
        <div class="tabela-wrap">
          <table>
            <thead><tr><th>Data</th><th>Item</th><th>Tipo</th><th>Detalhe</th></tr></thead>
            <tbody>${movimentacoes.slice(0, 8).map(linhaMovimentacao).join('') || '<tr><td colspan="4">Nenhuma movimentação ainda.</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3>Custo por projeto</h3>
        ${custos.length === 0 ? '<p style="color:var(--text-secondary)">Nenhum custo lançado ainda.</p>' : `
          <div class="tabela-wrap">
            <table>
              <thead><tr><th>Projeto</th><th>Custo</th></tr></thead>
              <tbody>
                ${custos.sort((a, b) => b.custo - a.custo).slice(0, 8).map((c) => `<tr><td>${escapeHtml(c.projeto)}</td><td>${formatarMoeda(c.custo)}</td></tr>`).join('')}
              </tbody>
              <tfoot><tr><td><strong>Total</strong></td><td><strong>${formatarMoeda(custoTotal)}</strong></td></tr></tfoot>
            </table>
          </div>
        `}
      </div>
    </div>

    <div class="card">
      <h3>Avisos (próximos 60 dias)</h3>
      ${avisos.length === 0 ? '<div class="aviso ok">' + icons.alerta + '<div>Nenhuma calibração ou validade vencendo nos próximos 60 dias.</div></div>' : avisos.map(linhaAviso).join('')}
    </div>
  `;

  ligarTooltipsGrafico(main);
}
