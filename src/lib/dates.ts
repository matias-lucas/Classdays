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

// ─── TEMP (teste local) ─────────────────────────────────────────────────────
// Finge que "hoje" é segunda-feira 13/07/2026 e que "agora" são 12h, só pra
// conferir a timeline de "Hoje" no localhost. Vale pro servidor E pro relógio
// do cliente (que reusa estas funções a cada 60s). PARA VOLTAR AO RELÓGIO REAL:
// apague este bloco e os dois `return TEMP_*` marcados logo abaixo.
const TEMP_HOJE = "2026-07-13";
const TEMP_AGORA = "12:00";
// ────────────────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// "hoje" e "agora" no fuso de Brasília
// ---------------------------------------------------------------------------

/** Data de hoje em Brasília, como "AAAA-MM-DD". (locale en-CA formata exatamente assim) */
export function hojeISO(agora: Date = new Date()): string {
  if (TEMP_HOJE) return TEMP_HOJE; // TEMP: apague esta linha pra voltar ao relógio real
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Hora atual em Brasília, como "HH:MM" (24h). */
export function horaAgora(agora: Date = new Date()): string {
  if (TEMP_AGORA) return TEMP_AGORA; // TEMP: apague esta linha pra voltar ao relógio real
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

/** "20:40" → 1240 (minutos desde a meia-noite). */
function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Em qual "faixa" da noite a aula cai — usado só no quadro de horários do
 * desktop, onde cada dia é uma coluna de 2 linhas (dois horários da noite):
 * - "full": aula longa que cobre a noite inteira (≥ 2h30, ex. 19h–22h) →
 *   ocupa as duas linhas (o card "quadradão");
 * - "cedo": primeiro horário (começa antes das ~20h45);
 * - "tarde": segundo horário.
 * Assim as colunas fecham todas na mesma altura, sem quebras.
 */
export function faixaHorario(horaIni: string, horaFim: string): "full" | "cedo" | "tarde" {
  const ini = minutosDe(horaIni);
  const fim = minutosDe(horaFim);
  if (fim - ini >= 150) return "full"; // ≥ 2h30 cobre os dois horários
  return ini < 20 * 60 + 45 ? "cedo" : "tarde"; // divisor às 20h45
}

/** Contagem regressiva humana: hoje / amanhã / em N dias / passou. */
export function rotuloRelativo(dias: number): string {
  if (dias < 0) return "passou";
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

export interface Contagem {
  dias: number;
  horas: number;
  minutos: number;
  /** Minutos totais até o instante-alvo; < 0 quando ele já passou. */
  totalMin: number;
  /** false = evento de dia inteiro (só dá pra contar em dias). */
  temHora: boolean;
}

/**
 * Contagem regressiva "viva" até um evento — a matéria-prima do card expressivo
 * (1b). Tudo entra por parâmetro ("hoje"/"agora" inclusive), então é pura e
 * testável, e servidor/navegador calculam o mesmo (o relógio de minuto do
 * AgendaAluno reavalia a cada 60s).
 *
 * Sem hora, o evento vale o dia todo: conta só em dias (`temHora:false`). Com
 * hora, quebra o tempo restante em dias/horas/minutos. `totalMin < 0` sinaliza
 * que o instante já passou (a UI mostra "agora").
 */
export function contagemRegressiva(
  hojeIso: string,
  agoraHHMM: string,
  dataIso: string,
  horaHHMM: string | null,
): Contagem {
  const diasAte = diffDias(hojeIso, dataIso);
  if (horaHHMM === null) {
    return {
      dias: Math.max(diasAte, 0),
      horas: 0,
      minutos: 0,
      totalMin: diasAte * 1440,
      temHora: false,
    };
  }
  const totalMin = diasAte * 1440 + (minutosDe(horaHHMM) - minutosDe(agoraHHMM));
  const restante = Math.max(totalMin, 0);
  return {
    dias: Math.floor(restante / 1440),
    horas: Math.floor((restante % 1440) / 60),
    minutos: restante % 60,
    totalMin,
    temHora: true,
  };
}

/** Qual semana é essa, em relação a hoje — pro cabeçalho da agenda. */
export function rotuloSemana(offset: number): string {
  if (offset === 0) return "Esta semana";
  if (offset === 1) return "Semana que vem";
  if (offset === -1) return "Semana passada";
  if (offset > 1) return `Em ${offset} semanas`;
  return `${Math.abs(offset)} semanas atrás`;
}
