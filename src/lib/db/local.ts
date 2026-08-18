import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  AulaFixa,
  EdicaoMateria,
  Evento,
  Materia,
  NovaAula,
  NovoEvento,
} from "@/lib/types";
import { ConflitoBanco } from "./erros";
import type { Database } from "./index";
import { EVENTOS_SEED, GRADE_SEED, MATERIAS_SEED } from "./seed";

/**
 * Adaptador LOCAL: um arquivo JSON em data/db.json fazendo papel de banco.
 *
 * Existe pra desenvolver sem depender de nada externo. Na primeira leitura o
 * arquivo é criado a partir do seed. Ele está no .gitignore — apagá-lo
 * "reseta" o banco local.
 *
 * ⚠️ Não serve pra produção: na Vercel o sistema de arquivos é somente
 * leitura e cada acesso pode cair numa máquina diferente. Lá, o adaptador
 * do Supabase assume (basta preencher o .env).
 */

interface BancoLocal {
  materias: Materia[];
  grade: AulaFixa[];
  eventos: Evento[];
  config: { gradeVisivel: boolean };
}

// Função (não constante): lida a cada chamada, pra que os testes apontem
// para um arquivo temporário via CLASSDAYS_DB_FILE sem se preocupar com
// ordem de import (o valor não fica "congelado" na carga do módulo).
function arquivo(): string {
  return process.env.CLASSDAYS_DB_FILE ?? path.join(process.cwd(), "data", "db.json");
}

function bancoInicial(): BancoLocal {
  // Cópia, não referência: sem isso, addEvento fazia push direto no array do
  // seed. Se a gravação em disco falhasse (disco somente-leitura), o seed do
  // processo ficava sujo — e nos testes, um caso vazava pro outro.
  return structuredClone({
    materias: MATERIAS_SEED,
    grade: GRADE_SEED,
    eventos: EVENTOS_SEED,
    config: { gradeVisivel: true },
  });
}

async function ler(): Promise<BancoLocal> {
  try {
    const bruto = await fs.readFile(arquivo(), "utf-8");
    const banco = JSON.parse(bruto) as BancoLocal;
    // db.json de antes deste campo existir: nasce visível (comportamento antigo).
    banco.config ??= { gradeVisivel: true };
    // eventos gravados antes da E2 não têm data_fim: são pontuais.
    for (const e of banco.eventos) e.data_fim ??= null;
    // eventos gravados antes deste campo existir: mesma regra de sempre.
    for (const e of banco.eventos) e.enfase ??= "ambos";
    return banco;
  } catch {
    // Arquivo ainda não existe (ou foi apagado): nasce do seed.
    const inicial = bancoInicial();
    await gravar(inicial).catch(() => {
      // Disco somente-leitura (ex.: Vercel sem Supabase): segue em memória.
    });
    return inicial;
  }
}

async function gravar(banco: BancoLocal): Promise<void> {
  const caminho = arquivo();
  await fs.mkdir(path.dirname(caminho), { recursive: true });
  // Grava num temporário e renomeia: se o processo cair no meio da escrita,
  // o db.json anterior continua íntegro.
  const tmp = `${caminho}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(banco, null, 2), "utf-8");
  await fs.rename(tmp, caminho);
}

export const dbLocal: Database = {
  async getMaterias() {
    const materias = (await ler()).materias;
    return [...materias].sort((a, b) => a.nome.localeCompare(b.nome));
  },

  async getGrade() {
    const grade = (await ler()).grade;
    return [...grade].sort(
      (a, b) => a.dia_semana - b.dia_semana || a.hora_ini.localeCompare(b.hora_ini),
    );
  },

  async getEventos() {
    const eventos = (await ler()).eventos;
    return [...eventos].sort(
      (a, b) => a.data.localeCompare(b.data) || (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"),
    );
  },

  async addEvento(novo: NovoEvento) {
    const banco = await ler();
    const evento: Evento = {
      ...novo,
      id: banco.eventos.reduce((max, e) => Math.max(max, e.id), 0) + 1,
      created_at: new Date().toISOString(),
    };
    banco.eventos.push(evento);
    await gravar(banco);
    return evento;
  },

  async updateEvento(id: number, campos: NovoEvento) {
    const banco = await ler();
    const idx = banco.eventos.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const evento: Evento = { ...campos, id, created_at: banco.eventos[idx].created_at };
    banco.eventos[idx] = evento;
    await gravar(banco);
    return evento;
  },

  async deleteEvento(id: number) {
    const banco = await ler();
    banco.eventos = banco.eventos.filter((e) => e.id !== id);
    await gravar(banco);
  },

  async getGradeVisivel() {
    return (await ler()).config.gradeVisivel;
  },

  async setGradeVisivel(visivel: boolean) {
    const banco = await ler();
    banco.config.gradeVisivel = visivel;
    await gravar(banco);
  },

  async addMateria(nova: Materia) {
    const banco = await ler();
    if (banco.materias.some((m) => m.id === nova.id)) {
      throw new ConflitoBanco(`A matéria "${nova.id}" já existe.`);
    }
    banco.materias.push(nova);
    await gravar(banco);
    return nova;
  },

  async updateMateria(id: string, campos: EdicaoMateria) {
    const banco = await ler();
    const idx = banco.materias.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const materia: Materia = { ...campos, id };
    banco.materias[idx] = materia;
    await gravar(banco);
    return materia;
  },

  async deleteMateria(id: string) {
    const banco = await ler();
    const idx = banco.materias.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    banco.materias.splice(idx, 1);
    await gravar(banco);
    return true;
  },

  async addAula(nova: NovaAula) {
    const banco = await ler();
    if (aulaDuplicada(banco.grade, nova)) {
      throw new ConflitoBanco("Já existe uma aula desta matéria neste horário.");
    }
    const aula: AulaFixa = {
      ...nova,
      id: banco.grade.reduce((max, a) => Math.max(max, a.id), 0) + 1,
    };
    banco.grade.push(aula);
    await gravar(banco);
    return aula;
  },

  async updateAula(id: number, campos: NovaAula) {
    const banco = await ler();
    const idx = banco.grade.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    if (aulaDuplicada(banco.grade, campos, id)) {
      throw new ConflitoBanco("Já existe uma aula desta matéria neste horário.");
    }
    const aula: AulaFixa = { ...campos, id };
    banco.grade[idx] = aula;
    await gravar(banco);
    return aula;
  },

  async deleteAula(id: number) {
    const banco = await ler();
    const idx = banco.grade.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    banco.grade.splice(idx, 1);
    await gravar(banco);
    return true;
  },

  async contarUsos(materiaId: string) {
    const banco = await ler();
    return {
      aulas: banco.grade.filter((a) => a.materia_id === materiaId).length,
      eventos: banco.eventos.filter((e) => e.materia_id === materiaId).length,
    };
  },
};

/** Mesma aula (dia + hora + matéria) já cadastrada — `ignorarId` exclui a própria linha, na edição. */
function aulaDuplicada(grade: AulaFixa[], candidata: NovaAula, ignorarId?: number): boolean {
  return grade.some(
    (a) =>
      a.id !== ignorarId &&
      a.dia_semana === candidata.dia_semana &&
      a.hora_ini === candidata.hora_ini &&
      a.materia_id === candidata.materia_id,
  );
}
