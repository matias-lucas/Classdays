import type { Evento } from "@/lib/types";

/**
 * Estado de leitura do sino — funções PURAS.
 *
 * Candidato a novidade é todo evento FUTURO (`eventosFuturos`), não só o que
 * acontece logo: uma olimpíada cadastrada hoje para daqui a um mês é notícia
 * hoje, não daqui a três semanas. "Novo" é o que o aluno nunca viu no painel;
 * o navegador guarda só a lista de ids JÁ VISTOS.
 *
 * Por que ids e não o timestamp da última visita (v1): com timestamp, um
 * evento criado hoje para daqui a um mês já nasceria "lido" — a baseline anda
 * pra frente toda vez que o painel abre. Por id isso não acontece: quem nunca
 * foi visto é novo, não importa quando foi criado nem quando acontece.
 */

/**
 * Teto de ids guardados. Só os que ainda estão na janela importam de fato,
 * mas guardamos uma folga generosa pra que sumiço temporário da lista (uma
 * matéria ocultada no Meu Classdays, por exemplo) não faça o evento voltar
 * marcado como novo quando reaparecer. Os mais antigos caem primeiro.
 */
export const LIMITE_VISTOS = 200;

/** Ids dos candidatos que ainda não foram vistos — são estes que ganham marca de "novo". */
export function idsNaoLidos(candidatos: Evento[], vistos: readonly number[]): Set<number> {
  const jaVistos = new Set(vistos);
  return new Set(candidatos.filter((e) => !jaVistos.has(e.id)).map((e) => e.id));
}

/**
 * A lista de vistos depois de abrir o painel: o que já estava + todos os
 * candidatos (ver = ler, sem "marcar como lido" manual), sem repetir e com
 * teto. Como `listaDoPainel` nunca esconde um não lido, isto só marca o que
 * o painel de fato mostrou.
 */
export function comVistos(vistos: readonly number[], candidatos: Evento[]): number[] {
  const proximos = [...new Set([...vistos, ...candidatos.map((e) => e.id)])];
  return proximos.length > LIMITE_VISTOS ? proximos.slice(-LIMITE_VISTOS) : proximos;
}

/**
 * Baseline de quem ainda não tem estado guardado.
 *
 * Sem nada (primeira visita): tudo nasce lido, pra não abrir o app com um
 * badge de tudo que já existia antes do aluno chegar. Com o timestamp da v1
 * (quem já usava o sino antigo): só o que foi criado até aquela visita nasce
 * lido — o que chegou depois continua sendo novidade, a migração não engole
 * avisos pendentes.
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

/**
 * Quantos eventos JÁ LIDOS o painel ainda mostra. O sino é "novidades", não a
 * agenda inteira — cada item leva pra lista completa em Próximos eventos. Os
 * lidos ficam como rastro do que já foi avisado, não como segunda agenda.
 */
export const TETO_LIDOS = 8;

/**
 * O que o painel exibe: TODOS os não lidos, sempre (o badge não pode prometer
 * uma novidade que a lista esconde) mais os já lidos mais próximos, até o
 * teto. Preserva a ordem cronológica que entrou.
 */
export function listaDoPainel(
  candidatos: Evento[],
  naoLidos: ReadonlySet<number>,
  teto: number = TETO_LIDOS,
): Evento[] {
  let lidos = 0;
  return candidatos.filter((e) => {
    if (naoLidos.has(e.id)) return true;
    lidos += 1;
    return lidos <= teto;
  });
}
