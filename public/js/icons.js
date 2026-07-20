// Ícones em SVG inline (estilo outline, como Lucide/Feather) — sem dependência externa.
const BASE = (paths, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const icons = {
  logo: BASE('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  painel: BASE('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  box: BASE('<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>'),
  entrada: BASE('<path d="M12 5v11"/><path d="M6 11l6 6 6-6"/><path d="M4 20h16"/>'),
  saida: BASE('<path d="M12 19V8"/><path d="M18 13l-6-6-6 6"/><path d="M4 20h16"/>'),
  colaboradores: BASE('<circle cx="9" cy="8" r="3.2"/><path d="M2.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5"/><circle cx="17" cy="8.5" r="2.6"/><path d="M15.7 13.6c2.9.4 5.3 2.3 5.3 5.4"/>'),
  projetos: BASE('<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8A2 2 0 0 1 21 9.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>'),
  equipamento: BASE('<circle cx="12" cy="13" r="8"/><path d="M12 13l3.2-3.2"/><path d="M9 3h6"/><path d="M12 13m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>'),
  frasco: BASE('<path d="M9 2h6"/><path d="M10 2v6.2L4.7 17a2 2 0 0 0 1.7 3h11.2a2 2 0 0 0 1.7-3L14 8.2V2"/><path d="M7.5 14h9"/>'),
  etiqueta: BASE('<path d="M3 11.5V5a2 2 0 0 1 2-2h6.5a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0l-8-8A2 2 0 0 1 3 11.5z"/><circle cx="8" cy="8" r="1.4"/>'),
  alerta: BASE('<path d="M10.6 3.6L2.2 18a1.8 1.8 0 0 0 1.5 2.7h16.6a1.8 1.8 0 0 0 1.5-2.7L13.4 3.6a1.8 1.8 0 0 0-2.8 0z"/><path d="M12 9.5v4.2"/><path d="M12 17.2h.01"/>'),
  busca: BASE('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>'),
  sino: BASE('<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/>'),
  usuario: BASE('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>'),
  mais: BASE('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  x: BASE('<path d="M18 6L6 18"/><path d="M6 6l12 12"/>'),
  chevronBaixo: BASE('<path d="M6 9l6 6 6-6"/>'),
  ordenar: BASE('<path d="M7 3v18"/><path d="M3 7l4-4 4 4"/><path d="M17 21V3"/><path d="M21 17l-4 4-4-4"/>'),
  sair: BASE('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'),
  menu: BASE('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>'),
  check: BASE('<path d="M20 6L9 17l-5-5"/>'),
  tendenciaCima: BASE('<path d="M4 15l6-6 4 4 6-8"/><path d="M14 5h6v6"/>'),
  tendenciaBaixo: BASE('<path d="M4 9l6 6 4-4 6 8"/><path d="M14 19h6v-6"/>')
};

export function svgIcon(nome) {
  return icons[nome] || '';
}
