"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Amortecedor de troca de conteúdo: quando `chave` muda (ex.: o filtro de
 * matéria), o conteúdo novo já entra no DOM, mas a ALTURA do bloco anima do
 * valor antigo para o novo em vez de saltar — o resto da página desce/sobe
 * suave, na mesma linguagem do colapso de seções (280ms, --ease). Junto vai
 * um fade-in curto do conteúdo novo, para a troca não parecer um corte.
 *
 * Por que Web Animations API e não transition: `height: auto` não é animável
 * em CSS; aqui medimos a altura antes e depois da troca (FLIP de altura) e
 * animamos entre os dois pixels. O overflow fica escondido só durante a
 * animação (classe .troca-anim), senão cortaria sombras dos cards.
 *
 * A altura "antes" vem de um layout effect SEM deps: ele roda a cada render,
 * então o valor guardado no render anterior é a altura pré-troca — no render
 * em que `chave` mudou, o DOM já tem o conteúdo novo e `offsetHeight` é o
 * destino.
 */
interface Props {
  /** Valor que, ao mudar, dispara a animação (ex.: o id do filtro ativo). */
  chave: string | null;
  children: ReactNode;
}

export function TrocaSuave({ chave, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const alturaAnterior = useRef<number | null>(null);
  const chaveAnterior = useRef(chave);
  const animacao = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (chaveAnterior.current !== chave) {
      chaveAnterior.current = chave;
      const de = alturaAnterior.current;
      // se uma troca anterior ainda está no ar, encerra e mede o destino real
      animacao.current?.finish();
      const para = el.offsetHeight;
      const semMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!semMotion && de !== null && de !== para) {
        el.classList.add("troca-anim");
        const anim = el.animate(
          [
            { height: `${de}px`, opacity: 0.25 },
            { height: `${para}px`, opacity: 1 },
          ],
          { duration: 280, easing: "cubic-bezier(0.22, 0.7, 0.3, 1)" },
        );
        animacao.current = anim;
        const limpar = () => {
          el.classList.remove("troca-anim");
          animacao.current = null;
        };
        anim.onfinish = limpar;
        anim.oncancel = limpar;
      }
      alturaAnterior.current = para;
      return;
    }

    // render sem troca (relógio, semana etc.): só mantém a medida fresca,
    // sem sobrescrever com a altura intermediária de uma animação no ar
    if (!animacao.current) alturaAnterior.current = el.offsetHeight;
  });

  return (
    <div ref={ref} className="troca-suave">
      {children}
    </div>
  );
}
