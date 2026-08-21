import type { Evento } from "@/lib/types";

/**
 * Estado de leitura do sino — funções PURAS.
 *
 * O painel de novidades mostra a janela inteira (`eventosNoIntervalo`), lidos
 * e não lidos juntos: uma notificação não some por ter sido vista, só muda de
 * aparência. O que o navegador guarda é a lista de ids JÁ VISTOS; "novo" é
 * tudo que está na janela e não está nessa lista.
 *
 * Por que ids e não mais o timestamp da última visita (v1): um evento criado
 * há duas semanas para daqui a um mês entra na janela dos 7 dias muito depois
 * de ter sido criado. Comparando por `created_at` ele já nasceria "lido"
 * (a baseline andou pra frente enquanto ele estava fora da janela) e o aluno
 * nunca veria o aviso. Por id isso não acontece: quem nunca foi visto é novo,
 * não importa quando foi criado.
 */

/**
 * Teto de ids guardados. Só os que ainda estão na janela importam de fato,
 * mas guardamos uma folga generosa pra que sumiço temporário da lista (uma
 * matéria ocultada no Meu Classdays, por exemplo) não faça o evento voltar
 * marcado como novo quando reaparecer. Os mais antigos caem primeiro.
 */
export const LIMITE_VISTOS = 200;

/** Ids da janela que ainda não foram vistos — são estes que ganham marca de "novo". */
export function idsNaoLidos(candidatos: Evento[], vistos: readonly number[]): Set<number> {
  const jaVistos = new Set(vistos);
  return new Set(candidatos.filter((e) => !jaVistos.has(e.id)).map((e) => e.id));
}

/**
 * A lista de vistos depois de abrir o painel: o que já estava + a janela
 * inteira (ver = ler, sem "marcar como lido" manual), sem repetir e com teto.
 */
export function comVistos(vistos: readonly number[], candidatos: Evento[]): number[] {
  const proximos = [...new Set([...vistos, ...candidatos.map((e) => e.id)])];
  return proximos.length > LIMITE_VISTOS ? proximos.slice(-LIMITE_VISTOS) : proximos;
}

/**
 * Baseline de quem ainda não tem estado guardado.
 *
 * Sem nada (primeira visita): a janela toda nasce lida, pra não abrir o app
 * com um badge de tudo que já existia antes do aluno chegar. Com o timestamp
 * da v1 (quem já usava o sino antigo): só o que foi criado até aquela visita
 * nasce lido — o que chegou depois continua sendo novidade, a migração não
 * engole avisos pendentes.
 */
export function vistosIniciais(candidatos: Evento[], ultimaVisitaV1: string | null): number[] {
  const lidos = ultimaVisitaV1
    ? candidatos.filter((e) => e.created_at <= ultimaVisitaV1)
    : candidatos;
  return lidos.map((e) => e.id);
}

/**
 * Lê o que está no localStorage. `null` = ausente ou corrompido, e aí quem
 * chama aplica a baseline — melhor recomeçar com a janela lida do que
 * despejar um badge cheio por causa de um JSON quebrado.
 */
export function parseVistos(bruto: string | null): number[] | null {
  if (!bruto) return null;
  try {
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return null;
    return dados.filter((x): x is number => typeof x === "number");
  } catch {
    return null;
  }
}
