import { Badge } from "@/components/Badge";
import { COR_TURMA } from "@/components/EventoLinha";
import type { ItemHoje } from "@/lib/agenda";
import { fmtHora } from "@/lib/dates";
import type { Materia } from "@/lib/types";

/** "HH:MM" → minutos desde 00:00, pra medir a distância até o início. */
function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

interface Props {
  itens: ItemHoje[];
  materiaDe: (id: string | null) => Materia | undefined;
  filtroAtivo: boolean;
  /** "agora" (HH:MM, fuso de Brasília) pra apagar o que já encerrou. */
  agoraHHMM: string;
}

/**
 * A timeline de "Hoje": o dia inteiro numa linha vertical, aula e evento na
 * mesma régua de horário — mas sem cards, só texto sobre o fundo (horário em
 * cima, título, depois sala/estado). Cada nó recebe a cor da matéria (`--sc`).
 * Eventos ganham selo pulsante (é o que exige olhar). O que já terminou fica
 * apagado com "encerrada" (o nó vira anel vazio) — o único uso de "agora" aqui;
 * não há marcador do momento nem cronômetro, disso cuida o card "Próximo".
 * Sem nada hoje, um estado vazio calmo.
 */
export function HojeTimeline({ itens, materiaDe, filtroAtivo, agoraHHMM }: Props) {
  if (itens.length === 0) {
    return (
      <div className="hoje-vazio" key={filtroAtivo ? "vazio-filtro" : "vazio-geral"}>
        {filtroAtivo
          ? "Nada dessa matéria hoje."
          : "Nada marcado pra hoje. Aproveite."}
      </div>
    );
  }

  return (
    <ol className="hoje">
      {itens.map((item, i) => {
        const materia = materiaDe(item.materia_id);
        const cor = materia?.cor ?? COR_TURMA;
        const ehAula = item.kind === "aula";
        // aula: o nome da matéria é o título. evento: o próprio título.
        const titulo = ehAula ? (materia?.nome ?? "Aula") : item.titulo;

        // horário: aula mostra o intervalo (19h00 – 20h40); evento é um
        // instante (só o horário), ou "dia todo" quando não tem hora.
        const quando = item.hora
          ? ehAula && item.hora_fim
            ? `${fmtHora(item.hora)} – ${fmtHora(item.hora_fim)}`
            : fmtHora(item.hora)
          : "dia todo";

        // "encerrada": a aula termina no hora_fim; o evento, no seu horário.
        // Sem horário (dia todo) não dá pra saber que passou → nunca encerra.
        const fimRef = ehAula ? item.hora_fim : item.hora;
        const encerrada = fimRef != null && fimRef < agoraHHMM;

        // "iminente": falta ≤1h pro início — o dot pulsa avisando que vem aí.
        // Itens "dia todo" (sem hora) nunca pulsam. agoraHHMM re-renderiza a
        // cada minuto (relógio no AgendaAluno), então isso liga/desliga sozinho.
        const iminente =
          item.hora != null &&
          !encerrada &&
          item.hora > agoraHHMM &&
          minutosDe(item.hora) - minutosDe(agoraHHMM) <= 60;

        // linha de baixo: aula = sala; evento = matéria (o contexto). "encerrada"
        // se junta no fim. (o professor saiu da timeline — vive no card Próximo.)
        const meta = [
          ehAula ? item.sala : (materia?.nome ?? "Turma"),
          encerrada ? "encerrada" : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <li
            className={`hoje-item ${ehAula ? "is-aula" : "is-evento"}${
              encerrada ? " is-passada" : ""
            }${iminente ? " is-iminente" : ""}`}
            key={`${item.kind}-${item.materia_id}-${item.hora}-${titulo}`}
            style={
              {
                "--sc": cor,
                "--i": Math.min(i, 8),
              } as React.CSSProperties
            }
          >
            <div className="hoje-node" aria-hidden="true">
              <span className="hoje-dot" />
            </div>
            <div className="hoje-corpo">
              <div className="hoje-quando">{quando}</div>
              <div className="hoje-title-row">
                <span className="hoje-title">{titulo}</span>
                {!ehAula && <Badge tipo={item.tipo!} />}
              </div>
              {meta && <div className="hoje-meta">{meta}</div>}
              {item.observacao && <p className="hoje-obs">{item.observacao}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
