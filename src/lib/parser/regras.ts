import { addDias, proximoDiaDaSemana } from "@/lib/dates";
import type { Materia } from "@/lib/types";
import type { EventoParseado, ResultadoParse } from "./tipos";

/**
 * Parser de FALLBACK: interpreta a frase com expressões regulares e
 * heurísticas de português, sem chamar nenhuma API.
 *
 * É ele que roda quando não há ANTHROPIC_API_KEY (ou quando a chamada ao
 * Claude falha), então o /admin funciona mesmo offline. Cobre bem os padrões
 * do dia a dia — "prova de álgebra dia 13/07 às 19h", "na próxima terça não
 * haverá aula" — e, quando fica em dúvida, devolve o campo vazio com um
 * aviso, em vez de chutar. O preview editável cuida do resto.
 */

interface Contexto {
  hojeIso: string; // "hoje" entra por parâmetro — testável com data fixa
  materias: Materia[];
}

// ---------------------------------------------------------------------------
// normalização
// ---------------------------------------------------------------------------

/** minúsculas + sem acentos, pra comparar "Álgebra" com "algebra" */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove as marcas de acento decompostas
}

// ---------------------------------------------------------------------------
// data
// ---------------------------------------------------------------------------

const MESES_NOME: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const DIAS_NOME: Array<{ re: RegExp; dia: number }> = [
  { re: /domingo/, dia: 0 },
  { re: /segunda(?:-feira)?/, dia: 1 },
  { re: /terca(?:-feira)?/, dia: 2 },
  { re: /quarta(?:-feira)?/, dia: 3 },
  { re: /quinta(?:-feira)?/, dia: 4 },
  { re: /sexta(?:-feira)?/, dia: 5 },
  { re: /sabado/, dia: 6 },
];

interface DataAchada {
  iso: string;
  trecho: string; // o pedaço da frase que casou (pra tirar do título depois)
  avisos: string[];
}

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function dataValida(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function acharData(normal: string, hojeIso: string): DataAchada | null {
  const anoHoje = Number(hojeIso.slice(0, 4));
  const avisos: string[] = [];

  // 1) dd/mm ou dd/mm/aaaa  ("dia 13/07", "13/07/2026")
  let m = normal.match(/\b(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    let ano = m[3] ? Number(m[3]) : anoHoje;
    if (ano < 100) ano += 2000;
    if (!dataValida(ano, mes, dia)) return null;
    let data = iso(ano, mes, dia);
    if (!m[3] && data < hojeIso) {
      data = iso(ano + 1, mes, dia);
      avisos.push(
        `${m[1]}/${m[2]} já passou este ano — joguei para ${ano + 1}, confira.`,
      );
    }
    return { iso: data, trecho: m[0], avisos };
  }

  // 2) "13 de julho", "1º de agosto"
  m = normal.match(
    /\b(?:dia\s+)?(\d{1,2})[ºo°]?\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/,
  );
  if (m) {
    const dia = Number(m[1]);
    const mes = MESES_NOME[m[2]];
    if (!dataValida(anoHoje, mes, dia)) return null;
    let data = iso(anoHoje, mes, dia);
    if (data < hojeIso) {
      data = iso(anoHoje + 1, mes, dia);
      avisos.push(`Essa data já passou este ano — joguei para ${anoHoje + 1}, confira.`);
    }
    return { iso: data, trecho: m[0], avisos };
  }

  // 3) "dia 13" (sem mês) → dia 13 deste mês, ou do próximo se já passou
  m = normal.match(/\bdia\s+(\d{1,2})\b/);
  if (m) {
    const dia = Number(m[1]);
    const mesHoje = Number(hojeIso.slice(5, 7));
    let data: string | null = null;
    for (let salto = 0; salto <= 1 && !data; salto++) {
      const mes = ((mesHoje - 1 + salto) % 12) + 1;
      const ano = anoHoje + (mesHoje + salto > 12 ? 1 : 0);
      if (dataValida(ano, mes, dia) && iso(ano, mes, dia) >= hojeIso) {
        data = iso(ano, mes, dia);
      }
    }
    if (!data) return null;
    return { iso: data, trecho: m[0], avisos };
  }

  // 4) relativos
  m = normal.match(/\bdepois\s+de\s+amanha\b/);
  if (m) return { iso: addDias(hojeIso, 2), trecho: m[0], avisos };
  m = normal.match(/\bamanha\b/);
  if (m) return { iso: addDias(hojeIso, 1), trecho: m[0], avisos };
  m = normal.match(/\bhoje\b/);
  if (m) return { iso: hojeIso, trecho: m[0], avisos };

  // 5) dia da semana ("próxima terça", "na quinta", "sexta que vem")
  //
  // Semântica: "próxima X" e "X que vem" = a próxima ocorrência de X, NUNCA
  // hoje (dito na terça, "próxima terça" = daqui a 7 dias, mas "sexta que
  // vem" = a sexta desta semana — é o uso coloquial). Sem qualificador
  // ("na quinta"), hoje conta. O preview sempre mostra a data resolvida.
  for (const { re, dia } of DIAS_NOME) {
    const composto = new RegExp(
      `\\b(proxim[ao]\\s+)?(?:n[ao]\\s+|nes[st][ae]\\s+|ess[ae]\\s+)?(${re.source})(\\s+que\\s+vem)?\\b`,
    );
    const mm = normal.match(composto);
    if (mm) {
      const ehProxima = Boolean(mm[1] || mm[3]);
      // "na terça" dito numa terça = hoje; "próxima terça" = daqui a 7 dias
      const data = proximoDiaDaSemana(hojeIso, dia, !ehProxima);
      return { iso: data, trecho: mm[0], avisos };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// hora
// ---------------------------------------------------------------------------

function acharHora(normal: string): { hhmm: string; trecho: string } | null {
  // "19h", "19h30", "às 19h", "19:00", "19 horas"
  const padroes = [
    /\b(?:[aà]s?\s+)?(\d{1,2})h(\d{2})?\b/,
    /\b(?:[aà]s?\s+)?(\d{1,2}):(\d{2})\b/,
    /\b(?:[aà]s?\s+)?(\d{1,2})\s+horas\b/,
  ];
  for (const re of padroes) {
    const m = normal.match(re);
    if (m) {
      const hh = Number(m[1]);
      const mm = m[2] ? Number(m[2]) : 0;
      if (hh > 23 || mm > 59) continue;
      return {
        hhmm: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        trecho: m[0],
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// tipo
// ---------------------------------------------------------------------------

function acharTipo(normal: string): EventoParseado["tipo"] {
  if (
    /\b(nao\s+(havera|tera|vai\s+ter|tem|teremos)\s+aula|sem\s+aula|aula\s+cancelada|cancelad[ao]?s?|nao\s+haver[aá]\s+aula)\b/.test(
      normal,
    )
  ) {
    return "cancelamento";
  }
  if (/\b(prova|avaliacao|teste|exame|p1|p2|p3)\b/.test(normal)) return "prova";
  if (/\b(trabalho|entrega|projeto|seminario|apresentacao)\b/.test(normal)) {
    return "trabalho";
  }
  if (/\b(atividade|lista|exercicios?|quiz|tarefa)\b/.test(normal)) {
    return "atividade";
  }
  return "evento";
}

// ---------------------------------------------------------------------------
// matéria
// ---------------------------------------------------------------------------

/** Palavras genéricas que não identificam matéria nenhuma. */
const TOKENS_IGNORADOS = new Set([
  "de", "do", "da", "dos", "das", "e", "em", "a", "o", "eng", "engenharia",
  "i", "ii", "iii", "iv", "1", "2", "3",
]);

function tokensDe(nome: string): string[] {
  return normalizar(nome)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !TOKENS_IGNORADOS.has(t));
}

function acharMateria(normal: string, materias: Materia[]): string | null {
  let melhor: { id: string; pontos: number } | null = null;
  for (const materia of materias) {
    let pontos = 0;
    // nome completo na frase vale mais que tudo
    if (normal.includes(normalizar(materia.nome))) pontos += 100;
    // id citado direto ("bd", "alglin")
    if (new RegExp(`\\b${materia.id}\\b`).test(normal)) pontos += 50;
    // tokens significativos do nome ("algebra", "banco", "dados"…)
    for (const t of tokensDe(materia.nome)) {
      if (new RegExp(`\\b${t}\\b`).test(normal)) pontos += 10;
    }
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) {
      melhor = { id: materia.id, pontos };
    }
  }
  return melhor?.id ?? null;
}

// ---------------------------------------------------------------------------
// título
// ---------------------------------------------------------------------------

const CONECTORES_BORDA = new Set([
  "dia", "as", "às", "no", "na", "nos", "nas", "em", "para", "pra", "de",
  "do", "da", "e", "o", "a", "que", "havera", "haverá", "teremos", "tera",
  "terá", "sera", "será", "vai", "ter", "acontecera", "acontecerá",
]);

/** Tira data/hora da frase original e limpa as bordas, pra virar título. */
function tituloDeEvento(original: string, trechos: string[]): string {
  // os trechos vieram da versão sem acentos; removê-los da original exige
  // achar a posição equivalente (removerTrechoSemAcento cuida disso)
  let texto = original;
  for (const t of trechos) {
    texto = removerTrechoSemAcento(texto, t);
  }
  const palavras = texto
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  while (palavras.length && CONECTORES_BORDA.has(normalizar(palavras[0]))) {
    palavras.shift();
  }
  while (
    palavras.length &&
    CONECTORES_BORDA.has(normalizar(palavras[palavras.length - 1]))
  ) {
    palavras.pop();
  }
  const limpo = palavras.join(" ").replace(/^[\s,.;:—–-]+|[\s,.;:—–-]+$/g, "");
  if (limpo.length < 3) return "Evento da turma";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

/**
 * Remove da string ORIGINAL um trecho identificado na versão SEM acentos.
 * Caminha pelas duas em paralelo (elas têm o mesmo comprimento, já que a
 * normalização NFD só remove marcas de acento, não caracteres-base).
 */
function removerTrechoSemAcento(original: string, trechoNormal: string): string {
  const normal = normalizar(original);
  const inicio = normal.indexOf(trechoNormal);
  if (inicio === -1) return original;
  return (
    original.slice(0, inicio) + " " + original.slice(inicio + trechoNormal.length)
  );
}

// ---------------------------------------------------------------------------
// o parser em si
// ---------------------------------------------------------------------------

export function parseComRegras(frase: string, ctx: Contexto): ResultadoParse {
  const original = frase.trim();
  const normal = normalizar(original);
  const avisos: string[] = [];
  const trechosUsados: string[] = [];

  const hora = acharHora(normal);
  if (hora) trechosUsados.push(hora.trecho);

  const data = acharData(normal, ctx.hojeIso);
  if (data) {
    trechosUsados.push(data.trecho);
    avisos.push(...data.avisos);
  } else {
    avisos.push("Não identifiquei a data — preencha antes de salvar.");
  }

  const tipo = acharTipo(normal);
  const materia_id = acharMateria(normal, ctx.materias);

  if (!materia_id && ["prova", "trabalho", "atividade"].includes(tipo)) {
    avisos.push("Não identifiquei a matéria — confira antes de salvar.");
  }

  let titulo: string;
  switch (tipo) {
    case "prova":
      titulo = "Prova";
      break;
    case "trabalho":
      titulo = /\bentrega\b/.test(normal) ? "Entrega de trabalho" : "Trabalho";
      break;
    case "atividade":
      titulo = /\blista\b/.test(normal) ? "Lista de exercícios" : "Atividade avaliativa";
      break;
    case "cancelamento":
      titulo = materia_id ? "Aula cancelada" : "Não haverá aula";
      break;
    default:
      titulo = tituloDeEvento(original, trechosUsados);
  }

  const evento: EventoParseado = {
    tipo,
    titulo,
    materia_id,
    data: data?.iso ?? null,
    hora: hora?.hhmm ?? null,
    observacao: null, // regras não inventam observação
  };

  return { evento, origem: "regras", avisos };
}
