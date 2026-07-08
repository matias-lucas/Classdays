/**
 * Utilitários de data do Classdays.
 *
 * Duas regras de ouro aqui:
 *
 * 1. Datas de calendário ("dia da prova") viajam como string "AAAA-MM-DD",
 *    nunca como objeto Date. Date carrega fuso horário junto, e isso causa o
 *    clássico bug do "evento aparecendo um dia antes/depois".
 *
 * 2. "Hoje" e "agora" são SEMPRE calculados no fuso de Brasília. O servidor
 *    da Vercel roda em UTC: às 23h daqui já é "amanhã" lá. Se usássemos
 *    new Date() direto, o calendário viraria o dia 3 horas mais cedo.
 *
 * A aritmética interna usa Date.UTC — dias têm sempre 24h em UTC (sem
 * horário de verão), então somar/subtrair dias nunca "escorrega".
 */

export const TIMEZONE = "America/Sao_Paulo";

// ---------------------------------------------------------------------------
// "hoje" e "agora" no fuso de Brasília
// ---------------------------------------------------------------------------

/** Data de hoje em Brasília, como "AAAA-MM-DD". (locale en-CA formata exatamente assim) */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Hora atual em Brasília, como "HH:MM" (24h). */
export function horaAgora(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    // hourCycle h23 (e não hour12:false): garante "00:xx" à meia-noite.
    // Alguns engines mapeiam hour12:false para h24 e devolvem "24:00",
    // o que quebraria comparações de string tipo hora >= agora.
    hourCycle: "h23",
  }).format(agora);
}

// ---------------------------------------------------------------------------
// aritmética pura sobre "AAAA-MM-DD" (sem fuso — só calendário)
// ---------------------------------------------------------------------------

const MS_POR_DIA = 86_400_000;

/** Converte "AAAA-MM-DD" em milissegundos UTC (meia-noite UTC daquele dia). */
function msUTC(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

/** Formata milissegundos UTC de volta para "AAAA-MM-DD". */
function paraISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Soma n dias (n pode ser negativo) a uma data ISO. */
export function addDias(iso: string, n: number): string {
  return paraISO(msUTC(iso) + n * MS_POR_DIA);
}

/** Quantos dias faltam de `deIso` até `ateIso` (negativo se já passou). */
export function diffDias(deIso: string, ateIso: string): number {
  return Math.round((msUTC(ateIso) - msUTC(deIso)) / MS_POR_DIA);
}

/** Dia da semana de uma data ISO: 0=domingo … 6=sábado (convenção do JS). */
export function diaSemanaDe(iso: string): number {
  return new Date(msUTC(iso)).getUTCDay();
}

/** Segunda-feira da semana em que `iso` cai. */
export function segundaDaSemana(iso: string): string {
  const dow = diaSemanaDe(iso); // 0=dom … 6=sáb
  const atras = (dow + 6) % 7; // dom → 6, seg → 0, ter → 1 …
  return addDias(iso, -atras);
}

/**
 * Próxima ocorrência de um dia da semana a partir de hoje.
 * Ex.: hoje é terça e quero "terça" → daqui a 7 dias (a PRÓXIMA terça),
 * a menos que `incluirHoje` seja true.
 */
export function proximoDiaDaSemana(
  hojeIso: string,
  alvo: number, // 0=dom … 6=sáb
  incluirHoje = false,
): string {
  const hoje = diaSemanaDe(hojeIso);
  let delta = (alvo - hoje + 7) % 7;
  if (delta === 0 && !incluirHoje) delta = 7;
  return addDias(hojeIso, delta);
}

// ---------------------------------------------------------------------------
// formatação para a interface (pt-BR)
// ---------------------------------------------------------------------------

export const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const DIAS_LONGOS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
export const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2026-07-13" → "13/07" */
export function fmtDiaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** "2026-07-13" → { dia: "13", mes: "jul" } (pro bloco de data dos eventos) */
export function fmtDiaMesPartes(iso: string): { dia: string; mes: string } {
  const [, mes, dia] = iso.split("-");
  return { dia, mes: MESES_CURTOS[Number(mes) - 1] };
}

/** "19:00" → "19h00" (estilo brasileiro, como no protótipo) */
export function fmtHora(hora: string): string {
  return hora.replace(":", "h");
}

/** Contagem regressiva humana: hoje / amanhã / em N dias / passou. */
export function rotuloRelativo(dias: number): string {
  if (dias < 0) return "passou";
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

/** Qual semana é essa, em relação a hoje — pro cabeçalho da agenda. */
export function rotuloSemana(offset: number): string {
  if (offset === 0) return "Esta semana";
  if (offset === 1) return "Semana que vem";
  if (offset === -1) return "Semana passada";
  if (offset > 1) return `Em ${offset} semanas`;
  return `${Math.abs(offset)} semanas atrás`;
}
