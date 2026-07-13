"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Splash de entrada (1x por sessão): logo grande no centro com o nome abaixo;
 * depois de um instante, os dois viajam (FLIP) até as posições reais da topbar
 * enquanto o fundo do overlay some, revelando o conteúdo já carregado por trás.
 *
 * Quem decide se ele aparece é um script inline no layout (mesmo padrão
 * anti-flash do tema): antes da primeira pintura, `data-splash="on"` entra no
 * <html> se a sessão ainda não viu o splash e não há prefers-reduced-motion.
 * Sem o atributo, o overlay fica display:none — servidor e cliente rendem o
 * mesmo HTML sempre, sem hydration mismatch.
 *
 * FLIP: mede o retângulo da peça no centro e o do alvo na topbar e transiciona
 * um transform até lá — a animação é só transform/background, barata de pintar.
 */
export function Splash() {
  const [montado, setMontado] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;

    const fim = () => {
      delete html.dataset.splash;
      try {
        sessionStorage.setItem("classdays-splash", "1");
      } catch {
        // sessionStorage indisponível: o splash só vai repetir na próxima visita
      }
      setMontado(false);
    };

    if (html.dataset.splash !== "on") {
      setMontado(false);
      return;
    }

    const el = raiz.current;
    const logoAlvo = document.querySelector<HTMLElement>(".topbar .logo");
    const nomeAlvo = document.querySelector<HTMLElement>(".topbar h1");
    const logoSplash = el?.querySelector<HTMLElement>(".splash-logo");
    const nomeSplash = el?.querySelector<HTMLElement>(".splash-nome");
    if (!el || !logoAlvo || !nomeAlvo || !logoSplash || !nomeSplash) {
      fim();
      return;
    }

    let encerrado = false;
    const finalizar = () => {
      if (encerrado) return;
      encerrado = true;
      fim();
    };

    // centro da peça → centro do alvo, escalando pro tamanho dele
    const viajar = (peca: HTMLElement, alvo: HTMLElement) => {
      const a = peca.getBoundingClientRect();
      const b = alvo.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      peca.style.transform = `translate(${dx}px, ${dy}px) scale(${b.width / a.width})`;
    };

    const tParada = setTimeout(() => {
      el.classList.add("is-saindo");
      viajar(logoSplash, logoAlvo);
      viajar(nomeSplash, nomeAlvo);
    }, 700);

    // encerra quando o fundo do overlay terminou de sumir…
    const aoTransicionar = (ev: TransitionEvent) => {
      if (ev.target === el) finalizar();
    };
    el.addEventListener("transitionend", aoTransicionar);
    // …ou, aconteça o que acontecer, no timeout de segurança
    const tSeguranca = setTimeout(finalizar, 2500);

    return () => {
      clearTimeout(tParada);
      clearTimeout(tSeguranca);
      el.removeEventListener("transitionend", aoTransicionar);
    };
  }, []);

  if (!montado) return null;

  return (
    <div ref={raiz} className="splash" aria-hidden="true">
      <img className="splash-logo" src="/icon.svg" alt="" />
      <div className="splash-nome">Classdays</div>
    </div>
  );
}
