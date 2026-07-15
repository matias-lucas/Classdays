"use client";

import { useEffect, useRef, useState } from "react";
import { DIAS_CURTOS, diaSemanaDe, fmtDiaMesPartes } from "@/lib/dates";

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
 *
 * O logo aqui é o MESMO desenho do icon.svg, só que inline: dá pra animar as
 * peças por dentro (as linhas do papel "se escrevem", a fita desce) — o
 * calendário se preenchendo antes de viajar pra topbar. E a data de hoje em
 * mono aparece sob o nome: o splash já responde a primeira pergunta do app.
 */
interface Props {
  /** ISO de hoje vindo do SERVIDOR (mesmo padrão anti-hydration da agenda). */
  hoje: string;
}

export function Splash({ hoje }: Props) {
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

    // espera o calendário se preencher, a data entrar (680ms) e a piscada do
    // logo terminar (680 + 520 = 1200ms) antes de mandar as peças pra topbar
    const tParada = setTimeout(() => {
      el.classList.add("is-saindo");
      viajar(logoSplash, logoAlvo);
      viajar(nomeSplash, nomeAlvo);
    }, 1350);

    // encerra quando o fundo do overlay terminou de sumir…
    const aoTransicionar = (ev: TransitionEvent) => {
      if (ev.target === el) finalizar();
    };
    el.addEventListener("transitionend", aoTransicionar);
    // …ou, aconteça o que acontecer, no timeout de segurança
    const tSeguranca = setTimeout(finalizar, 3200);

    return () => {
      clearTimeout(tParada);
      clearTimeout(tSeguranca);
      el.removeEventListener("transitionend", aoTransicionar);
    };
  }, []);

  if (!montado) return null;

  const { dia, mes } = fmtDiaMesPartes(hoje);

  return (
    <div ref={raiz} className="splash" aria-hidden="true">
      {/* cópia inline do src/app/icon.svg — se o ícone mudar, mude aqui também */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width="128"
        height="128"
        className="splash-logo"
      >
        <rect width="512" height="512" rx="112" fill="#16203A"/>
        <rect x="80" y="64" width="368" height="384" rx="48" fill="#101830"/>
        <path d="M 128 64 H 416 Q 448 64 448 96 V 144 Q 448 176 416 176 H 264 Q 224 176 224 216 V 296 Q 224 336 264 336 H 416 Q 448 336 448 368 V 416 Q 448 448 416 448 H 128 Q 80 448 80 400 V 112 Q 80 64 128 64 Z" fill="#EDF0F6"/>
        <path d="M 128 64 H 416 Q 448 64 448 96 V 104 Q 448 84 424 84 H 132 Q 96 84 96 120 V 400 Q 96 436 132 436 H 128 Q 80 448 80 400 V 112 Q 80 64 128 64 Z" fill="#DDE2EE"/>
        <path d="M 128 64 Q 80 64 80 112 V 400 Q 80 448 128 448 H 136 V 64 Z" fill="#5457C5"/>
        <g>
          <circle cx="108" cy="120" r="18" fill="#EDF0F6"/><circle cx="108" cy="120" r="9" fill="#16203A"/><circle cx="104" cy="116" r="3" fill="#8B8EDB"/>
          <circle cx="108" cy="256" r="18" fill="#EDF0F6"/><circle cx="108" cy="256" r="9" fill="#16203A"/><circle cx="104" cy="252" r="3" fill="#8B8EDB"/>
          <circle cx="108" cy="392" r="18" fill="#EDF0F6"/><circle cx="108" cy="392" r="9" fill="#16203A"/><circle cx="104" cy="388" r="3" fill="#8B8EDB"/>
        </g>
        <line x1="240" y1="120" x2="400" y2="120" stroke="#16203A" strokeWidth="24" strokeLinecap="round" opacity="0.8"/>
        <line x1="240" y1="392" x2="352" y2="392" stroke="#16203A" strokeWidth="24" strokeLinecap="round" opacity="0.45"/>
        <rect x="264" y="228" width="120" height="56" rx="28" fill="#5457C5"/>
        <rect x="264" y="228" width="120" height="56" rx="28" fill="none" stroke="#3F41A0" strokeWidth="3"/>
        <line x1="286" y1="256" x2="330" y2="256" stroke="#EDF0F6" strokeWidth="12" strokeLinecap="round"/>
      </svg>
      <div className="splash-nome">Classdays</div>
      <div className="splash-data">
        {DIAS_CURTOS[diaSemanaDe(hoje)]} · {dia} {mes}
      </div>
    </div>
  );
}
