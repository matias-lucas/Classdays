import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { NOME_CURSO } from "@/lib/config";
import "./globals.css";

/**
 * As três vozes tipográficas do Classdays (ver DESIGN.md):
 * - Space Grotesk: títulos (display) — personalidade
 * - IBM Plex Sans: corpo e interface
 * - IBM Plex Mono: datas, horas, salas e rótulos — a identidade "software"
 *
 * next/font baixa as fontes no BUILD e serve do nosso domínio: sem pedir nada
 * ao Google em runtime e sem "pulo" de fonte no carregamento.
 */
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});
const corpo = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: `Classdays`,
  description:
    "Grade da semana, provas, entregas e cancelamentos da turma — sempre atualizado.",
};

export const viewport: Viewport = {
  themeColor: "#EDF0F6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${corpo.variable} ${mono.variable}`}
      // O script de boot abaixo grava data-theme no <html> antes da hidratação;
      // sem isto o React reclamaria da divergência com o HTML do servidor.
      suppressHydrationWarning
    >
      <body>
        {/* Resolve o tema ANTES da primeira pintura (escolha salva → sistema),
            pra não haver flash de tema claro. Roda como primeiro filho do body,
            então acontece antes do conteúdo ser pintado. A chave e as cores são
            as mesmas de src/lib/theme.ts (aqui hardcoded: o script roda antes de
            qualquer módulo carregar). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("classdays-theme");var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",d?"#0e1424":"#edf0f6");}catch(e){}})();`,
          }}
        />
        {/* Splash de entrada: decide ANTES da primeira pintura se aparece
            (1x por sessão; nunca com movimento reduzido). O atributo liga o
            overlay via CSS; o componente <Splash /> cuida da animação e de
            removê-lo. Qualquer erro → sem atributo → app normal. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(!sessionStorage.getItem("classdays-splash")&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.splash="on";}}catch(e){}})();`,
          }}
        />
        {/* Sem nenhum listener de touch, o Safari do iOS ignora :active
            no toque — os botões e chips ficariam "mudos" ao tocar. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener("touchstart", function(){}, {passive:true});`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
