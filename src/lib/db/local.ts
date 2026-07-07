import { promises as fs } from "node:fs";
import path from "node:path";
import type { AulaFixa, Evento, Materia, NovoEvento } from "@/lib/types";
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
}

const ARQUIVO = path.join(process.cwd(), "data", "db.json");

function bancoInicial(): BancoLocal {
  return {
    materias: MATERIAS_SEED,
    grade: GRADE_SEED,
    eventos: EVENTOS_SEED,
  };
}

async function ler(): Promise<BancoLocal> {
  try {
    const bruto = await fs.readFile(ARQUIVO, "utf-8");
    return JSON.parse(bruto) as BancoLocal;
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
  await fs.mkdir(path.dirname(ARQUIVO), { recursive: true });
  // Grava num temporário e renomeia: se o processo cair no meio da escrita,
  // o db.json anterior continua íntegro.
  const tmp = `${ARQUIVO}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(banco, null, 2), "utf-8");
  await fs.rename(tmp, ARQUIVO);
}

export const dbLocal: Database = {
  async getMaterias() {
    return (await ler()).materias;
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

  async deleteEvento(id: number) {
    const banco = await ler();
    banco.eventos = banco.eventos.filter((e) => e.id !== id);
    await gravar(banco);
  },
};
