"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useArrasteHorizontal } from "@/hooks/useArrasteHorizontal";
import type { DiaDaSemana } from "@/lib/agenda";
import { fmtDiaMesPartes, rotuloSemana, segundaDaSemana } from "@/lib/dates";
import type { Materia } from "@/lib/types";
import { DESKTOP_MQ } from "@/lib/theme";
import { GradeSemana } from "./GradeSemana";

interface Props {
  semana: DiaDaSemana[];
  /** Semanas vizinhas (offset −1 e +1) — só o arraste usa, pra montar o trilho. */
  semanaAnterior: DiaDaSemana[];
  semanaProxima: DiaDaSemana[];
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  filtro: string | null;
  /** Pra que lado o usuário navegou no tempo — decide o sentido do carrossel. */
  direcao: "inicial" | "prox" | "ant" | "arraste";
  /** Marcar os dias já passados (some no mobile, apaga no desktop). */
  marcarPassados: boolean;
  /**
   * "Chegada em casa": a navegação que trouxe esta semana terminou na semana
   * ATUAL — o selo "hoje" acena uma vez quando o painel monta.
   */
  destaqueHoje: boolean;
  /** Confirma a troca de semana feita por gesto (arraste horizontal). */
  onArrastar: (dir: "prox" | "ant") => void;
}

interface Transicao {
  saindo: DiaDaSemana[]; // a semana que estava na tela
  dir: "prox" | "ant";
  token: number; // muda a cada troca → remonta o trilho e reinicia a animação
}

const CHAVE_DICA = "classdays.gradeDicaVista";

const ehDesktop = () =>
  typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches;

const reduzMovimento = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * O carrossel da "Grade da semana", com duas formas de navegar:
 *
 * 1. **Botões ‹ › HOJE** → o slider mantém a semana que sai E a que entra lado a
 *    lado num trilho de largura dupla e desliza tudo de uma vez (avançar empurra
 *    pra esquerda; voltar, o inverso).
 * 2. **Arraste horizontal** (celular) → um trilho de 3 painéis
 *    [anterior][atual][próxima] segue o dedo; ao soltar depois de 64px, assenta
 *    na vizinha e confirma a troca. Puxar pra esquerda avança; pra direita volta.
 *    Trava de eixo garante que rolar a página na vertical continua funcionando.
 *
 * No desktop (quadro de horários) o arraste é desligado — o quadro fica intocado.
 *
 * Só a semana em foco depende de `hojeIso`/`filtro`; as demais são retratos.
 */
export function GradeSemanaSlider({
  semana,
  semanaAnterior,
  semanaProxima,
  materiaDe,
  hojeIso,
  filtro,
  direcao,
  marcarPassados,
  destaqueHoje,
  onArrastar,
}: Props) {
  const identidade = semana[0]?.data;
  const [transicao, setTransicao] = useState<Transicao | null>(null);
  const [dicaVisivel, setDicaVisivel] = useState(false);

  // refs guardam o que estava na tela ANTES desta renderização, pra montar a
  // semana "saindo" no instante em que a troca por BOTÃO é detectada.
  const semanaAnteriorRef = useRef(semana);
  const idAnterior = useRef(identidade);

  const viewportRef = useRef<HTMLDivElement>(null);

  // A máquina do gesto (trava de eixo, resistência, limiar) mora no hook;
  // aqui só entram o gatilho de habilitação e o que fazer quando confirma.
  const { arraste, finalizar, handlers } = useArrasteHorizontal({
    alvoRef: viewportRef,
    habilitado: () => !ehDesktop() && !transicao,
    aoConfirmar: (dir) => {
      // só some com a dica quando a troca se concretiza; um arraste que
      // volta não conta como descoberta do gesto.
      dispensarDica();
      onArrastar(dir);
    },
  });

  // --- Altura animada do viewport ------------------------------------------
  // As semanas têm alturas diferentes; sem isso, o que fica abaixo da grade
  // (o rodapé com ‹ › HOJE) pula duas vezes por troca: primeiro pra altura da
  // semana mais alta (o trilho contém as duas) e depois pra da que entrou.
  // Guardamos a altura "em repouso" e, durante a troca, animamos o viewport
  // dela até a altura do painel de destino, clipando o resto (overflow hidden).
  const alturaEstavel = useRef<number | null>(null);

  useLayoutEffect(() => {
    // `idAnterior !== identidade` = a semana acabou de trocar e a transição
    // ainda não montou: NÃO sobrescreve — a altura antiga é o "de" da animação.
    if (!transicao && !arraste && idAnterior.current === identidade) {
      alturaEstavel.current = viewportRef.current?.offsetHeight ?? null;
    }
  });

  // altura-alvo = painel de destino + padding vertical do viewport (box-border)
  const alturaAlvo = (painel: HTMLElement | null | undefined) => {
    const vp = viewportRef.current;
    if (!vp || !painel) return null;
    const cs = getComputedStyle(vp);
    return (
      painel.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
    );
  };

  // troca por BOTÃO: fixa a altura antiga e desliza até a nova junto do slide
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!transicao || !vp || reduzMovimento()) return;
    const entrando = vp.querySelector<HTMLElement>(".grade-panel:not([aria-hidden])");
    const de = alturaEstavel.current;
    const ate = alturaAlvo(entrando);
    if (de == null || ate == null || de === ate) return;
    vp.style.height = `${de}px`;
    vp.style.transition = "height 460ms cubic-bezier(0.22, 1, 0.36, 1)";
    requestAnimationFrame(() => {
      vp.style.height = `${ate}px`;
    });
    return () => {
      vp.style.height = "";
      vp.style.transition = "";
    };
  }, [transicao]);

  // ARRASTE: enquanto o dedo puxa, a altura fica congelada na da semana atual
  // (o trilho de 3 painéis herdaria a do mais alto); ao assentar, anima até a
  // altura do painel escolhido no mesmo ritmo do deslize.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    if (!arraste) {
      vp.style.height = "";
      vp.style.transition = "";
      return;
    }
    if (!arraste.assentando) {
      if (alturaEstavel.current != null) {
        vp.style.height = `${alturaEstavel.current}px`;
      }
      vp.style.transition = "";
      return;
    }
    const paineis = vp.querySelectorAll<HTMLElement>(".grade-panel");
    const alvo =
      arraste.assentando === "prox"
        ? paineis[2]
        : arraste.assentando === "ant"
          ? paineis[0]
          : paineis[1];
    const ate = alturaAlvo(alvo);
    if (ate == null) return;
    vp.style.transition = "height 480ms cubic-bezier(0.25, 1, 0.5, 1)";
    vp.style.height = `${ate}px`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arraste]);

  // --- Transição por BOTÃO -------------------------------------------------
  // useLayoutEffect (e não useEffect): monta o trilho ANTES da pintura, senão
  // a semana nova aparece um frame na altura final e o rodapé pisca.
  useLayoutEffect(() => {
    if (idAnterior.current !== identidade) {
      // Sem movimento, primeira carga, ou troca por ARRASTE (já assentou):
      // troca seca, sem o carrossel de botão.
      if (!reduzMovimento() && (direcao === "prox" || direcao === "ant")) {
        setTransicao((t) => ({
          saindo: semanaAnteriorRef.current,
          dir: direcao,
          token: (t?.token ?? 0) + 1,
        }));
      }
      idAnterior.current = identidade;
    }
    semanaAnteriorRef.current = semana;
  }, [identidade, semana, direcao]);

  // Rede de segurança: se o animationend não disparar (aba oculta, etc.),
  // limpa a transição mesmo assim, pra nunca ficar preso no trilho.
  useEffect(() => {
    if (!transicao) return;
    const t = setTimeout(() => setTransicao(null), 700);
    return () => clearTimeout(t);
  }, [transicao]);

  // --- Dica de descoberta -------------------------------------------------
  // Aparece só no toque e enquanto o usuário nunca arrastou. Começa oculta no
  // servidor (nada no primeiro render → sem divergência de hidratação) e é
  // revelada no cliente conforme o ambiente.
  useEffect(() => {
    if (ehDesktop()) return;
    const grosso = window.matchMedia("(pointer: coarse)").matches;
    if (!grosso) return;
    try {
      if (localStorage.getItem(CHAVE_DICA)) return;
    } catch {}
    setDicaVisivel(true);
  }, []);

  const dispensarDica = () => {
    setDicaVisivel(false);
    try {
      localStorage.setItem(CHAVE_DICA, "1");
    } catch {}
  };

  // --- Render -------------------------------------------------------------
  // Etiqueta que cada painel carrega: "esta semana · 14–18 jul". Viaja junto
  // no arraste, então a resposta de "que semana é essa?" está sempre colada na
  // grade que o dedo está puxando.
  const segDeHoje = segundaDaSemana(hojeIso);
  const etiqueta = (dias: DiaDaSemana[]) => {
    const seg = dias[0]?.data;
    const fim = dias[dias.length - 1]?.data;
    if (!seg || !fim) return null;
    // ISO "AAAA-MM-DD" parseia como UTC nos dois lados → a diferença é exata.
    const off = Math.round((Date.parse(seg) - Date.parse(segDeHoje)) / 604_800_000);
    const i = fmtDiaMesPartes(seg);
    const f = fmtDiaMesPartes(fim);
    const faixa =
      i.mes === f.mes ? `${i.dia}–${f.dia} ${i.mes}` : `${i.dia} ${i.mes} – ${f.dia} ${f.mes}`;
    return (
      <div className={`grade-etiqueta${off !== 0 ? " fora" : ""}`}>
        {rotuloSemana(off).toLowerCase()} · {faixa}
      </div>
    );
  };

  const painel = (
    dias: DiaDaSemana[],
    passados: boolean,
    escondido = false,
  ) => (
    // `panel-chegou` só no painel em foco: quem carrega o aceno do selo "hoje"
    // é a semana que ACABOU de chegar, nunca as vizinhas do trilho.
    <div
      className={`grade-panel${!escondido && destaqueHoje ? " panel-chegou" : ""}`}
      aria-hidden={escondido || undefined}
    >
      {etiqueta(dias)}
      <GradeSemana
        semana={dias}
        materiaDe={materiaDe}
        hojeIso={hojeIso}
        filtro={filtro}
        marcarPassados={passados}
      />
    </div>
  );

  let conteudo: React.ReactNode;

  if (arraste) {
    // Trilho de 3 painéis, base com a semana ATUAL centralizada. O trilho tem
    // width: 100% e cada painel flex-basis: 100% (transbordam de propósito),
    // então translateX(-100%) = exatamente 1 semana; o vão entre painéis
    // (`--vao-semanas`, o gap do flex) entra na conta explicitamente.
    const base = "translateX(calc(-100% - var(--vao-semanas)))";
    const estilo: React.CSSProperties =
      arraste.assentando === "prox"
        ? { transform: "translateX(calc(-200% - 2 * var(--vao-semanas)))" }
        : arraste.assentando === "ant"
          ? { transform: "translateX(0px)" }
          : arraste.assentando === "volta"
            ? { transform: base }
            : {
                transform: `translateX(calc(-100% - var(--vao-semanas) + ${arraste.dx}px))`,
              };

    conteudo = (
      <div
        className={`grade-rail${arraste.assentando ? " assentando" : ""}`}
        style={estilo}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && arraste.assentando) {
            finalizar(arraste.assentando);
          }
        }}
      >
        {painel(semanaAnterior, false, true)}
        {painel(semana, marcarPassados)}
        {painel(semanaProxima, false, true)}
      </div>
    );
  } else if (!transicao) {
    conteudo = painel(semana, marcarPassados);
  } else {
    // avançar: [sai, entra] e o trilho corre pra esquerda (0 → -50%)
    // voltar:  [entra, sai] e o trilho corre pra direita (-50% → 0)
    const avancando = transicao.dir === "prox";
    const saindo = painel(transicao.saindo, marcarPassados, true);
    const atual = painel(semana, marcarPassados);
    conteudo = (
      <div
        className={`grade-track ${avancando ? "to-prox" : "to-ant"}`}
        key={transicao.token}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setTransicao(null);
        }}
      >
        {avancando ? saindo : atual}
        {avancando ? atual : saindo}
      </div>
    );
  }

  return (
    <div
      className="grade-viewport"
      ref={viewportRef}
      {...handlers}
    >
      {conteudo}
      {dicaVisivel && (
        <div className="grade-dica" role="note">
          <span aria-hidden="true">‹</span>
          arraste para trocar de semana
          <span aria-hidden="true">›</span>
        </div>
      )}
    </div>
  );
}
