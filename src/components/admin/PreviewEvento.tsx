"use client";

import { COR_TURMA } from "@/components/ui/EventoLinha";
import { ehAusencia } from "@/lib/agenda";
import type { EventoParseado } from "@/lib/parser/tipos";
import type { EnfasePeriodo, Materia, TipoEvento } from "@/lib/types";
import { TIPOS_EVENTO } from "@/lib/types";

const ROTULO_ENFASE: Record<EnfasePeriodo, string> = {
  ambos: "Início e término",
  inicio: "Só o início",
  fim: "Só o término",
};

interface Props {
  evento: EventoParseado;
  materias: Materia[];
  origem: "claude" | "regras" | "manual" | "edicao";
  avisos: string[];
  salvando: boolean;
  aoEditar: (evento: EventoParseado) => void;
  aoConfirmar: () => void;
  aoDescartar: () => void;
}

const ROTULO_ORIGEM: Record<Props["origem"], string> = {
  claude: "interpretado pelo Claude",
  regras: "interpretado pelas regras locais",
  manual: "criação manual",
  edicao: "edição",
};

/**
 * O card de preview — a peça de segurança do input inteligente.
 *
 * Nada entra no banco sem passar por aqui: o admin vê o que foi entendido,
 * corrige qualquer campo no lugar e só então confirma. Errou tudo? Descarta.
 * O mesmo card serve de formulário para a criação manual.
 */
export function PreviewEvento({
  evento,
  materias,
  origem,
  avisos,
  salvando,
  aoEditar,
  aoConfirmar,
  aoDescartar,
}: Props) {
  const materia = materias.find((m) => m.id === evento.materia_id);
  const cor = materia?.cor ?? (evento.tipo === "cancelamento" ? "var(--ink-faint)" : COR_TURMA);
  const ehPeriodo = evento.data_fim !== null;
  const periodoInvalido =
    ehPeriodo && evento.data !== null && evento.data_fim !== null && evento.data_fim <= evento.data;
  const completo = evento.data !== null && evento.titulo.trim().length > 0 && !periodoInvalido;

  function muda<K extends keyof EventoParseado>(campo: K, valor: EventoParseado[K]) {
    aoEditar({ ...evento, [campo]: valor });
  }

  return (
    <div className="preview" style={{ "--sc": cor } as React.CSSProperties}>
      <div className="preview-topo">
        <span className="preview-origem">{ROTULO_ORIGEM[origem]}</span>
      </div>

      {avisos.length > 0 && (
        <div className="avisos" role="alert">
          {avisos.map((a) => (
            <span key={a}>⚠ {a}</span>
          ))}
        </div>
      )}

      <div className="preview-grid">
        <label className="campo">
          <span>Tipo</span>
          <select
            value={evento.tipo}
            onChange={(e) => muda("tipo", e.target.value as TipoEvento)}
          >
            {TIPOS_EVENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>
            {evento.tipo === "cancelamento"
              ? "Matéria (vazio = dia inteiro)"
              : "Matéria"}
          </span>
          <select
            value={evento.materia_id ?? ""}
            onChange={(e) => muda("materia_id", e.target.value || null)}
          >
            <option value="">— TODAS</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="campo col-2">
          <span>Título</span>
          <input
            type="text"
            value={evento.titulo}
            maxLength={120}
            onChange={(e) => muda("titulo", e.target.value)}
            placeholder="Como vai aparecer na agenda"
          />
        </label>

        <label className="campo">
          <span>Data</span>
          <input
            type="date"
            value={evento.data ?? ""}
            onChange={(e) => muda("data", e.target.value || null)}
            required
          />
        </label>

        <label className="campo">
          <span>Hora (opcional)</span>
          <input
            type="time"
            value={evento.hora ?? ""}
            onChange={(e) => muda("hora", e.target.value || null)}
          />
        </label>

        <label className="campo campo-check col-2">
          <input
            type="checkbox"
            checked={ehPeriodo}
            onChange={(e) =>
              muda("data_fim", e.target.checked ? (evento.data ?? "") : null)
            }
          />
          <span>É um período (vários dias)</span>
        </label>

        {ehPeriodo && (
          <label className="campo">
            <span>Data final</span>
            <input
              type="date"
              value={evento.data_fim ?? ""}
              min={evento.data ?? undefined}
              onChange={(e) => muda("data_fim", e.target.value || null)}
              aria-invalid={periodoInvalido}
              required
            />
            {periodoInvalido && (
              <span className="campo-erro">A data final precisa ser depois da inicial.</span>
            )}
          </label>
        )}

        {ehPeriodo && (
          <label className="campo">
            <span>Destaque no hero</span>
            <select
              value={evento.enfase}
              onChange={(e) => muda("enfase", e.target.value as EnfasePeriodo)}
            >
              {Object.entries(ROTULO_ENFASE).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* "este evento entra no LUGAR da aula" — a OLINFEG, uma semana de
            exames. Feriado e recesso derrubam sozinhos (regra de tipo), e
            cancelamento já É o mecanismo de tirar aula: nos dois casos a caixa
            não teria efeito nenhum, então não aparece. */}
        {evento.tipo !== "cancelamento" &&
          (ehAusencia(evento.tipo) ? (
            <p className="campo-nota col-2">
              {evento.tipo === "feriado" ? "Feriado" : "Recesso"} já derruba as
              aulas — não há o que marcar.
            </p>
          ) : (
            <>
              <label className="campo campo-check col-2">
                <input
                  type="checkbox"
                  checked={evento.suspende_aulas}
                  onChange={(e) => muda("suspende_aulas", e.target.checked)}
                />
                <span>Não haverá aula {ehPeriodo ? "nesses dias" : "nesse dia"}</span>
              </label>
              {evento.suspende_aulas && (
                <p className="campo-nota col-2">
                  {materia
                    ? `Derruba o dia inteiro na grade, não só a aula de ${materia.nome} — para tirar uma aula só, o tipo é "cancelamento".`
                    : "Na grade da semana, este evento aparece no lugar das aulas do dia."}
                </p>
              )}
            </>
          ))}

        <label className="campo col-2">
          <span>Observação (opcional)</span>
          <input
            type="text"
            value={evento.observacao ?? ""}
            maxLength={500}
            onChange={(e) => muda("observacao", e.target.value || null)}
            placeholder="Detalhe extra, sala, link…"
          />
        </label>
      </div>

      <div className="preview-acoes">
        <button
          type="button"
          className="btn btn-primario"
          onClick={aoConfirmar}
          disabled={!completo || salvando}
        >
          {salvando ? "Salvando…" : "Confirmar e salvar"}
        </button>
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={aoDescartar}
          disabled={salvando}
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
