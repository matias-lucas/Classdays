import { Badge } from "@/components/Badge";
import type { DiaDaSemana } from "@/lib/agenda";
import { DIAS_LONGOS, diaSemanaDe, faixaHorario, fmtDiaMes } from "@/lib/dates";
import type { Materia } from "@/lib/types";

interface Props {
  semana: DiaDaSemana[];
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  filtro: string | null;
  /** Marcar dias já passados da semana atual (some no mobile, apaga no desktop). */
  marcarPassados: boolean;
}

/**
 * Segunda a sexta com as aulas fixas, já cruzadas com os cancelamentos:
 * dia inteiro cancelado vira um aviso único; aula cancelada aparece riscada
 * do fluxo (borda tracejada), não some — ausência também é informação.
 *
 * Componente só de apresentação: quem cuida da animação de troca de semana
 * é o GradeSemanaSlider, que renderiza duas destas lado a lado e desliza.
 *
 * A `slot-*` em cada card marca em qual horário da noite a aula cai (cedo /
 * tarde / a noite inteira). No mobile não muda nada; no desktop (quadro de
 * horários) o CSS usa isso pra alinhar as colunas em 2 linhas — aula da noite
 * inteira ocupa as duas, deixando todas as colunas na mesma altura.
 */
export function GradeSemana({ semana, materiaDe, hojeIso, filtro, marcarPassados }: Props) {
  return (
    <div className="grade-days">
      {semana.map((dia) => {
        const ehHoje = dia.data === hojeIso;
        const passou = marcarPassados && dia.data < hojeIso;
        const aulas = filtro
          ? dia.aulas.filter((a) => a.aula.materia_id === filtro)
          : dia.aulas;

        const classesDia = [
          "day",
          ehHoje ? "is-today" : "",
          passou ? "passou" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <section className={classesDia} key={dia.data}>
            <div className="day-head">
              <span className="day-name">{DIAS_LONGOS[diaSemanaDe(dia.data)]}</span>
              <span className="day-date">{fmtDiaMes(dia.data)}</span>
              {ehHoje && <span className="today-tag">hoje</span>}
            </div>

            <div className="day-classes">
              {dia.cancelamentoDiaInteiro ? (
                <div className="noclass slot-full">
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
                  const slot = `slot-${faixaHorario(aula.hora_ini, aula.hora_fim)}`;
                  if (cancelamento) {
                    return (
                      <div className={`noclass ${slot}`} key={aula.id}>
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
                      className={`class-card ${slot}`}
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
            </div>
          </section>
        );
      })}
    </div>
  );
}
