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
      {/* cópia inline do ícone oficial (public/icon-grande.svg, fonte também do
          apple-icon/opengraph-image via scripts/generate-icons.mjs) — animável
          por dentro (as linhas "se escrevem", a fita desce). Se o desenho
          mudar, atualize os três: aqui, o .svg e rode o script de novo. */}
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 512 512" className="splash-logo">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1B2749"/>
            <stop offset="1" stopColor="#101830"/>
          </linearGradient>
          <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FBFCFF"/>
            <stop offset="1" stopColor="#DCE1EF"/>
          </linearGradient>
          <linearGradient id="spine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6B6EDA"/>
            <stop offset="0.55" stopColor="#5457C5"/>
            <stop offset="1" stopColor="#3E40A0"/>
          </linearGradient>
          <linearGradient id="pill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6B6EDA"/>
            <stop offset="1" stopColor="#4749B0"/>
          </linearGradient>
          <radialGradient id="gloss" cx="0.5" cy="0.1" r="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.10"/>
            <stop offset="0.6" stopColor="#ffffff" stopOpacity="0"/>
          </radialGradient>
          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="10"/>
            <feOffset dy="10" result="o"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.45"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      
        <rect width="512" height="512" rx="112" fill="url(#bg)"/>
        <rect width="512" height="512" rx="112" fill="url(#gloss)"/>
      
        <path d="M 128 64 H 416 Q 448 64 448 96 V 144 Q 448 168 424 168 H 256 Q 208 168 208 208 V 304 Q 208 344 256 344 H 424 Q 448 344 448 368 V 416 Q 448 448 416 448 H 128 Q 80 448 80 400 V 112 Q 80 64 128 64 Z"
              fill="#000000" opacity="0.28" transform="translate(0,16)" filter="url(#soft)"/>
      
        <path d="M 128 64 H 416 Q 448 64 448 96 V 144 Q 448 168 424 168 H 256 Q 208 168 208 208 V 304 Q 208 344 256 344 H 424 Q 448 344 448 368 V 416 Q 448 448 416 448 H 128 Q 80 448 80 400 V 112 Q 80 64 128 64 Z"
              fill="url(#page)"/>
        <path d="M 128 64 H 416 Q 448 64 448 96 V 104 Q 448 84 424 84 H 132 Q 96 84 96 120 V 400 Q 96 436 132 436 H 128 Q 80 448 80 400 V 112 Q 80 64 128 64 Z"
              fill="#ffffff" opacity="0.6"/>
      
        <line className="sl-linha sl-linha1" x1="248" y1="117" x2="400" y2="117" stroke="#ffffff" strokeWidth="19" strokeLinecap="round" opacity="0.5"/>
        <line className="sl-linha sl-linha1" x1="248" y1="116" x2="400" y2="116" stroke="#868E9E" strokeWidth="19" strokeLinecap="round"/>
        <line className="sl-linha sl-linha2" x1="248" y1="397" x2="352" y2="397" stroke="#ffffff" strokeWidth="19" strokeLinecap="round" opacity="0.5"/>
        <line className="sl-linha sl-linha2" x1="248" y1="396" x2="352" y2="396" stroke="#868E9E" strokeWidth="19" strokeLinecap="round"/>

        <path className="sl-fita" d="M 128 64 Q 80 64 80 112 V 400 Q 80 448 128 448 H 184 V 64 Z" fill="url(#spine)"/>
        <path className="sl-fita" d="M 128 64 Q 80 64 80 112 V 400 Q 80 448 128 448 H 132 V 64 Z" fill="#8487E0" opacity="0.55"/>
        <rect className="sl-fita" x="180" y="64" width="10" height="384" fill="#000000" opacity="0.16"/>
        <line className="sl-fita" x1="132" y1="120" x2="132" y2="392" stroke="#2C2E82" strokeWidth="9" strokeLinecap="round" opacity="0.85"/>
        <line className="sl-fita" x1="135" y1="120" x2="135" y2="392" stroke="#9C9FEC" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
      
        <rect x="256" y="224" width="128" height="64" rx="32" fill="#000000" opacity="0.22" transform="translate(0,6)"/>
        <rect x="256" y="224" width="128" height="64" rx="32" fill="url(#pill)"/>
        <rect x="256" y="224" width="128" height="30" rx="15" fill="#ffffff" opacity="0.14"/>
      </svg>
      <div className="splash-nome">Classdays</div>
      <div className="splash-data">
        {DIAS_CURTOS[diaSemanaDe(hoje)]} · {dia} {mes}
      </div>
    </div>
  );
}
