"use client";

import Link from "next/link";
import { useMemo } from "react";
import { EventoLinha } from "@/components/ui/EventoLinha";
import { EVENTO_VAZIO, useFluxoEvento } from "@/hooks/useFluxoEvento";
import type { Evento, Materia } from "@/lib/types";
import { PreviewEvento } from "./PreviewEvento";

interface Props {
  materias: Materia[];
  eventos: Evento[];
  hojeIso: string;
  backend: "supabase" | "local";
  claudeAtivo: boolean;
}

/**
 * O painel do representante — só a tela. O estado e as chamadas de rede do
 * fluxo (frase → parse → preview editável → salvar/apagar) moram no hook
 * useFluxoEvento.
 */
export function PainelAdmin({ materias, eventos, hojeIso, backend, claudeAtivo }: Props) {
  const {
    frase,
    setFrase,
    interpretando,
    rascunho,
    setRascunho,
    salvando,
    feedback,
    apagandoId,
    confirmaId,
    setConfirmaId,
    interpretar,
    salvar,
    apagar,
    sair,
  } = useFluxoEvento();

  const porId = useMemo(() => new Map(materias.map((m) => [m.id, m])), [materias]);

  const futuros = eventos.filter((e) => e.data >= hojeIso);
  const passados = eventos.filter((e) => e.data < hojeIso).reverse();

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
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            placeholder={"Digite o que acontecerá..."}
            maxLength={118}
            rows={2}
            autoFocus
          />
        </label>
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
