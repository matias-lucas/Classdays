import type { TipoEvento } from "@/lib/types";

/**
 * Selo de TIPO do evento. Regra de ouro do design (README, "Princípios"):
 * cor do selo = tipo (prova/trabalho/…), cor da matéria fica no filete/ponto.
 * Os dois códigos nunca se misturam.
 */
export function Badge({ tipo }: { tipo: TipoEvento | "aula" }) {
  return <span className={`badge ${tipo}`}>{tipo}</span>;
}
