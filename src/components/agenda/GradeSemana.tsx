import { Badge } from "@/components/Badge";
import type { DiaDaSemana } from "@/lib/agenda";
import { DIAS_LONGOS, diaSemanaDe, fmtDiaMes } from "@/lib/dates";
import type { Materia } from "@/lib/types";

interface Props {
  semana: DiaDaSemana[];
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  filtro: string | null;
}

/**
 * Segunda a sexta com as aulas fixas, já cruzadas com os cancelamentos:
 * dia inteiro cancelado vira um aviso único; aula cancelada aparece riscada
 * do fluxo (borda tracejada), não some — ausência também é informação.
 *
 * Componente só de apresentação: quem cuida da animação de troca de semana
 * é o GradeSemanaSlider, que renderiza duas destas lado a lado e desliza.
 */
export function GradeSemana({ semana, materiaDe, hojeIso, filtro }: Props) {
  return (
    <div className="grade-days">
      {semana.map((dia) => {
        const ehHoje = dia.data === hojeIso;
        const aulas = filtro
          ? dia.aulas.filter((a) => a.aula.materia_id === filtro)
          : dia.aulas;

        return (
          <section className={`day${ehHoje ? " is-today" : ""}`} key={dia.data}>
            <div className="day-head">
              <span className="day-name">{DIAS_LONGOS[diaSemanaDe(dia.data)]}</span>
              <span className="day-date">{fmtDiaMes(dia.data)}</span>
              {ehHoje && <span className="today-tag">hoje</span>}
            </div>

            {dia.cancelamentoDiaInteiro ? (
              <div className="noclass">
                <span aria-hidden="true">✕</span>
                <span>
                  <strong>Sem aula</strong>
                  {dia.cancelamentoDiaInteiro.observacao && (
                    <span className="motivo">
                      {" "}
                      — {dia.cancelamentoDiaInteiro.observacao}
                    </span>
                  )}
                </span>
              </div>
            ) : aulas.length === 0 ? (
              <p className="empty-day">{filtro ? "—" : "Sem aulas"}</p>
            ) : (
              aulas.map(({ aula, cancelamento, evento }) => {
                const materia = materiaDe(aula.materia_id);
                if (cancelamento) {
                  return (
                    <div className="noclass" key={aula.id}>
                      <span aria-hidden="true">✕</span>
                      <span>
                        <strong>{materia?.nome ?? aula.materia_id}</strong>{" "}
                        cancelada
                        {cancelamento.observacao && (
                          <span className="motivo"> — {cancelamento.observacao}</span>
                        )}
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                    className="class-card"
                    key={aula.id}
                    style={{ "--sc": materia?.cor } as React.CSSProperties}
                  >
                    <div className="cc-left">
                      <div className="cc-subj">
                        <span className="dot" />
                        {materia?.nome ?? aula.materia_id}
                        {evento && <Badge tipo={evento.tipo} />}
                      </div>
                      {materia?.prof && <div className="cc-prof">{materia.prof}</div>}
                    </div>
                    <div className="cc-right">
                      <div className="cc-time">
                        {aula.hora_ini}–{aula.hora_fim}
                      </div>
                      {aula.sala && <div className="cc-room">{aula.sala}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
