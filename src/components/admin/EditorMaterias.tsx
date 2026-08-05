"use client";

import { useState } from "react";
import { slugDeNome } from "@/lib/schemas/grade";
import type { EdicaoMateria, Materia } from "@/lib/types";

interface Props {
  materias: Materia[];
  erro: string | null;
  salvando: boolean;
  apagandoId: string | null;
  confirmaId: string | null;
  setConfirmaId: (id: string | null) => void;
  criar: (nova: Materia) => Promise<boolean>;
  editar: (id: string, campos: EdicaoMateria) => Promise<boolean>;
  apagar: (id: string) => Promise<void>;
}

interface FormState {
  id: string;
  nome: string;
  prof: string;
  cor: string;
}

// mesma paleta do DESIGN.md, atalhos rápidos ao lado do seletor de cor livre
const PALETA = ["#5457C5", "#12897E", "#C77A0E", "#C13F7A", "#7C4DBB"];

const FORM_VAZIO: FormState = { id: "", nome: "", prof: "", cor: PALETA[0] };

/**
 * Uma linha por matéria: ponto na cor, nome, professor, ✎ e ✕. "+ matéria"
 * abre uma linha nova com o id sugerido por slugDeNome (editável antes de
 * salvar). Edição e criação reaproveitam o mesmo formulário inline.
 */
export function EditorMaterias({
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
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [criandoAberta, setCriandoAberta] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);

  function abrirEdicao(m: Materia) {
    setCriandoAberta(false);
    setEditandoId(m.id);
    setForm({ id: m.id, nome: m.nome, prof: m.prof ?? "", cor: m.cor });
  }

  function abrirCriacao() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setCriandoAberta(true);
  }

  function fechar() {
    setEditandoId(null);
    setCriandoAberta(false);
  }

  function mudaNome(nome: string) {
    // o id só acompanha o nome enquanto a matéria ainda não existe
    setForm((f) => ({ ...f, nome, id: editandoId ? f.id : slugDeNome(nome) }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const campos: EdicaoMateria = {
      nome: form.nome.trim(),
      prof: form.prof.trim() || null,
      cor: form.cor,
    };
    const ok = editandoId ? await editar(editandoId, campos) : await criar({ id: form.id, ...campos });
    if (ok) fechar();
  }

  return (
    <section className="editor-secao" aria-labelledby="materias-titulo">
      <div className="editor-secao-topo">
        <h2 id="materias-titulo" className="slabel">
          Matérias ({materias.length})
        </h2>
        {!criandoAberta && (
          <button type="button" className="btn btn-fantasma btn-mini" onClick={abrirCriacao}>
            + matéria
          </button>
        )}
      </div>

      {erro && (
        <p className="msg-erro" style={{ marginBottom: 10 }}>
          {erro}
        </p>
      )}

      <ul className="lista-materias">
        {materias.map((m) =>
          editandoId === m.id ? (
            <li key={m.id} className="linha-materia linha-materia-form">
              <FormMateria
                form={form}
                setForm={setForm}
                onNome={mudaNome}
                onSalvar={salvar}
                onCancelar={fechar}
                salvando={salvando}
                ehNova={false}
              />
            </li>
          ) : (
            <li key={m.id} className="linha-materia">
              <span className="dot" style={{ "--sc": m.cor } as React.CSSProperties} />
              <span className="linha-materia-nome">{m.nome}</span>
              <span className="linha-materia-prof">{m.prof ?? "—"}</span>
              <div className="linha-materia-acoes">
                <button
                  type="button"
                  className="btn-editar"
                  aria-label={`Editar "${m.nome}"`}
                  onClick={() => abrirEdicao(m)}
                >
                  ✎
                </button>
                {confirmaId === m.id ? (
                  <span className="confirmar-exclusao">
                    apagar?
                    <button
                      type="button"
                      className="btn btn-perigo btn-mini"
                      onClick={() => apagar(m.id)}
                      disabled={apagandoId === m.id}
                    >
                      {apagandoId === m.id ? "…" : "sim"}
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
                    aria-label={`Apagar "${m.nome}"`}
                    onClick={() => setConfirmaId(m.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ),
        )}
        {criandoAberta && (
          <li className="linha-materia linha-materia-form">
            <FormMateria
              form={form}
              setForm={setForm}
              onNome={mudaNome}
              onSalvar={salvar}
              onCancelar={fechar}
              salvando={salvando}
              ehNova
            />
          </li>
        )}
      </ul>
    </section>
  );
}

function FormMateria({
  form,
  setForm,
  onNome,
  onSalvar,
  onCancelar,
  salvando,
  ehNova,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onNome: (nome: string) => void;
  onSalvar: (e: React.FormEvent) => void;
  onCancelar: () => void;
  salvando: boolean;
  ehNova: boolean;
}) {
  return (
    <form
      className="form-materia"
      onSubmit={onSalvar}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancelar();
      }}
    >
      <label className="campo">
        <span>Nome</span>
        <input
          type="text"
          value={form.nome}
          maxLength={60}
          minLength={2}
          required
          autoFocus
          onChange={(e) => onNome(e.target.value)}
        />
      </label>

      {ehNova && (
        <label className="campo">
          <span>Id</span>
          <input
            type="text"
            value={form.id}
            maxLength={16}
            required
            pattern="^[a-z][a-z0-9]{1,15}$"
            title="minúsculas e números, começando por letra"
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
          />
        </label>
      )}

      <label className="campo">
        <span>Professor(a)</span>
        <input
          type="text"
          value={form.prof}
          maxLength={60}
          placeholder="opcional"
          onChange={(e) => setForm((f) => ({ ...f, prof: e.target.value }))}
        />
      </label>

      <div className="campo">
        <span>Cor</span>
        <div className="cor-picker">
          <input
            type="color"
            value={form.cor}
            aria-label="Cor livre da matéria"
            onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
          />
          <div className="cor-atalhos">
            {PALETA.map((cor) => (
              <button
                key={cor}
                type="button"
                className="cor-atalho"
                style={{ "--sc": cor } as React.CSSProperties}
                aria-label={`Usar a cor ${cor}`}
                aria-pressed={form.cor.toLowerCase() === cor.toLowerCase()}
                onClick={() => setForm((f) => ({ ...f, cor }))}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="form-materia-acoes">
        <button type="submit" className="btn btn-primario btn-mini" disabled={salvando}>
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
