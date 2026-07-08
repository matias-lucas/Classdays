"use client";

import { COR_TURMA } from "@/components/EventoLinha";
import type { EventoParseado } from "@/lib/parser/tipos";
import type { Materia, TipoEvento } from "@/lib/types";
import { TIPOS_EVENTO } from "@/lib/types";

interface Props {
  evento: EventoParseado;
  materias: Materia[];
  origem: "claude" | "regras" | "manual";
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
  const completo = evento.data !== null && evento.titulo.trim().length > 0;

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
