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
 * teto. Como `painelPorGrupo` nunca esconde um não lido, isto só marca o que
 * o painel de fato mostrou.
 */
export function comVistos(vistos: readonly number[], candidatos: Evento[]): number[] {
  const proximos = [...new Set([...vistos, ...candidatos.map((e) => e.id)])];
  return proximos.length > LIMITE_VISTOS ? proximos.slice(-LIMITE_VISTOS) : proximos;
}

/**
 * Janela de estreia: numa primeira visita, é novidade o que foi cadastrado nas
 * últimas 24h. O aluno que chega hoje não precisa de badge do que já estava
 * aqui — isso ele descobre navegando —, mas o aviso que a turma recebeu ontem
 * à noite ainda é aviso, e ele é o único que o sino tem como dar.
 */
export const JANELA_ESTREIA_MS = 24 * 60 * 60 * 1000;

/**
 * Instante em ms. O `created_at` chega em dois sotaques — `+00:00` do Postgres
 * e `Z` do navegador —, e entre eles a comparação de string mente; a de
 * instante, não.
 */
function emMs(iso: string): number {
  return Date.parse(iso);
}

/**
 * Baseline de quem ainda não tem estado guardado: os ids que já nascem lidos.
 *
 * Sem nada — primeira visita, aba anônima, ou o Safari que apaga o storage de
 * quem passou uma semana sem abrir o site — nasce lido só o que foi cadastrado
 * ANTES da janela de estreia. Antes disto a baseline engolia a lista inteira, e
 * o primeiro acesso nunca via ponto nenhum: nem de um evento cadastrado minutos
 * antes. Justamente o acesso em que o aluno mais precisa saber que o sino
 * existe.
 *
 * Com o timestamp da v1 (quem já usava o sino antigo), o corte é a última
 * visita: quem já esteve aqui é medido pelo que viu, não por 24h — o que
 * chegou depois continua novidade, a migração não engole avisos pendentes.
 */
export function vistosIniciais(
  candidatos: Evento[],
  ultimaVisitaV1: string | null,
  agoraIso: string,
): number[] {
  const corte = ultimaVisitaV1 ? emMs(ultimaVisitaV1) : emMs(agoraIso) - JANELA_ESTREIA_MS;
  // Corte ilegível (v1 corrompida, relógio exótico): volta pra baseline
  // conservadora. Tudo lido cala o sino uma vez; badge com a agenda inteira
  // ensina o aluno a ignorá-lo pra sempre.
  if (Number.isNaN(corte)) return candidatos.map((e) => e.id);
  return candidatos.filter((e) => emMs(e.created_at) <= corte).map((e) => e.id);
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
 * O painel em dois grupos: primeiro TODAS as novidades (o badge não pode
 * prometer uma que a lista esconde), depois as já vistas, até o teto. Dentro
 * de "Novidades" vale a ordem cronológica de `candidatos` (evento mais
 * próximo primeiro) — é o que se espera de uma caixa de notificações. Dentro
 * de "Já vistas" quem manda é `created_at`, mais recente em cima: é uma
 * caixa de avisos, não a agenda de novo, então a pergunta é "o que me
 * avisaram por último", não "o que acontece antes".
 */
export function painelPorGrupo(
  candidatos: Evento[],
  naoLidos: ReadonlySet<number>,
  teto: number = TETO_LIDOS,
): { novos: Evento[]; lidos: Evento[] } {
  return {
    novos: candidatos.filter((e) => naoLidos.has(e.id)),
    lidos: candidatos
      .filter((e) => !naoLidos.has(e.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, teto),
  };
}
