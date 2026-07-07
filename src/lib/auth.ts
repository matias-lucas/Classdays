import { createHmac, createHash, timingSafeEqual } from "node:crypto";

/**
 * Autenticação do admin — o mínimo que faz o serviço direito.
 *
 * Só existe UM admin (o representante), então nada de tabela de usuários:
 * uma senha em variável de ambiente (ADMIN_PASSWORD) e um cookie assinado.
 *
 * Como funciona:
 * - login certo → gravamos no cookie um "carimbo" = HMAC-SHA256 derivado da
 *   senha. HMAC é uma assinatura: só quem conhece a senha consegue produzi-la.
 * - a cada request protegida, recalculamos o carimbo e comparamos com o do
 *   cookie. Bate → é o admin. Sem sessão em banco, sem estado no servidor.
 * - trocar a senha invalida todas as sessões na hora (o carimbo muda).
 *
 * O cookie é httpOnly (JavaScript da página não o lê — proteção contra XSS)
 * e as comparações são em tempo constante (timingSafeEqual) para não vazar
 * informação pela demora da resposta.
 */

export const COOKIE_SESSAO = "classdays_admin";
export const SESSAO_DIAS = 30;

function senhaConfigurada(): string | null {
  const s = process.env.ADMIN_PASSWORD;
  return s && s.length >= 6 ? s : null;
}

export function autenticacaoConfigurada(): boolean {
  return senhaConfigurada() !== null;
}

/** O carimbo que vai no cookie após o login. */
export function tokenDeSessao(): string {
  const senha = senhaConfigurada();
  if (!senha) throw new Error("ADMIN_PASSWORD não configurada no .env.local");
  return createHmac("sha256", senha).update("classdays-admin-sessao-v1").digest("hex");
}

/** Compara strings sem vazar tempo (hash primeiro iguala os comprimentos). */
function igualSeguro(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function senhaCorreta(tentativa: string): boolean {
  const senha = senhaConfigurada();
  return senha !== null && igualSeguro(tentativa, senha);
}

export function sessaoValida(valorCookie: string | undefined | null): boolean {
  if (!valorCookie || !autenticacaoConfigurada()) return false;
  return igualSeguro(valorCookie, tokenDeSessao());
}
