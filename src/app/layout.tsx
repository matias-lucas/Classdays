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
  title: `Agenda — ${NOME_CURSO}`,
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
    >
      <body>{children}</body>
    </html>
  );
}
