"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { comVistos, idsNaoLidos, parseVistos, vistosIniciais } from "@/lib/sino";
import type { Evento } from "@/lib/types";

/** Ids já vistos, em JSON. A v1 guardava só o timestamp da última visita. */
const CHAVE = "classdays:sino:v2";
const CHAVE_V1 = "classdays:sino:v1";

const NENHUM: ReadonlySet<number> = new Set();

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function salvar(vistos: number[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(vistos));
  } catch {
    // localStorage indisponível (modo privado etc.): a marcação não sobrevive
    // ao reload, mas não trava a interação — mesma postura do usePreferencias.
  }
}

/**
 * Estado de leitura do sino sobre `candidatos` (os eventos futuros já
 * filtrados por quem chama, ver `eventosFuturos`): quais deles o aluno ainda
 * não viu no painel de novidades. O que já foi lido continua sendo exibido —
 * o hook só diz quem está por ler; a regra pura mora em `lib/sino`.
 *
 * Hydration-safe: nasce sem nada não-lido (igual ao servidor) e só lê o
 * localStorage depois de montar, num `useEffect` — mesmo padrão do
 * `usePreferencias`.
 */
export function useNaoLidos(candidatos: Evento[]) {
  const [vistos, setVistos] = useState<number[]>([]);
  const [pronto, setPronto] = useState(false);

  // Boot: roda uma vez só, de propósito. A baseline da primeira visita usa a
  // janela do primeiro render (a do closure) — é "o que já existia quando o
  // aluno chegou", medido contra a janela de estreia; janelas posteriores não
  // devem refazer baseline nenhuma, então `candidatos` fora das deps é a
  // intenção, não um esquecimento.
  //
  // O "agora" é o relógio do aparelho, e não o do servidor: aqui já estamos
  // depois do mount (nada de hydration mismatch), e o corte de 24h tolera bem
  // um celular alguns minutos fora de hora.
  useEffect(() => {
    const salvos = parseVistos(ler(CHAVE));
    const inicial = salvos ?? vistosIniciais(candidatos, ler(CHAVE_V1), new Date().toISOString());
    // A baseline é gravada JÁ na estreia, e não só quando o painel abre: ela
    // prende o corte ao instante da chegada. Sem isso a janela deslizaria a
    // cada reload, e a novidade que o aluno viu mas não abriu se apagaria
    // sozinha ao completar 24h, sem ninguém ter lido nada.
    if (!salvos) salvar(inicial);
    setVistos(inicial);
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const naoLidos = useMemo(
    () => (pronto ? idsNaoLidos(candidatos, vistos) : NENHUM),
    [pronto, candidatos, vistos],
  );

  /** Abrir o painel = ler tudo que está nele (não existe "marcar como lido" manual). */
  const marcarVistos = useCallback(() => {
    if (naoLidos.size === 0) return;
    const proximos = comVistos(vistos, candidatos);
    setVistos(proximos);
    salvar(proximos);
  }, [naoLidos, vistos, candidatos]);

  return { naoLidos, marcarVistos, pronto };
}
