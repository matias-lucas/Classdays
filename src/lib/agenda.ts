import { addDias, diaSemanaDe } from "@/lib/dates";
import type { AulaFixa, Evento, TipoEvento } from "@/lib/types";

/**
 * Lógica de domínio da agenda — funções PURAS.
 *
 * Nada aqui lê banco, relógio ou fuso: tudo entra por parâmetro ("hoje" e
 * "agora" inclusive). Isso permite testar com datas fixas e garante que
 * servidor e navegador calculem exatamente a mesma tela (sem hydration
 * mismatch).
 */

// ---------------------------------------------------------------------------
// cancelamentos
// ---------------------------------------------------------------------------

/** Só os eventos de cancelamento (é com eles que a grade real é montada). */
export function cancelamentosDe(eventos: Evento[]): Evento[] {
  return eventos.filter((e) => e.tipo === "cancelamento");
}

/**
 * A aula de `materiaId` em `dataIso` está cancelada?
 * Devolve o evento de cancelamento (pra UI mostrar o motivo), ou null.
 * - cancelamento com materia_id null → derruba o dia inteiro;
 * - com materia_id preenchido → derruba só aquela matéria naquela data.
 */
export function cancelamentoDa(
  cancelamentos: Evento[],
  dataIso: string,
  materiaId: string | null,
): Evento | null {
  return (
    cancelamentos.find(
      (c) =>
        c.data === dataIso &&
        (c.materia_id === null || c.materia_id === materiaId),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// feriados e recessos — dias sem aula, reaproveitando o mecanismo de período
// ---------------------------------------------------------------------------

const TIPOS_AUSENCIA = new Set<TipoEvento>(["feriado", "recesso"]);

/** Feriado ou recesso: nunca tem matéria/"GERAL" — é ausência da turma toda. */
export function ehAusencia(tipo: TipoEvento): boolean {
  return TIPOS_AUSENCIA.has(tipo);
}

/** O feriado/recesso ativo nesta data, se houver (derruba a aula do dia inteiro). */
export function feriadoEm(eventos: Evento[], dataIso: string): Evento | null {
  return eventos.find((e) => TIPOS_AUSENCIA.has(e.tipo) && ativoEm(e, dataIso)) ?? null;
}

// ---------------------------------------------------------------------------
// eventos contínuos (período de dias) — funções puras, todas testadas
// ---------------------------------------------------------------------------

/** Último dia do evento: o fim do período, ou a própria data (pontual). */
export function fimDe(e: Evento): string {
  return e.data_fim ?? e.data;
}

/** É um período (tem data_fim)? */
export function ehPeriodo(e: Evento): boolean {
  return e.data_fim !== null;
}

/** O evento cobre esta data (entre o início e o fim, inclusive)? */
export function ativoEm(e: Evento, dataIso: string): boolean {
  return e.data <= dataIso && dataIso <= fimDe(e);
}

/** Período que já começou e ainda não terminou. */
export function emAndamento(e: Evento, hojeIso: string): boolean {
  return ehPeriodo(e) && ativoEm(e, hojeIso);
}

/**
 * A contagem regressiva deste evento mira o TÉRMINO em vez do início?
 *
 * Duas situações, e só elas:
 * - Período de ênfase `"fim"`, desde o primeiro dia: o prazo é a notícia
 *   ("inscrições até…"), então a conta é pro fechamento mesmo antes de abrir.
 * - Qualquer período **em andamento**, seja qual for a ênfase: começado, o que
 *   resta a saber é quanto falta pra acabar — inclusive num `"inicio"`, onde a
 *   data de abertura já ficou pra trás e contar por ela diria "passou".
 *
 * Pontual nunca mira término (`emAndamento` já exige período). Quem mira o fim
 * também troca o rótulo pra "termina em N dias": o número sozinho seria lido
 * como a data em que a coisa acontece.
 *
 * Existe aqui, e não solto em cada componente, porque é regra de domínio: o
 * hero e a lista dos Próximos eventos precisam dizer o MESMO número sobre o
 * mesmo evento. Enquanto a lista tinha a sua própria conta (sempre até o fim,
 * ignorando a ênfase), um período de ênfase `"inicio"` aparecia com dois
 * números diferentes na mesma tela.
 */
export function contaAteOTermino(e: Evento, hojeIso: string): boolean {
  return (ehPeriodo(e) && e.enfase === "fim") || emAndamento(e, hojeIso);
}

/** Períodos rolando hoje (a faixa "em andamento" da tela). Nunca cancelamento. */
export function continuosAtivos(
  eventos: Evento[],
  hojeIso: string,
  filtroMateria: string | null = null,
): Evento[] {
  return eventos
    .filter((e) => e.tipo !== "cancelamento")
    .filter((e) => emAndamento(e, hojeIso))
    .filter((e) => (filtroMateria ? e.materia_id === filtroMateria : true));
}

// ---------------------------------------------------------------------------
// grade da semana (segunda a sexta, já cruzada com cancelamentos)
// ---------------------------------------------------------------------------

export interface DiaDaSemana {
  data: string; // "AAAA-MM-DD"
  /** Feriado ou recesso cobrindo este dia — quando presente, `aulas` vem vazio. */
  feriado: Evento | null;
  cancelamentoDiaInteiro: Evento | null;
  aulas: Array<{
    aula: AulaFixa;
    cancelamento: Evento | null; // cancelamento só desta aula, se houver
    evento: Evento | null; // prova/trabalho/atividade dessa matéria nessa data, se houver
  }>;
  /** Períodos (renovação de matrícula…) ativos neste dia — nunca repete o `feriado` acima. */
  continuos: Evento[];
}

/** Monta os 5 dias úteis da semana que começa em `segundaIso`. */
export function montarSemana(
  grade: AulaFixa[],
  eventos: Evento[],
  segundaIso: string,
): DiaDaSemana[] {
  const cancelamentos = cancelamentosDe(eventos);
  const dias: DiaDaSemana[] = [];
  for (let i = 0; i < 5; i++) {
    const data = addDias(segundaIso, i);
    const feriado = feriadoEm(eventos, data);
    // dia_semana usa 1=seg…5=sex — os mesmos números do getDay() do JS
    // para dias úteis, então dá pra comparar direto. Feriado/recesso derruba
    // todas as aulas do dia, como um cancelamento de dia inteiro.
    const doDia = feriado ? [] : grade.filter((g) => g.dia_semana === diaSemanaDe(data));
    dias.push({
      data,
      feriado,
      cancelamentoDiaInteiro: feriado
        ? null
        : cancelamentos.find((c) => c.data === data && c.materia_id === null) ??
          null,
      aulas: doDia.map((aula) => ({
        aula,
        cancelamento: cancelamentoDa(cancelamentos, data, aula.materia_id),
        evento:
          eventos.find(
            (e) =>
              e.tipo !== "cancelamento" &&
              ativoEm(e, data) &&
              e.materia_id === aula.materia_id,
          ) ?? null,
      })),
      continuos: continuosAtivos(eventos, data).filter((e) => e.id !== feriado?.id),
    });
  }
  return dias;
}

// ---------------------------------------------------------------------------
// "Próximo" (o card-herói do topo) — SÓ EVENTOS
// ---------------------------------------------------------------------------

/**
 * A data que decide a vez de um evento no hero. Pontual: a própria `data`,
 * sempre. Período: depende da `enfase` — "fim" usa o término desde o primeiro
 * dia (a notícia é o prazo, então ele disputa o hero por isso mesmo antes de
 * começar); "ambos" usa o início enquanto o período não começou e passa a
 * usar o término assim que entra em andamento (a partir daí disputa igual a
 * "fim" — "está acabando" também é notícia); "inicio" usa sempre o início (o
 * marco que importa é só a abertura — ver `proximoEvento` pro que acontece
 * depois que ele passa).
 */
function chaveHero(e: Evento, hojeIso: string): string {
  if (!ehPeriodo(e)) return e.data;
  if (e.enfase === "fim") return fimDe(e);
  if (e.enfase === "ambos" && emAndamento(e, hojeIso)) return fimDe(e);
  return e.data;
}

/**
 * O próximo EVENTO (prova/trabalho/atividade/evento) — nunca aula, nunca
 * cancelamento. É o que o card "Próximo" mostra: aula da grade não é destino,
 * e cancelamento é ausência de coisa (aparece na grade e na lista, não aqui).
 * Eventos de hoje só contam se a hora ainda não passou (sem hora = vale o dia
 * todo). Devolve o `Evento` cru (a UI resolve matéria/cor), ou null.
 *
 * Regra, nesta ordem: 1) se houver algo que ainda não aconteceu — pontual sem
 * ter chegado, ou período cuja data de `enfase` (início ou término, conforme
 * o campo e se já começou — ver `chaveHero`) ainda está à frente —, o mais
 * cedo deles vence; 2) senão, entre os períodos em andamento que não são de
 * ênfase "inicio", o que termina primeiro assume (rede de segurança pro caso
 * raro de a `hora` do fim já ter passado hoje); 3) senão, null. "Fim" disputa
 * o hero pelo término desde o primeiro dia; "ambos" mira o início enquanto
 * não começa e passa a disputar pelo término assim que entra em andamento —
 * igual a "fim" a partir daí; só "inicio" some do hero assim que começa (o
 * marco que importava — abertura de vagas limitadas, por exemplo — já
 * passou). Feriado e recesso nunca viram hero (são ausência, como
 * cancelamento), mas seguem aparecendo na lista de próximos eventos.
 */
export function proximoEvento(
  eventos: Evento[],
  hojeIso: string,
  agoraHHMM: string,
  filtroMateria: string | null = null,
): Evento | null {
  const candidatos = eventos
    .filter((e) => e.tipo !== "cancelamento" && !TIPOS_AUSENCIA.has(e.tipo))
    .filter((e) => (filtroMateria ? e.materia_id === filtroMateria : true));

  const aindaNaoAconteceu = candidatos
    .filter((e) => {
      const chave = chaveHero(e, hojeIso);
      if (chave > hojeIso) return true;
      if (chave < hojeIso) return false;
      return e.hora === null || e.hora >= agoraHHMM; // hoje: só o que ainda vem
    })
    .sort(
      (a, b) =>
        chaveHero(a, hojeIso).localeCompare(chaveHero(b, hojeIso)) ||
        (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"),
    );
  if (aindaNaoAconteceu.length > 0) return aindaNaoAconteceu[0];

  const emCurso = candidatos
    .filter((e) => emAndamento(e, hojeIso) && e.enfase !== "inicio")
    .sort((a, b) => fimDe(a).localeCompare(fimDe(b)));
  return emCurso[0] ?? null;
}

// ---------------------------------------------------------------------------
// "Hoje" (a timeline do dia)
// ---------------------------------------------------------------------------

export interface ItemHoje {
  kind: "aula" | "evento";
  tipo: TipoEvento | null; // null quando é aula da grade
  titulo: string; // "" quando é aula (a UI mostra o nome da matéria)
  materia_id: string | null;
  hora: string | null;
  hora_fim: string | null; // fim da aula; null em evento (evento é um instante)
  sala: string | null;
  observacao: string | null;
}

/**
 * O dia de hoje, em ordem cronológica: as aulas fixas de hoje (pulando as
 * canceladas) somadas aos eventos de hoje. É uma timeline do que *acontece*
 * hoje — por isso, diferente de `eventosFuturos`, o cancelamento não vira um
 * item: ele é ausência de aula, e some da linha (a grade logo abaixo continua
 * mostrando o risco). Sem parâmetro `agora`: a timeline mostra o dia inteiro,
 * sem marcador de "agora" e sem esconder o que já passou.
 */
export function itensDeHoje(
  grade: AulaFixa[],
  eventos: Evento[],
  hojeIso: string,
  filtroMateria: string | null = null,
): ItemHoje[] {
  const cancelamentos = cancelamentosDe(eventos);
  const itens: ItemHoje[] = [];

  // aulas fixas de hoje que não estão canceladas (feriado/recesso derruba
  // todas de uma vez, como um cancelamento de dia inteiro — mas o próprio
  // feriado, se for de um dia só, ainda entra como item mais abaixo)
  if (!feriadoEm(eventos, hojeIso)) {
    const dow = diaSemanaDe(hojeIso);
    for (const g of grade) {
      if (g.dia_semana !== dow) continue;
      if (cancelamentoDa(cancelamentos, hojeIso, g.materia_id)) continue;
      itens.push({
        kind: "aula",
        tipo: null,
        titulo: "",
        materia_id: g.materia_id,
        hora: g.hora_ini,
        hora_fim: g.hora_fim,
        sala: g.sala,
        observacao: null,
      });
    }
  }

  // eventos pontuais de hoje — cancelamento não entra (é ausência, não item);
  // período também não (repetiria todo dia, sem hora — vive na faixa "em
  // andamento", acima desta régua)
  for (const e of eventos) {
    if (e.tipo === "cancelamento") continue;
    if (ehPeriodo(e)) continue;
    if (e.data !== hojeIso) continue;
    itens.push({
      kind: "evento",
      tipo: e.tipo,
      titulo: e.titulo,
      materia_id: e.materia_id,
      hora: e.hora,
      hora_fim: null, // evento é um instante na régua, não tem duração
      sala: null,
      observacao: e.observacao,
    });
  }

  return itens
    .filter((x) => (filtroMateria ? x.materia_id === filtroMateria : true))
    .sort((a, b) => (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"));
}

// ---------------------------------------------------------------------------
// lista "Próximos eventos"
// ---------------------------------------------------------------------------

/**
 * Eventos de hoje em diante, ordenados. Cancelamentos APARECEM aqui
 * (aviso importante), diferente do card Próximo. Um período em andamento
 * conta como "futuro" enquanto não terminar, mesmo com início no passado —
 * e ordena pela data de REFERÊNCIA (`max(data, hoje)`), pra um período em
 * curso entrar como "hoje" em vez de pelo início, que já passou.
 */
export function eventosFuturos(
  eventos: Evento[],
  hojeIso: string,
  filtroMateria: string | null = null,
): Evento[] {
  const referencia = (e: Evento) => (e.data > hojeIso ? e.data : hojeIso);
  return eventos
    .filter((e) => fimDe(e) >= hojeIso)
    .filter((e) => (filtroMateria ? e.materia_id === filtroMateria : true))
    .sort(
      (a, b) =>
        referencia(a).localeCompare(referencia(b)) ||
        (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"),
    );
}

