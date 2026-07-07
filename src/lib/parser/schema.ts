import { z } from "zod";
import { TIPOS_EVENTO } from "@/lib/types";

/**
 * Schemas de validação (zod) do fluxo de eventos.
 *
 * Validação existe nas FRONTEIRAS do sistema: o que vem do Claude e o que
 * chega nas rotas de API é "mundo externo" e precisa ser conferido antes de
 * entrar no banco. Código interno confia nos tipos.
 */

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** O que um parser devolve. `data` pode ser null (frase sem data). */
export const EventoParseadoSchema = z.object({
  tipo: z.enum(TIPOS_EVENTO),
  titulo: z.string().min(1).max(120),
  materia_id: z.string().nullable(),
  data: z.string().regex(REGEX_DATA).nullable(),
  hora: z.string().regex(REGEX_HORA).nullable(),
  observacao: z.string().max(500).nullable(),
});

/** O que pode ser SALVO: igual ao parseado, mas com data obrigatória. */
export const NovoEventoSchema = EventoParseadoSchema.extend({
  data: z.string().regex(REGEX_DATA),
});

/** Corpo da requisição de parsing. */
export const PedidoParseSchema = z.object({
  frase: z.string().trim().min(3).max(300),
});
