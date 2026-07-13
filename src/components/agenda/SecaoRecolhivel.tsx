"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * Seção recolhível (Fase 5): o rótulo `.slabel` vira um botão de
 * disclosure — ▾ aberto / › recolhido — que esconde o corpo da seção.
 *
 * O corpo some via a CLASSE `.sec-hidden`, nunca `display` inline: no
 * protótipo, o inline sobrescrevia o display do herocard `<a>` ao reexpandir
 * e o quebrava.
 *
 * Persistência: o conjunto de seções recolhidas vive em `localStorage`. O
 * servidor rende TUDO aberto (primeira visita = tudo aberto, ver roadmap §8)
 * e o efeito recolhe depois de montar — servidor e primeira pintura do client
 * idênticos, sem hydration mismatch (mesmo padrão da dica de arraste da grade).
 *
 * Navegação externa: o <h2> ganha id `sec-{id}` (ex.: "sec-proximo") — âncora
 * estável mesmo com o corpo recolhido — e a seção escuta o CustomEvent
 * `classdays:expandir-secao` (detail = id) para se abrir programaticamente
 * (usado pelo menu lateral).
 */

const CHAVE_RECOLHIDAS = "classdays.secoesRecolhidas";

/** Nome do evento que pede a uma seção que se expanda (detail = id dela). */
export const EVENTO_EXPANDIR_SECAO = "classdays:expandir-secao";

function lerRecolhidas(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE_RECOLHIDAS);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarRecolhida(id: string, recolhida: boolean) {
  try {
    const conjunto = new Set(lerRecolhidas());
    if (recolhida) conjunto.add(id);
    else conjunto.delete(id);
    localStorage.setItem(CHAVE_RECOLHIDAS, JSON.stringify([...conjunto]));
  } catch {
    // localStorage indisponível (modo privado etc.): o estado ainda vale
    // nesta visita, só não sobrevive ao reload.
  }
}

interface Props {
  /** Identificador estável da seção na persistência (ex.: "hoje", "grade"). */
  id: string;
  titulo: string;
  /** Classes extras do <h2> (ex.: "slabel-grade"). */
  classeLabel?: string;
  /** Classes extras do corpo (ex.: "sec-grade", que o desktop não estreita). */
  classeCorpo?: string;
  /** Conteúdo extra na linha do rótulo, fora do botão (ex.: "‹‹ voltar"). */
  extra?: ReactNode;
  children: ReactNode;
}

export function SecaoRecolhivel({
  id,
  titulo,
  classeLabel,
  classeCorpo,
  extra,
  children,
}: Props) {
  const [aberta, setAberta] = useState(true);
  const corpoId = useId();

  useEffect(() => {
    if (lerRecolhidas().includes(id)) setAberta(false);
  }, [id]);

  // Abre a seção quando alguém (ex.: menu lateral) pede via evento custom.
  useEffect(() => {
    const abrir = (ev: Event) => {
      if ((ev as CustomEvent<string>).detail !== id) return;
      setAberta(true);
      salvarRecolhida(id, false);
    };
    window.addEventListener(EVENTO_EXPANDIR_SECAO, abrir);
    return () => window.removeEventListener(EVENTO_EXPANDIR_SECAO, abrir);
  }, [id]);

  const alternar = () => {
    setAberta((estava) => {
      salvarRecolhida(id, estava);
      return !estava;
    });
  };

  const classesCorpo = [classeCorpo, aberta ? null : "sec-hidden"]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <h2 id={`sec-${id}`} className={classeLabel ? `slabel ${classeLabel}` : "slabel"}>
        <button
          type="button"
          className="slabel-toggle"
          aria-expanded={aberta}
          aria-controls={corpoId}
          onClick={alternar}
        >
          <span className="slabel-caret" aria-hidden="true">
            {aberta ? "▾" : "›"}
          </span>
          {titulo}
        </button>
        {extra}
      </h2>
      <div id={corpoId} className={classesCorpo || undefined}>
        {children}
      </div>
    </>
  );
}
