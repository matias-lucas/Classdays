import { z } from "zod";
import { ENFASES_PERIODO, TIPOS_EVENTO } from "@/lib/types";

/**
 * Schemas de validação (zod) do fluxo de eventos.
 *
 * Validação existe nas FRONTEIRAS do sistema: o que vem do Claude e o que
 * chega nas rotas de API é "mundo externo" e precisa ser conferido antes de
 * entrar no banco. Código interno confia nos tipos.
 */

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Campos comuns ao parseado e ao salvo — só `data` (obrigatória ou não) muda. */
const CamposEvento = z.object({
  tipo: z.enum(TIPOS_EVENTO),
  titulo: z.string().min(1).max(120),
  materia_id: z.string().nullable(),
  data_fim: z.string().regex(REGEX_DATA).nullable(),
  hora: z.string().regex(REGEX_HORA).nullable(),
  enfase: z.enum(ENFASES_PERIODO).default("ambos"),
  // `.default(false)`: corpo antigo (sem o campo) segue válido — a fronteira
  // não pode quebrar entre o deploy da coluna e o do formulário que a envia.
  suspende_aulas: z.boolean().default(false),
  observacao: z.string().max(500).nullable(),
});

/**
 * Período de um dia (`data_fim === data`) é representação duplicada de um
 * evento pontual: normaliza para `data_fim: null` antes de validar a ordem.
 * Uma representação canônica só, sempre.
 */
function normalizarPeriodo<T extends { data: string | null; data_fim: string | null }>(
  e: T,
): T {
  return e.data_fim === e.data ? { ...e, data_fim: null } : e;
}

/** O que um parser devolve. `data` pode ser null (frase sem data). */
export const EventoParseadoSchema = CamposEvento.extend({
  data: z.string().regex(REGEX_DATA).nullable(),
})
  .transform(normalizarPeriodo)
  .refine((e) => !e.data_fim || !e.data || e.data_fim > e.data, {
    message: "A data final precisa ser depois da inicial.",
    path: ["data_fim"],
  });

/** O que pode ser SALVO: igual ao parseado, mas com data obrigatória. */
export const NovoEventoSchema = CamposEvento.extend({
  data: z.string().regex(REGEX_DATA),
})
  .transform(normalizarPeriodo)
  .refine((e) => !e.data_fim || e.data_fim > e.data, {
    message: "A data final precisa ser depois da inicial.",
    path: ["data_fim"],
  });

/** Corpo da requisição de parsing. */
export const PedidoParseSchema = z.object({
  frase: z.string().trim().min(3).max(300),
});
