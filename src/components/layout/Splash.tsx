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

  const { dia, mes } = fmtDiaMesPartes(hoje);

  return (
    <div ref={raiz} className="splash" aria-hidden="true">
      {/* cópia inline do src/app/icon.svg — se o ícone mudar, mude aqui também */}
      <svg className="splash-logo" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#16203A" />
        <rect x="14" y="17" width="36" height="30" rx="7" fill="#EDF0F6" />
        <path
          d="M14 24 a7 7 0 0 1 7-7 v0 h-2 a5 5 0 0 0 -5 5 z"
          fill="#EDF0F6"
        />
        <rect className="sl-fita" x="14" y="17" width="6" height="30" rx="3" fill="#5457C5" />
        <rect className="sl-linha sl-linha1" x="26" y="25" width="17" height="4.5" rx="2.25" fill="#16203A" />
        <rect className="sl-linha sl-linha2" x="26" y="34" width="11" height="4.5" rx="2.25" fill="#525D75" />
      </svg>
      <div className="splash-nome">Classdays</div>
      <div className="splash-data">
        {DIAS_CURTOS[diaSemanaDe(hoje)]} · {dia} {mes}
      </div>
    </div>
  );
}
