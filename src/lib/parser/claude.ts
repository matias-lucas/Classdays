import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { DIAS_LONGOS, diaSemanaDe } from "@/lib/dates";
import type { Materia } from "@/lib/types";
import { TIPOS_EVENTO } from "@/lib/types";
import type { EventoParseado, ResultadoParse } from "./tipos";

/**
 * Parser via API do Claude — o "input inteligente" de verdade.
 *
 * Só roda no servidor (a chave nunca chega ao navegador). Usa "structured
 * outputs": em vez de pedir "responda só JSON" e torcer, o schema vai junto
 * da requisição e a API GARANTE que a resposta é um JSON válido naquele
 * formato. Quem chama (a rota /api/parse) faz o try/catch e cai para o
 * parser de regras se algo aqui falhar.
 */

/** Há chave configurada? (Sem chave, a rota nem tenta o Claude.) */
export function claudeDisponivel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Schema que a API vai garantir na resposta. Solto de propósito em data/hora
// (strings livres): a rota valida o formato depois e anula campo por campo,
// em vez de jogar fora a resposta inteira por um detalhe.
const SaidaClaude = z.object({
  tipo: z.enum(TIPOS_EVENTO),
  titulo: z.string(),
  materia_id: z.string().nullable(),
  data: z.string().nullable(),
  data_fim: z.string().nullable(),
  hora: z.string().nullable(),
  observacao: z.string().nullable(),
});

function montarSystemPrompt(hojeIso: string, materias: Materia[]): string {
  const lista = materias
    .map((m) => `- ${m.id} = ${m.nome}${m.prof ? ` (${m.prof})` : ""}`)
    .join("\n");
  return `Você é o parser de eventos do calendário acadêmico de uma turma de Engenharia de Software.
Recebe uma frase informal em português (escrita pelo representante de turma) e extrai um evento estruturado.

Contexto:
- Hoje é ${DIAS_LONGOS[diaSemanaDe(hojeIso)]}, ${hojeIso}.
- Matérias da turma (id = nome):
${lista}

Regras:
- "tipo": prova, trabalho, atividade (algo valendo nota que não é prova nem entrega), evento (geral), cancelamento, feriado ou recesso.
- Frase dizendo que não haverá aula → tipo "cancelamento". Com matéria citada, cancela só aquela aula; sem matéria, o dia inteiro (materia_id null).
- Frase citando "feriado" (um dia sem aula, ex.: "feriado dia 7/9") → tipo "feriado". Frase citando "recesso" (vários dias sem aula, ex.: "recesso de 20/12 a 05/01") → tipo "recesso", com data_fim preenchido como um período normal. Nenhum dos dois tem matéria (materia_id null).
- Resolva datas relativas ("amanhã", "próxima terça", "dia 13") a partir de hoje. "próxima X" e "X que vem" = a próxima ocorrência do dia X, nunca hoje. Saída em AAAA-MM-DD.
- "data_fim": só quando a frase descreve um PERÍODO de vários dias ("de 4/8 a 9/8", "entre os dias X e Y", "recesso de 20/12 a 05/01"). Preencha com o último dia do período, em AAAA-MM-DD, sempre DEPOIS de "data" (se a virada cair num ano novo, use o ano seguinte). Evento de um dia só → data_fim = null.
- NUNCA invente: se a frase não diz a data, data = null; sem hora, hora = null; se nenhuma matéria casar, materia_id = null.
- "materia_id" deve ser exatamente um dos ids da lista, ou null.
- "hora" em HH:MM (24h). "às 19h" → "19:00".
- "titulo": curto e informativo, como apareceria num mural ("Prova — Unidade 2", "Entrega do Projeto AVL", "Não haverá aula"). Não repita data/hora no título.
- "observacao": só detalhe extra relevante que não coube nos outros campos; senão null.`;
}

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function parseComClaude(
  frase: string,
  ctx: { hojeIso: string; materias: Materia[] },
): Promise<ResultadoParse> {
  const client = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente
  const modelo = process.env.CLAUDE_PARSER_MODEL ?? "claude-opus-4-8";

  const resposta = await client.messages.parse({
    model: modelo,
    max_tokens: 1024,
    system: montarSystemPrompt(ctx.hojeIso, ctx.materias),
    messages: [{ role: "user", content: frase }],
    output_config: { format: zodOutputFormat(SaidaClaude) },
  });

  if (resposta.stop_reason === "refusal" || !resposta.parsed_output) {
    throw new Error("Claude não devolveu um evento estruturado");
  }

  const bruto = resposta.parsed_output;
  const avisos: string[] = [];

  // Saneamento campo a campo: um deslize de formato não derruba o resto.
  let data = bruto.data;
  if (data && !REGEX_DATA.test(data)) {
    data = null;
    avisos.push("A data veio num formato inesperado — preencha manualmente.");
  }
  let hora = bruto.hora;
  if (hora && !REGEX_HORA.test(hora)) {
    hora = null;
    avisos.push("A hora veio num formato inesperado — confira.");
  }
  let materia_id = bruto.materia_id;
  if (materia_id && !ctx.materias.some((m) => m.id === materia_id)) {
    materia_id = null;
    avisos.push("A matéria indicada não existe — selecione manualmente.");
  }

  if (!data) {
    avisos.push("Não identifiquei a data — preencha antes de salvar.");
  }

  // data_fim segue o mesmo saneamento campo a campo dos outros: formato
  // errado ou fora de ordem não derruba a resposta inteira, só o campo.
  let data_fim = bruto.data_fim;
  if (data_fim && !REGEX_DATA.test(data_fim)) {
    data_fim = null;
    avisos.push("A data final do período veio num formato inesperado — confira.");
  } else if (data_fim && data && data_fim <= data) {
    data_fim = null;
    avisos.push("A data final do período precisa ser depois da inicial — confira.");
  }

  const evento: EventoParseado = {
    tipo: bruto.tipo,
    titulo: bruto.titulo.trim() || "Evento",
    materia_id,
    data,
    data_fim,
    hora,
    enfase: "ambos",
    suspende_aulas: false, // fora do schema de saída, como a ênfase: quem marca é o admin
    observacao: bruto.observacao?.trim() || null,
  };

  return { evento, origem: "claude", avisos };
}
