"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EventoLinha } from "@/components/EventoLinha";
import { eventosFuturos, montarSemana, proximoItem } from "@/lib/agenda";
import { ASSINATURA_RODAPE, NOME_CURSO, NOME_TURMA } from "@/lib/config";
import {
  addDias,
  fmtDiaMesPartes,
  hojeISO,
  horaAgora,
  rotuloSemana,
  segundaDaSemana,
} from "@/lib/dates";
import type { AulaFixa, Evento, Materia } from "@/lib/types";
import { FiltroMaterias } from "./FiltroMaterias";
import { GradeSemanaSlider } from "./GradeSemanaSlider";
import { HeroProximo } from "./HeroProximo";

interface Props {
  materias: Materia[];
  grade: AulaFixa[];
  eventos: Evento[];
  /**
   * "Hoje" e "agora" vêm do SERVIDOR (fuso de Brasília) para que servidor e
   * navegador rendam a mesma tela (sem hydration mismatch). Depois de montado,
   * um relógio local atualiza a cada minuto — o card "Próximo" troca sozinho
   * quando a aula começa.
   */
  hojeInicial: string;
  agoraInicial: string;
}

type DirecaoSemana = "inicial" | "prox" | "ant";

export function AgendaAluno({ materias, grade, eventos, hojeInicial, agoraInicial }: Props) {
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [direcaoSemana, setDirecaoSemana] = useState<DirecaoSemana>("inicial");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [agora, setAgora] = useState({ hoje: hojeInicial, hhmm: agoraInicial });

  useEffect(() => {
    const id = setInterval(
      () => setAgora({ hoje: hojeISO(), hhmm: horaAgora() }),
      60_000,
    );
    return () => clearInterval(id);
  }, []);

  const porId = useMemo(
    () => new Map(materias.map((m) => [m.id, m])),
    [materias],
  );
  const materiaDe = (id: string | null) => (id ? porId.get(id) : undefined);

  const proximo = useMemo(
    () => proximoItem(grade, eventos, agora.hoje, agora.hhmm, filtro),
    [grade, eventos, agora, filtro],
  );

  const segunda = addDias(segundaDaSemana(agora.hoje), semanaOffset * 7);
  const semana = useMemo(
    () => montarSemana(grade, eventos, segunda),
    [grade, eventos, segunda],
  );
  // na semana atual, dias que já passaram só ocupam espaço — na semana
  // toda inteira (navegada de propósito) faz sentido ver tudo, passado incluso
  const semanaVisivel = useMemo(() => {
    if (semanaOffset !== 0) return semana;
    const restante = semana.filter((d) => d.data >= agora.hoje);
    return restante.length > 0 ? restante : semana; // fim de semana sem aula: mostra a semana toda
  }, [semana, semanaOffset, agora.hoje]);

  const futuros = useMemo(
    () => eventosFuturos(eventos, agora.hoje, filtro),
    [eventos, agora.hoje, filtro],
  );

  const ini = fmtDiaMesPartes(segunda);
  const fim = fmtDiaMesPartes(addDias(segunda, 6));

  return (
    <div className="wrap">
      <p className="eyebrow">
        {NOME_CURSO} · {NOME_TURMA}
      </p>
      <header className="head-row">
        <div>
          <h1>Agenda</h1>
          <p className={`head-sub dir-${direcaoSemana}`} key={segunda}>
            {rotuloSemana(semanaOffset)} · {ini.dia} {ini.mes} – {fim.dia} {fim.mes}
          </p>
        </div>
        <nav className="weeknav" aria-label="Navegar entre semanas">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => {
              setDirecaoSemana("ant");
              setSemanaOffset((s) => s - 1);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="today-btn"
            onClick={() => {
              setDirecaoSemana(semanaOffset > 0 ? "ant" : "prox");
              setSemanaOffset(0);
            }}
            disabled={semanaOffset === 0}
            title={semanaOffset === 0 ? "Você já está na semana atual" : "Voltar para a semana atual"}
            aria-current={semanaOffset === 0 ? "date" : undefined}
          >
            HOJE
          </button>
          <button
            type="button"
            aria-label="Próxima semana"
            onClick={() => {
              setDirecaoSemana("prox");
              setSemanaOffset((s) => s + 1);
            }}
          >
            ›
          </button>
        </nav>
      </header>

      <h2 className="slabel">Próximo</h2>
      <HeroProximo
        item={proximo}
        materiaDe={materiaDe}
        hojeIso={agora.hoje}
        filtroAtivo={filtro !== null}
      />

      <h2 className="slabel">Filtrar por matéria</h2>
      <FiltroMaterias materias={materias} filtro={filtro} aoTrocar={setFiltro} />

      <h2 className="slabel">Grade da semana</h2>
      <GradeSemanaSlider
        semana={semanaVisivel}
        materiaDe={materiaDe}
        hojeIso={agora.hoje}
        filtro={filtro}
        direcao={direcaoSemana}
      />

      <h2 className="slabel">Próximos eventos</h2>
      {/* key no filtro faz a lista re-nascer inteira ao trocar de matéria,
          pra todas as linhas visíveis entrarem juntas em cascata (ver .ev-entra) */}
      <div key={filtro ?? "todas"}>
        {futuros.length === 0 ? (
          <p className="empty-day">
            Nenhum evento marcado{filtro ? " pra essa matéria" : ""}.
          </p>
        ) : (
          futuros.map((e, i) => (
            <EventoLinha
              key={e.id}
              evento={e}
              materia={materiaDe(e.materia_id)}
              hojeIso={agora.hoje}
              indice={i}
            />
          ))
        )}
      </div>

      <footer className="foot">
        {ASSINATURA_RODAPE} · <Link href="/admin">admin</Link>
      </footer>
    </div>
  );
}
