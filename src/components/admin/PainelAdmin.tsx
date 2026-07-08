"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { EventoLinha } from "@/components/EventoLinha";
import type { EventoParseado, ResultadoParse } from "@/lib/parser/tipos";
import type { Evento, Materia } from "@/lib/types";
import { PreviewEvento } from "./PreviewEvento";

interface Props {
  materias: Materia[];
  eventos: Evento[];
  hojeIso: string;
  backend: "supabase" | "local";
  claudeAtivo: boolean;
}

const EXEMPLOS = [
  "dia 13/07 haverá prova de álgebra linear",
  "na próxima terça não haverá aula",
  "entrega do projeto de banco de dados sexta que vem às 23h59",
];

interface Rascunho {
  evento: EventoParseado;
  origem: "claude" | "regras" | "manual";
  avisos: string[];
}

const EVENTO_VAZIO: EventoParseado = {
  tipo: "evento",
  titulo: "",
  materia_id: null,
  data: null,
  hora: null,
  observacao: null,
};

/**
 * O painel do representante. Fluxo:
 * frase → /api/parse → card de preview EDITÁVEL → confirmar → /api/eventos.
 * Depois de salvar (ou apagar), router.refresh() pede a página de novo ao
 * servidor — a lista abaixo é sempre o retrato real do banco.
 */
export function PainelAdmin({ materias, eventos, hojeIso, backend, claudeAtivo }: Props) {
  const router = useRouter();
  const areaFrase = useRef<HTMLTextAreaElement>(null);

  const [frase, setFrase] = useState("");
  const [interpretando, setInterpretando] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; texto: string } | null>(null);
  const [apagandoId, setApagandoId] = useState<number | null>(null);
  const [confirmaId, setConfirmaId] = useState<number | null>(null);

  const porId = useMemo(() => new Map(materias.map((m) => [m.id, m])), [materias]);

  const futuros = eventos.filter((e) => e.data >= hojeIso);
  const passados = eventos.filter((e) => e.data < hojeIso).reverse();

  async function interpretar(e: React.FormEvent) {
    e.preventDefault();
    setInterpretando(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frase }),
      });
      const corpo = await r.json().catch(() => null);
      if (!r.ok) {
        setFeedback({ ok: false, texto: corpo?.erro ?? "Não consegui interpretar." });
        return;
      }
      const resultado = corpo as ResultadoParse;
      setRascunho({
        evento: resultado.evento,
        origem: resultado.origem,
        avisos: resultado.avisos,
      });
    } catch {
      setFeedback({ ok: false, texto: "Sem conexão com o servidor." });
    } finally {
      setInterpretando(false);
    }
  }

  async function salvar() {
    if (!rascunho) return;
    setSalvando(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rascunho.evento),
      });
      const corpo = await r.json().catch(() => null);
      if (!r.ok) {
        setFeedback({ ok: false, texto: corpo?.erro ?? "Não consegui salvar." });
        return;
      }
      setRascunho(null);
      setFrase("");
      setFeedback({ ok: true, texto: "Evento salvo — já está na agenda da turma." });
      router.refresh(); // re-busca os dados do servidor (lista abaixo atualiza)
    } catch {
      setFeedback({ ok: false, texto: "Sem conexão com o servidor." });
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(id: number) {
    setApagandoId(id);
    try {
      const r = await fetch(`/api/eventos/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const corpo = await r.json().catch(() => null);
        setFeedback({ ok: false, texto: corpo?.erro ?? "Não consegui apagar." });
        return;
      }
      setConfirmaId(null);
      router.refresh();
    } finally {
      setApagandoId(null);
    }
  }

  async function sair() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  function usarExemplo(texto: string) {
    setFrase(texto);
    areaFrase.current?.focus();
  }

  return (
    <div className="wrap">
      <p className="eyebrow">Classdays · Admin</p>
      <header className="admin-topo">
        <h1>Painel</h1>
        <div className="admin-meta">
          <span
            className="tag-backend"
            title={
              backend === "supabase"
                ? "Dados salvos no Supabase"
                : "Banco local de desenvolvimento (data/db.json)"
            }
          >
            dados: {backend}
          </span>
          <button type="button" className="btn btn-fantasma btn-mini" onClick={sair}>
            SAIR
          </button>
        </div>
      </header>
      <p className="head-sub" style={{ marginBottom: 18 }}>
        {claudeAtivo
          ? "Manutenção dos eventos — Interpretação por IA"
          : "Manutenção dos eventos — Interpretação por regras locais"}
      </p>

      <form className="frase-form" onSubmit={interpretar}>
        <label className="campo">
          <span>CADASTRAR EVENTOS · INPUT: </span>
          <textarea
            ref={areaFrase}
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            placeholder={"Digite o que acontecerá..."}
            maxLength={118}
            rows={2}
            autoFocus
          />
        </label>
        {/* <p className="frase-dicas">
          exemplos:{" "}
          {EXEMPLOS.map((ex, i) => (
            <span key={ex}>
              {i > 0 && " · "}
              <button type="button">
                “{ex}”
              </button>
            </span>
          ))}
        </p> */}
        <div className="frase-acoes">
          <button
            type="submit"
            className="btn btn-primario"
            disabled={interpretando || frase.trim().length < 3}
          >
            {interpretando ? "Interpretando…" : "Processar"}
          </button>
          <button
            type="button"
            className="link-discreto"
            onClick={() =>
              setRascunho({ evento: EVENTO_VAZIO, origem: "manual", avisos: [] })
            }
          >
            ✎ Inserir manualmente
          </button>
        </div>
      </form>

      {feedback && (
        <p
          className={feedback.ok ? "msg-ok" : "msg-erro"}
          style={{ marginTop: 12 }}
          role="status"
        >
          {feedback.ok ? "✓ " : ""}
          {feedback.texto}
        </p>
      )}

      {rascunho && (
        <PreviewEvento
          evento={rascunho.evento}
          materias={materias}
          origem={rascunho.origem}
          avisos={rascunho.avisos}
          salvando={salvando}
          aoEditar={(evento) => setRascunho({ ...rascunho, evento })}
          aoConfirmar={salvar}
          aoDescartar={() => setRascunho(null)}
        />
      )}

      <h2 className="slabel">Próximos eventos ({futuros.length})</h2>
      {futuros.length === 0 ? (
        <p className="empty-day">Nada cadastrado daqui pra frente.</p>
      ) : (
        futuros.map((e) => (
          <EventoLinha
            key={e.id}
            evento={e}
            materia={e.materia_id ? porId.get(e.materia_id) : undefined}
            hojeIso={hojeIso}
          >
            <div className="ev-acoes">
              {confirmaId === e.id ? (
                <span className="confirmar-exclusao">
                  apagar?
                  <button
                    type="button"
                    className="btn btn-perigo btn-mini"
                    onClick={() => apagar(e.id)}
                    disabled={apagandoId === e.id}
                  >
                    {apagandoId === e.id ? "…" : "sim"}
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
                  aria-label={`Apagar "${e.titulo}"`}
                  onClick={() => setConfirmaId(e.id)}
                >
                  ✕
                </button>
              )}
            </div>
          </EventoLinha>
        ))
      )}

      {passados.length > 0 && (
        <details className="passados">
          <summary>eventos passados ({passados.length})</summary>
          {passados.map((e) => (
            <EventoLinha
              key={e.id}
              evento={e}
              materia={e.materia_id ? porId.get(e.materia_id) : undefined}
              hojeIso={hojeIso}
            />
          ))}
        </details>
      )}

      <footer className="foot">
        <Link href="/">← ver a agenda como a turma vê</Link>
      </footer>
    </div>
  );
}
