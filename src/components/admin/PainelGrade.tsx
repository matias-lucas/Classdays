"use client";

import Link from "next/link";
import { useGradeAdmin } from "@/hooks/useGradeAdmin";
import type { AulaFixa, Materia } from "@/lib/types";
import { EditorGrade } from "./EditorGrade";
import { EditorMaterias } from "./EditorMaterias";

interface Props {
  materias: Materia[];
  grade: AulaFixa[];
}

/**
 * /admin/grade — a tela; o estado e a rede moram no useGradeAdmin (um só
 * hook, os dois editores dividem o mesmo `router.refresh()` depois de cada
 * gravação).
 */
export function PainelGrade({ materias, grade }: Props) {
  const {
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
  } = useGradeAdmin();

  return (
    <div className="wrap">
      <p className="eyebrow">Classdays · Admin</p>
      <header className="admin-topo">
        <h1>Editar grade</h1>
        <Link href="/admin" className="link-discreto">
          ← voltar ao painel
        </Link>
      </header>
      <p className="head-sub" style={{ marginBottom: 18 }}>
        Matérias e horários fixos — o que aparece em &quot;Hoje&quot; e na grade da
        semana.
      </p>

      <EditorMaterias
        materias={materias}
        erro={erroMateria}
        salvando={salvandoMateria}
        apagandoId={apagandoMateriaId}
        confirmaId={confirmaMateriaId}
        setConfirmaId={(id) => {
          setErroMateria(null);
          setConfirmaMateriaId(id);
        }}
        criar={criarMateria}
        editar={editarMateria}
        apagar={apagarMateria}
      />

      <EditorGrade
        grade={grade}
        materias={materias}
        erro={erroAula}
        salvando={salvandoAula}
        apagandoId={apagandoAulaId}
        confirmaId={confirmaAulaId}
        setConfirmaId={(id) => {
          setErroAula(null);
          setConfirmaAulaId(id);
        }}
        criar={criarAula}
        editar={editarAula}
        apagar={apagarAula}
      />

      <footer className="foot">
        <Link href="/">← ver a agenda como a turma vê</Link>
      </footer>
    </div>
  );
}
