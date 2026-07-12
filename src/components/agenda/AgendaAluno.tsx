"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { eventosFuturos, itensDeHoje, montarSemana, proximoEvento } from "@/lib/agenda";
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
import { MenuLateral } from "@/components/MenuLateral";
import { FiltroMaterias } from "./FiltroMaterias";
import { GradeSemanaSlider } from "./GradeSemanaSlider";
import { HeroProximo } from "./HeroProximo";
import { HojeTimeline } from "./HojeTimeline";

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

  // O "Próximo" mostra só EVENTOS (nunca aula/cancelamento) — vira o gatilho do
  // menu de próximos eventos (1b).
  const proximo = useMemo(
    () => proximoEvento(eventos, agora.hoje, agora.hhmm, filtro),
    [eventos, agora, filtro],
  );

  // A timeline de hoje não depende de "agora" (mostra o dia inteiro, sem
  // marcador do momento), só da data — por isso só recalcula ao virar o dia.
  const itensHoje = useMemo(
    () => itensDeHoje(grade, eventos, agora.hoje, filtro),
    [grade, eventos, agora.hoje, filtro],
  );

  const segunda = addDias(segundaDaSemana(agora.hoje), semanaOffset * 7);
  const semana = useMemo(
    () => montarSemana(grade, eventos, segunda),
    [grade, eventos, segunda],
  );
  // Dias já passados da semana ATUAL viram "passados": no celular somem da
  // grade (a gente cruza no corredor querendo o que falta); no desktop ficam
  // apagados, pra grade seguir com as 5 colunas e não abrir buracos.
  // Só marcamos se ainda sobrou algum dia à frente (num sábado, todas as aulas
  // já passaram → não faz sentido esconder tudo, mostra a semana inteira).
  // Semanas navegadas de propósito nunca escondem nada.
  const marcarPassados = useMemo(
    () => semanaOffset === 0 && semana.some((d) => d.data >= agora.hoje),
    [semana, semanaOffset, agora.hoje],
  );

  const futuros = useMemo(
    () => eventosFuturos(eventos, agora.hoje, filtro),
    [eventos, agora.hoje, filtro],
  );

  const ini = fmtDiaMesPartes(segunda);
  const fim = fmtDiaMesPartes(addDias(segunda, 6));

  return (
    <div className="wrap">
      <div className="topbar">
        <p className="eyebrow">
          {NOME_CURSO} · {NOME_TURMA}
        </p>
        <MenuLateral />
      </div>
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

      <h2 className="slabel">Hoje</h2>
      <HojeTimeline
        itens={itensHoje}
        materiaDe={materiaDe}
        filtroAtivo={filtro !== null}
        agoraHHMM={agora.hhmm}
      />

      <h2 className="slabel">Filtrar por matéria</h2>
      <FiltroMaterias materias={materias} filtro={filtro} aoTrocar={setFiltro} />

      <h2 className="slabel">Próximo</h2>
      <HeroProximo
        evento={proximo}
        proximos={futuros}
        materiaDe={materiaDe}
        hojeIso={agora.hoje}
        agoraHHMM={agora.hhmm}
        filtroAtivo={filtro !== null}
      />

      <h2 className="slabel slabel-grade">Grade da semana</h2>
      <GradeSemanaSlider
        semana={semana}
        materiaDe={materiaDe}
        hojeIso={agora.hoje}
        filtro={filtro}
        direcao={direcaoSemana}
        marcarPassados={marcarPassados}
      />

      {/* A antiga seção "Próximos eventos" saiu daqui: o card "Próximo" acima
          abre o menu (ProximoDetalhe) que lista todos os eventos que vêm. */}

      <footer className="foot">
        {ASSINATURA_RODAPE} · <Link href="/admin">/admin</Link>
      </footer>
    </div>
  );
}
