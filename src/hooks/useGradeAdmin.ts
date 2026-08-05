"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EdicaoMateria, Materia, NovaAula } from "@/lib/types";

/**
 * Estado e chamadas de rede do editor de grade/matérias (`/admin/grade`), no
 * mesmo espírito do useFluxoEvento: cada gravação bem-sucedida chama
 * `router.refresh()` — a lista sempre é o retrato do banco, nunca um estado
 * local que possa dessincronizar.
 *
 * Erros de aula e de matéria ficam em estados separados: um erro ao salvar
 * uma matéria não pode "vazar" pra seção da grade (e vice-versa).
 */
export function useGradeAdmin() {
  const router = useRouter();

  const [erroAula, setErroAula] = useState<string | null>(null);
  const [salvandoAula, setSalvandoAula] = useState(false);
  const [apagandoAulaId, setApagandoAulaId] = useState<number | null>(null);
  const [confirmaAulaId, setConfirmaAulaId] = useState<number | null>(null);

  const [erroMateria, setErroMateria] = useState<string | null>(null);
  const [salvandoMateria, setSalvandoMateria] = useState(false);
  const [apagandoMateriaId, setApagandoMateriaId] = useState<string | null>(null);
  const [confirmaMateriaId, setConfirmaMateriaId] = useState<string | null>(null);

  async function pedido(
    url: string,
    opcoes: RequestInit,
    setErro: (mensagem: string | null) => void,
  ): Promise<boolean> {
    try {
      const r = await fetch(url, {
        ...opcoes,
        headers: { "Content-Type": "application/json", ...opcoes.headers },
      });
      if (!r.ok) {
        const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
        setErro(corpo?.erro ?? "Não consegui salvar.");
        return false;
      }
      return true;
    } catch {
      setErro("Sem conexão com o servidor.");
      return false;
    }
  }

  async function criarAula(nova: NovaAula): Promise<boolean> {
    setSalvandoAula(true);
    setErroAula(null);
    const ok = await pedido("/api/grade", { method: "POST", body: JSON.stringify(nova) }, setErroAula);
    setSalvandoAula(false);
    if (ok) router.refresh();
    return ok;
  }

  async function editarAula(id: number, campos: NovaAula): Promise<boolean> {
    setSalvandoAula(true);
    setErroAula(null);
    const ok = await pedido(
      `/api/grade/${id}`,
      { method: "PATCH", body: JSON.stringify(campos) },
      setErroAula,
    );
    setSalvandoAula(false);
    if (ok) router.refresh();
    return ok;
  }

  async function apagarAula(id: number): Promise<void> {
    setApagandoAulaId(id);
    setErroAula(null);
    const ok = await pedido(`/api/grade/${id}`, { method: "DELETE" }, setErroAula);
    setApagandoAulaId(null);
    if (ok) {
      setConfirmaAulaId(null);
      router.refresh();
    }
  }

  async function criarMateria(nova: Materia): Promise<boolean> {
    setSalvandoMateria(true);
    setErroMateria(null);
    const ok = await pedido(
      "/api/materias",
      { method: "POST", body: JSON.stringify(nova) },
      setErroMateria,
    );
    setSalvandoMateria(false);
    if (ok) router.refresh();
    return ok;
  }

  async function editarMateria(id: string, campos: EdicaoMateria): Promise<boolean> {
    setSalvandoMateria(true);
    setErroMateria(null);
    const ok = await pedido(
      `/api/materias/${id}`,
      { method: "PATCH", body: JSON.stringify(campos) },
      setErroMateria,
    );
    setSalvandoMateria(false);
    if (ok) router.refresh();
    return ok;
  }

  async function apagarMateria(id: string): Promise<void> {
    setApagandoMateriaId(id);
    setErroMateria(null);
    const ok = await pedido(`/api/materias/${id}`, { method: "DELETE" }, setErroMateria);
    setApagandoMateriaId(null);
    if (ok) {
      setConfirmaMateriaId(null);
      router.refresh();
    }
  }

  return {
    erroAula,
    setErroAula,
    salvandoAula,
    apagandoAulaId,
    confirmaAulaId,
    setConfirmaAulaId,
    criarAula,
    editarAula,
    apagarAula,
    erroMateria,
    setErroMateria,
    salvandoMateria,
    apagandoMateriaId,
    confirmaMateriaId,
    setConfirmaMateriaId,
    criarMateria,
    editarMateria,
    apagarMateria,
  };
}
