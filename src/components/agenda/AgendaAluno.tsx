"use client";

import { useEffect, useMemo, useState } from "react";
import { eventosFuturos, itensDeHoje, montarSemana, proximoEvento } from "@/lib/agenda";
import { ASSINATURA_RODAPE, NOME_CURSO, NOME_TURMA, NOME_INST } from "@/lib/config";
import {
  addDias,
  fmtDiaMesPartes,
  hojeISO,
  horaAgora,
  rotuloSemana,
  segundaDaSemana,
} from "@/lib/dates";
import type { AulaFixa, Evento, Materia } from "@/lib/types";
import { MenuLateral } from "@/components/layout/MenuLateral";
import { Splash } from "@/components/layout/Splash";
import { FiltroMaterias } from "./FiltroMaterias";
import { GradeSemanaSlider } from "./GradeSemanaSlider";
import { HeroProximo } from "./HeroProximo";
import { HojeTimeline } from "./HojeTimeline";
import { SecaoRecolhivel } from "./SecaoRecolhivel";
import { TrocaSuave } from "./TrocaSuave";

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
  /** Liga/desliga no /admin: enquanto falsa, "Hoje" e a grade da semana
   *  mostram "Ainda não divulgado" em vez do horário. */
  gradeVisivel: boolean;
}

// "arraste" = a semana trocou por gesto (o próprio arraste já fez o
// assentamento), então o slider NÃO deve rodar a transição de botão por cima.
type DirecaoSemana = "inicial" | "prox" | "ant" | "arraste";

export function AgendaAluno({
  materias,
  grade,
  eventos,
  hojeInicial,
  agoraInicial,
  gradeVisivel,
}: Props) {
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [direcaoSemana, setDirecaoSemana] = useState<DirecaoSemana>("inicial");
  // "chegada em casa": marcada quando uma navegação TERMINA na semana atual —
  // o selo "hoje" acena uma vez depois do slide. Nunca na primeira carga.
  const [destaqueHoje, setDestaqueHoje] = useState(false);
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
  // Semanas vizinhas: alimentam o arraste (o trilho de 3 painéis do slider) sem
  // esperar troca de estado. São puras/baratas (montarSemana), então recalcular
  // a cada navegação não pesa.
  const semanaAnterior = useMemo(
    () => montarSemana(grade, eventos, addDias(segunda, -7)),
    [grade, eventos, segunda],
  );
  const semanaProxima = useMemo(
    () => montarSemana(grade, eventos, addDias(segunda, 7)),
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
      {/* overlay de abertura; mora aqui pra medir a topbar real (FLIP) */}
      <Splash hoje={hojeInicial} />
      <div className="topbar">
          <img src="/icon.svg" alt="Logo Classdays" className="logo" />
          <h1>Classdays</h1>
          {/* <p className={`head-sub dir-${direcaoSemana}`} key={segunda}>
            {rotuloSemana(semanaOffset)} · {ini.dia} {ini.mes} – {fim.dia} {fim.mes}
          </p> */}
        <MenuLateral />
      </div>
      <header className="head-row">
        <div>
          <p className="eyebrow">
          {NOME_CURSO} · {NOME_INST}
          </p>
          <p className="eyebrow2">{NOME_TURMA}</p>
        </div>
      </header>

      <SecaoRecolhivel id="hoje" titulo="Hoje">
        {gradeVisivel ? (
          <TrocaSuave chave={filtro}>
            <HojeTimeline
              itens={itensHoje}
              materiaDe={materiaDe}
              filtroAtivo={filtro !== null}
              agoraHHMM={agora.hhmm}
            />
          </TrocaSuave>
        ) : (
          <div className="hoje-vazio">Ainda não divulgado.</div>
        )}
      </SecaoRecolhivel>

      <SecaoRecolhivel id="filtro" titulo="Filtrar por matéria">
        <FiltroMaterias materias={materias} filtro={filtro} aoTrocar={setFiltro} />
      </SecaoRecolhivel>

      <SecaoRecolhivel id="proximo" titulo="Próximos eventos">
        <TrocaSuave chave={filtro}>
          <HeroProximo
            evento={proximo}
            proximos={futuros}
            materiaDe={materiaDe}
            hojeIso={agora.hoje}
            agoraHHMM={agora.hhmm}
            filtroAtivo={filtro !== null}
          />
        </TrocaSuave>
      </SecaoRecolhivel>

      <SecaoRecolhivel
        id="grade"
        titulo="Grade da semana"
        classeLabel="slabel-grade"
        classeCorpo="sec-grade"
        extra={
          semanaOffset !== 0 && (
            <button
              type="button"
              className="slabel-voltar"
              aria-label="Voltar à semana atual"
              onClick={() => {
                setDirecaoSemana(semanaOffset > 0 ? "ant" : "prox");
                setDestaqueHoje(true);
                setSemanaOffset(0);
              }}
            >
              {/* o glifo aponta pra onde a semana atual está: ‹‹ vindo do
                  futuro, ›› vindo do passado — mesma direção do slide */}
              {semanaOffset > 0 ? (
                <>
                  <span className="vg vg-esq" aria-hidden="true">
                    ‹‹
                  </span>{" "}
                  voltar
                </>
              ) : (
                <>
                  voltar{" "}
                  <span className="vg vg-dir" aria-hidden="true">
                    ››
                  </span>
                </>
              )}
            </button>
          )
        }
      >
        {gradeVisivel ? (
          <TrocaSuave chave={filtro}>
            <GradeSemanaSlider
              semana={semana}
              semanaAnterior={semanaAnterior}
              semanaProxima={semanaProxima}
              materiaDe={materiaDe}
              hojeIso={agora.hoje}
              filtro={filtro}
              direcao={direcaoSemana}
              marcarPassados={marcarPassados}
              destaqueHoje={destaqueHoje}
              onArrastar={(dir) => {
                const novo = semanaOffset + (dir === "prox" ? 1 : -1);
                setDirecaoSemana("arraste");
                setDestaqueHoje(novo === 0);
                setSemanaOffset(novo);
              }}
            />
          </TrocaSuave>
        ) : (
          <div className="hoje-vazio">Ainda não divulgado.</div>
        )}
      </SecaoRecolhivel>

      {/* A antiga seção "Próximos eventos" saiu daqui: o card "Próximo" acima
          abre o menu (ProximoDetalhe) que lista todos os eventos que vêm. */}

      <footer className="foot">
        <nav className="weeknav" aria-label="Navegar entre semanas">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => {
              setDirecaoSemana("ant");
              setDestaqueHoje(semanaOffset - 1 === 0);
              setSemanaOffset((s) => s - 1);
            }}
          >
            <span className="wn-glifo" aria-hidden="true">
              ‹
            </span>
          </button>
          <button
            type="button"
            className="today-btn"
            onClick={() => {
              setDirecaoSemana(semanaOffset > 0 ? "ant" : "prox");
              setDestaqueHoje(true);
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
              setDestaqueHoje(semanaOffset + 1 === 0);
              setSemanaOffset((s) => s + 1);
            }}
          >
            <span className="wn-glifo" aria-hidden="true">
              ›
            </span>
          </button>
        </nav>
        {ASSINATURA_RODAPE}
        <div className="credito">
          Classdays · por {" "}
          <span className="credito-ancora">
          <a
            className="credito-autor"
            href="https://github.com/matias-lucas"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub de Lucas Matias (abre em nova aba)"
          >
            Lucas Matias
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
          </a>
          <span className="credito-balao" aria-hidden="true">
              <svg viewBox="0 0 496 512" fill="currentColor">
                <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
              </svg>
              GitHub
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="balao-seta"
              >
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
