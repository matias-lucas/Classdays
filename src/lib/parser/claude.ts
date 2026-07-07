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
- "tipo": prova, trabalho, atividade (algo valendo nota que não é prova nem entrega), evento (geral) ou cancelamento.
- Frase dizendo que não haverá aula → tipo "cancelamento". Com matéria citada, cancela só aquela aula; sem matéria, o dia inteiro (materia_id null).
- Resolva datas relativas ("amanhã", "próxima terça", "dia 13") a partir de hoje. "próxima X" e "X que vem" = a próxima ocorrência do dia X, nunca hoje. Saída em AAAA-MM-DD.
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

  const evento: EventoParseado = {
    tipo: bruto.tipo,
    titulo: bruto.titulo.trim() || "Evento",
    materia_id,
    data,
    hora,
    observacao: bruto.observacao?.trim() || null,
  };

  return { evento, origem: "claude", avisos };
}
