"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EventoParseado, ResultadoParse } from "@/lib/parser/tipos";
import type { Evento } from "@/lib/types";

export interface Rascunho {
  evento: EventoParseado;
  origem: "claude" | "regras" | "manual" | "edicao";
  avisos: string[];
}

/** Ponto de partida do modo manual: um evento em branco pra preencher no preview. */
export const EVENTO_VAZIO: EventoParseado = {
  tipo: "evento",
  titulo: "",
  materia_id: null,
  data: null,
  data_fim: null,
  hora: null,
  enfase: "ambos",
  observacao: null,
};

/**
 * Estado e chamadas de rede do painel do admin:
 * frase → /api/parse → rascunho editável → /api/eventos (salvar/apagar).
 *
 * Depois de salvar ou apagar, `router.refresh()` pede a página de novo ao
 * servidor — a lista de eventos é sempre o retrato real do banco, nunca um
 * estado local que possa dessincronizar.
 */
export function useFluxoEvento() {
  const router = useRouter();

  const [frase, setFrase] = useState("");
  const [interpretando, setInterpretando] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; texto: string } | null>(null);
  const [apagandoId, setApagandoId] = useState<number | null>(null);
  const [confirmaId, setConfirmaId] = useState<number | null>(null);

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

  /** Carrega um evento existente no preview, para corrigir sem apagar e recriar. */
  function editar(evento: Evento) {
    setFeedback(null);
    setEditandoId(evento.id);
    setRascunho({
      evento: {
        tipo: evento.tipo,
        titulo: evento.titulo,
        materia_id: evento.materia_id,
        data: evento.data,
        data_fim: evento.data_fim,
        hora: evento.hora,
        enfase: evento.enfase,
        observacao: evento.observacao,
      },
      origem: "edicao",
      avisos: [],
    });
  }

  /** Fecha o preview (descarte de criação ou cancelamento de edição). */
  function descartar() {
    setRascunho(null);
    setEditandoId(null);
  }

  async function salvar() {
    if (!rascunho) return;
    setSalvando(true);
    setFeedback(null);
    try {
      const r = await fetch(
        editandoId !== null ? `/api/eventos/${editandoId}` : "/api/eventos",
        {
          method: editandoId !== null ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rascunho.evento),
        },
      );
      const corpo = await r.json().catch(() => null);
      if (!r.ok) {
        setFeedback({ ok: false, texto: corpo?.erro ?? "Não consegui salvar." });
        return;
      }
      const eraEdicao = editandoId !== null;
      setRascunho(null);
      setEditandoId(null);
      setFrase("");
      setFeedback({
        ok: true,
        texto: eraEdicao
          ? "Evento atualizado."
          : "Evento salvo — já está na agenda da turma.",
      });
      router.refresh();
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

  return {
    frase,
    setFrase,
    interpretando,
    rascunho,
    setRascunho,
    editandoId,
    editar,
    descartar,
    salvando,
    feedback,
    apagandoId,
    confirmaId,
    setConfirmaId,
    interpretar,
    salvar,
    apagar,
    sair,
  };
}
