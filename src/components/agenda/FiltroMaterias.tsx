import type { Materia } from "@/lib/types";

interface Props {
  materias: Materia[];
  filtro: string | null;
  aoTrocar: (id: string | null) => void;
}

/**
 * Chips roláveis de filtro por matéria. O chip ativo inverte (fundo navy),
 * e `aria-pressed` conta o estado para leitores de tela.
 */
export function FiltroMaterias({ materias, filtro, aoTrocar }: Props) {
  return (
    <div className="filters" role="group" aria-label="Filtrar por matéria">
      <button
        type="button"
        className={`chip${filtro === null ? " on" : ""}`}
        aria-pressed={filtro === null}
        onClick={() => aoTrocar(null)}
      >
        Todas
      </button>
      {materias.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`chip${filtro === m.id ? " on" : ""}`}
          aria-pressed={filtro === m.id}
          onClick={() => aoTrocar(filtro === m.id ? null : m.id)}
        >
          <span className="dot" style={{ background: m.cor }} />
          {m.nome}
        </button>
      ))}
    </div>
  );
}
