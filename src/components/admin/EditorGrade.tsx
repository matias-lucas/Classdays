"use client";

import { useState } from "react";
import type { AulaFixa, Materia, NovaAula } from "@/lib/types";

interface Props {
  grade: AulaFixa[];
  materias: Materia[];
  erro: string | null;
  salvando: boolean;
  apagandoId: number | null;
  confirmaId: number | null;
  setConfirmaId: (id: number | null) => void;
  criar: (nova: NovaAula) => Promise<boolean>;
  editar: (id: number, campos: NovaAula) => Promise<boolean>;
  apagar: (id: number) => Promise<void>;
}

interface FormState {
  materia_id: string;
  hora_ini: string;
  hora_fim: string;
  sala: string;
}

const DIAS: { numero: number; nome: string }[] = [
  { numero: 1, nome: "Segunda" },
  { numero: 2, nome: "Terça" },
  { numero: 3, nome: "Quarta" },
  { numero: 4, nome: "Quinta" },
  { numero: 5, nome: "Sexta" },
];

function formVazio(materias: Materia[]): FormState {
  return { materia_id: materias[0]?.id ?? "", hora_ini: "19:00", hora_fim: "20:40", sala: "" };
}

function horariosSobrepoem(a: { hora_ini: string; hora_fim: string }, b: { hora_ini: string; hora_fim: string }) {
  return a.hora_ini < b.hora_fim && b.hora_ini < a.hora_fim;
}

/** "sobrepõe Banco de Dados II (19:00–20:40)" — aviso discreto, não bloqueia. */
function avisoSobreposicao(
  grade: AulaFixa[],
  porId: Map<string, Materia>,
  candidata: { dia_semana: number; hora_ini: string; hora_fim: string },
  ignorarId?: number,
): string | null {
  if (!(candidata.hora_fim > candidata.hora_ini)) return null;
  const conflito = grade.find(
    (a) =>
      a.id !== ignorarId &&
      a.dia_semana === candidata.dia_semana &&
      horariosSobrepoem(a, candidata),
  );
  if (!conflito) return null;
  const nome = porId.get(conflito.materia_id)?.nome ?? conflito.materia_id;
  return `sobrepõe ${nome} (${conflito.hora_ini}–${conflito.hora_fim})`;
}

/**
 * Cinco blocos (Segunda…Sexta) com as aulas do dia, ordenadas por hora. Cada
 * linha tem ✎/✕; "+ aula" no rodapé do bloco abre o formulário inline
 * (nunca modal) já com o dia certo.
 */
export function EditorGrade({
  grade,
  materias,
  erro,
  salvando,
  apagandoId,
  confirmaId,
  setConfirmaId,
  criar,
  editar,
  apagar,
}: Props) {
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [diaNovo, setDiaNovo] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(formVazio(materias));

  const porId = new Map(materias.map((m) => [m.id, m]));

  function abrirEdicao(a: AulaFixa) {
    setDiaNovo(null);
    setEditandoId(a.id);
    setForm({ materia_id: a.materia_id, hora_ini: a.hora_ini, hora_fim: a.hora_fim, sala: a.sala ?? "" });
  }

  function abrirCriacao(dia: number) {
    setEditandoId(null);
    setForm(formVazio(materias));
    setDiaNovo(dia);
  }

  function fechar() {
    setEditandoId(null);
    setDiaNovo(null);
  }

  async function salvar(e: React.FormEvent, dia: number) {
    e.preventDefault();
    const campos: NovaAula = {
      materia_id: form.materia_id,
      dia_semana: dia,
      hora_ini: form.hora_ini,
      hora_fim: form.hora_fim,
      sala: form.sala.trim() || null,
    };
    const ok = editandoId ? await editar(editandoId, campos) : await criar(campos);
    if (ok) fechar();
  }

  return (
    <section className="editor-secao editor-secao-grade" aria-labelledby="grade-titulo">
      <div className="editor-secao-topo">
        <h2 id="grade-titulo" className="slabel">
          Grade fixa
        </h2>
      </div>

      {erro && (
        <p className="msg-erro" style={{ marginBottom: 10 }}>
          {erro}
        </p>
      )}

      {materias.length === 0 ? (
        <p className="empty-day">Cadastre uma matéria antes de montar a grade.</p>
      ) : (
        <div className="dias-grade">
          {DIAS.map(({ numero, nome }) => {
            const aulasDoDia = grade
              .filter((a) => a.dia_semana === numero)
              .sort((a, b) => a.hora_ini.localeCompare(b.hora_ini));

            return (
              <div key={numero} className="dia-bloco">
                <h3 className="dia-bloco-titulo">{nome}</h3>

                {aulasDoDia.length === 0 && diaNovo !== numero && (
                  <p className="empty-day empty-day-mini">sem aulas</p>
                )}

                <ul className="lista-aulas">
                  {aulasDoDia.map((a) =>
                    editandoId === a.id ? (
                      <li key={a.id} className="linha-aula linha-aula-form">
                        <FormAula
                          form={form}
                          setForm={setForm}
                          materias={materias}
                          onSalvar={(e) => salvar(e, numero)}
                          onCancelar={fechar}
                          salvando={salvando}
                          aviso={avisoSobreposicao(
                            grade,
                            porId,
                            { dia_semana: numero, hora_ini: form.hora_ini, hora_fim: form.hora_fim },
                            a.id,
                          )}
                        />
                      </li>
                    ) : (
                      <li key={a.id} className="linha-aula">
                        <span
                          className="dot"
                          style={{ "--sc": porId.get(a.materia_id)?.cor } as React.CSSProperties}
                        />
                        <div className="linha-aula-corpo">
                          <span className="linha-aula-materia">
                            {porId.get(a.materia_id)?.nome ?? a.materia_id}
                          </span>
                          <span className="linha-aula-horario">
                            {a.hora_ini}–{a.hora_fim}
                            {a.sala ? ` · ${a.sala}` : ""}
                          </span>
                        </div>
                        <div className="linha-aula-acoes">
                          <button
                            type="button"
                            className="btn-editar"
                            aria-label={`Editar aula de ${porId.get(a.materia_id)?.nome ?? a.materia_id}`}
                            onClick={() => abrirEdicao(a)}
                          >
                            ✎
                          </button>
                          {confirmaId === a.id ? (
                            <span className="confirmar-exclusao">
                              apagar?
                              <button
                                type="button"
                                className="btn btn-perigo btn-mini"
                                onClick={() => apagar(a.id)}
                                disabled={apagandoId === a.id}
                              >
                                {apagandoId === a.id ? "…" : "sim"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-fantasma btn-mini"
                                onClick={() => setConfirmaId(null)}
                              >
                                não
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-apagar"
                              aria-label={`Apagar aula de ${porId.get(a.materia_id)?.nome ?? a.materia_id}`}
                              onClick={() => setConfirmaId(a.id)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </li>
                    ),
                  )}
                  {diaNovo === numero && (
                    <li className="linha-aula linha-aula-form">
                      <FormAula
                        form={form}
                        setForm={setForm}
                        materias={materias}
                        onSalvar={(e) => salvar(e, numero)}
                        onCancelar={fechar}
                        salvando={salvando}
                        aviso={avisoSobreposicao(grade, porId, {
                          dia_semana: numero,
                          hora_ini: form.hora_ini,
                          hora_fim: form.hora_fim,
                        })}
                      />
                    </li>
                  )}
                </ul>

                {diaNovo !== numero && editandoId === null && (
                  <button
                    type="button"
                    className="btn btn-fantasma btn-mini btn-nova-aula"
                    onClick={() => abrirCriacao(numero)}
                  >
                    + aula
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FormAula({
  form,
  setForm,
  materias,
  onSalvar,
  onCancelar,
  salvando,
  aviso,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  materias: Materia[];
  onSalvar: (e: React.FormEvent) => void;
  onCancelar: () => void;
  salvando: boolean;
  aviso: string | null;
}) {
  return (
    <form
      className="form-aula"
      onSubmit={onSalvar}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancelar();
      }}
    >
      <label className="campo">
        <span>Matéria</span>
        <select
          value={form.materia_id}
          required
          autoFocus
          onChange={(e) => setForm((f) => ({ ...f, materia_id: e.target.value }))}
        >
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="campo">
        <span>Início</span>
        <input
          type="time"
          value={form.hora_ini}
          required
          onChange={(e) => setForm((f) => ({ ...f, hora_ini: e.target.value }))}
        />
      </label>

      <label className="campo">
        <span>Fim</span>
        <input
          type="time"
          value={form.hora_fim}
          required
          onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))}
        />
      </label>

      <label className="campo">
        <span>Sala</span>
        <input
          type="text"
          value={form.sala}
          maxLength={40}
          placeholder="opcional"
          onChange={(e) => setForm((f) => ({ ...f, sala: e.target.value }))}
        />
      </label>

      {form.hora_fim <= form.hora_ini && (
        <p className="msg-erro form-aula-msg">A hora de término precisa ser depois da de início.</p>
      )}
      {aviso && form.hora_fim > form.hora_ini && <p className="aviso-discreto">{aviso}</p>}

      <div className="form-aula-acoes">
        <button
          type="submit"
          className="btn btn-primario btn-mini"
          disabled={salvando || form.hora_fim <= form.hora_ini}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          className="btn btn-fantasma btn-mini"
          onClick={onCancelar}
          disabled={salvando}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
