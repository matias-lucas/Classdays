"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

// Estado do gesto. `dx` é o quanto o dedo puxou (px, com resistência aplicada);
// `assentando` guarda pra onde o trilho está deslizando ao soltar.
interface Arraste {
  dx: number;
  assentando: "prox" | "ant" | "volta" | null;
}

const LIMIAR_TROCA = 64; // px pra confirmar a troca (o "snap threshold" do design)
const LIMIAR_EIXO = 8; // px pra decidir se o gesto é horizontal ou vertical
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
  const [arraste, setArraste] = useState<Arraste | null>(null);
  const [dicaVisivel, setDicaVisivel] = useState(false);

  // refs guardam o que estava na tela ANTES desta renderização, pra montar a
  // semana "saindo" no instante em que a troca por BOTÃO é detectada.
  const semanaAnteriorRef = useRef(semana);
  const idAnterior = useRef(identidade);

  const viewportRef = useRef<HTMLDivElement>(null);
  const gesto = useRef({
    ativo: false, // travou no eixo horizontal?
    avaliando: false, // dedo desceu, ainda decidindo o eixo
    pointerId: -1,
    x0: 0,
    y0: 0,
    largura: 0,
  });
  // evita confirmar a troca duas vezes (transitionend + timeout de segurança).
  const finalizado = useRef(false);

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

  // --- Gesto de arraste ---------------------------------------------------
  const podeArrastar = () => !ehDesktop() && !transicao;

  // resistência: segue o dedo 1:1 dentro de uma semana; ao passar disso, freia,
  // pra não dar pra "arremessar" várias semanas de uma vez.
  const comResistencia = (dx: number, largura: number) => {
    const max = largura || 320;
    if (Math.abs(dx) <= max) return dx;
    return Math.sign(dx) * (max + (Math.abs(dx) - max) * 0.2);
  };

  const finalizar = (dir: "prox" | "ant" | "volta") => {
    if (finalizado.current) return;
    finalizado.current = true;
    if (dir === "prox" || dir === "ant") {
      // só some com a dica quando a troca de semana se concretiza; um arraste
      // que volta ("volta") não conta como descoberta do gesto.
      dispensarDica();
      onArrastar(dir);
    }
    setArraste(null);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!podeArrastar() || e.pointerType === "mouse") return;
    const g = gesto.current;
    g.avaliando = true;
    g.ativo = false;
    g.pointerId = e.pointerId;
    g.x0 = e.clientX;
    g.y0 = e.clientY;
    g.largura = viewportRef.current?.clientWidth ?? 0;
    finalizado.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesto.current;
    if (g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;

    if (g.avaliando) {
      // ainda decidindo o eixo: horizontal → assume; vertical → deixa a página rolar
      if (Math.abs(dx) < LIMIAR_EIXO && Math.abs(dy) < LIMIAR_EIXO) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        g.avaliando = false;
        return;
      }
      g.avaliando = false;
      g.ativo = true;
      viewportRef.current?.setPointerCapture(e.pointerId);
    }
    if (!g.ativo) return;
    setArraste({ dx: comResistencia(dx, g.largura), assentando: null });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesto.current;
    if (g.pointerId !== e.pointerId) return;
    const foiAtivo = g.ativo;
    g.ativo = false;
    g.avaliando = false;
    g.pointerId = -1;
    if (!foiAtivo) return;

    const dx = e.clientX - g.x0;
    const dir: "prox" | "ant" | "volta" =
      dx <= -LIMIAR_TROCA ? "prox" : dx >= LIMIAR_TROCA ? "ant" : "volta";

    // Sem movimento: pula o assentamento e confirma/desfaz na hora.
    if (reduzMovimento()) {
      finalizar(dir);
      return;
    }
    setArraste((a) => (a ? { ...a, assentando: dir } : null));
  };

  // Rede de segurança do assentamento: se o transitionend não vier, finaliza.
  // Precisa ser MAIOR que a duração da transição no CSS (480ms), senão corta a
  // animação no meio.
  useEffect(() => {
    if (!arraste?.assentando) return;
    const dir = arraste.assentando;
    const t = setTimeout(() => finalizar(dir), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arraste?.assentando]);

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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
