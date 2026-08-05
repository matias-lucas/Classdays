import { z } from "zod";

/**
 * Schemas de validação (zod) da grade fixa e das matérias — fronteira das
 * rotas /api/grade e /api/materias (mesmo espírito de src/lib/parser/schema.ts).
 */

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID_MATERIA = /^[a-z][a-z0-9]{1,15}$/;
const COR_HEX = /^#[0-9a-fA-F]{6}$/;
// marcas de acento decompostas por normalize("NFD"), ex.: "ç" -> "c" + U+0327
const MARCAS_DE_ACENTO = /[̀-ͯ]/g;

export const NovaAulaSchema = z
  .object({
    materia_id: z.string().min(1),
    dia_semana: z.number().int().min(1).max(5),
    hora_ini: z.string().regex(HORA),
    hora_fim: z.string().regex(HORA),
    sala: z.string().trim().max(40).nullable(),
  })
  .refine((a) => a.hora_fim > a.hora_ini, {
    message: "A hora de término precisa ser depois da de início.",
    path: ["hora_fim"],
  });

export const NovaMateriaSchema = z.object({
  id: z.string().regex(ID_MATERIA),
  nome: z.string().trim().min(2).max(60),
  prof: z.string().trim().max(60).nullable(),
  cor: z.string().regex(COR_HEX),
});

export const EdicaoMateriaSchema = NovaMateriaSchema.omit({ id: true });

/**
 * "Programação Orientada a Objetos I" → "programacao" — sugestão editável
 * pro campo id do formulário de matéria nova. Regra: primeira palavra do
 * nome, sem acento, só [a-z0-9], no máximo 12 caracteres, sempre começando
 * por letra (prefixo "m" quando a palavra começa em número).
 */
export function slugDeNome(nome: string): string {
  const primeiraPalavra = nome.trim().split(/\s+/)[0] ?? "";
  const limpa = primeiraPalavra
    .normalize("NFD")
    .replace(MARCAS_DE_ACENTO, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let slug = limpa.slice(0, 12);
  if (!/^[a-z]/.test(slug)) slug = `m${slug}`.slice(0, 12);
  if (slug.length < 2) slug = `${slug}0`;
  return slug;
}
