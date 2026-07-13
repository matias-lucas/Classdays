/**
 * Tema (claro/escuro) — a única configuração de aparência que vira ajuste real
 *
 * O tema resolvido mora no atributo `data-theme` do <html>. Um script de boot
 * inline (layout.tsx) grava esse atributo ANTES da primeira pintura, lendo a
 * escolha salva ou, na ausência dela, a preferência do sistema — assim não há
 * "flash" de tema claro antes do React montar. O CSS deriva a paleta só do
 * seletor `:root[data-theme="dark"]`.
 *
 * IMPORTANTE: a chave abaixo é repetida, hardcoded, dentro do script de boot em
 * layout.tsx (o script roda antes de qualquer módulo carregar, então não pode
 * importar daqui). Se mudar aqui, mude lá também.
 */

export type Tema = "light" | "dark";

export const THEME_KEY = "classdays-theme";

/** Breakpoint "desktop" do layout (grade vira quadro, weeknav aparece etc). */
export const DESKTOP_PX = 1000;
export const DESKTOP_MQ = `(min-width: ${DESKTOP_PX}px)`;

/** Cor da barra do navegador (meta theme-color) por tema. */
export const THEME_COLOR: Record<Tema, string> = {
  light: "#edf0f6",
  dark: "#0e1424",
};

/** Aplica o tema ao documento: atributo + cor da barra do navegador. Client-only. */
export function aplicarTema(tema: Tema) {
  const root = document.documentElement;
  root.dataset.theme = tema;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[tema]);
}

/** Lê o tema já resolvido no documento (o script de boot definiu data-theme). */
export function temaAtual(): Tema {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
