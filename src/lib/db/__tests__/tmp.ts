import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Cria um db.json temporário e isolado por teste, apontando CLASSDAYS_DB_FILE
 * pra ele. O adaptador local lê essa variável a cada chamada (db/local.ts),
 * então dois testes nunca disputam o mesmo arquivo — nem o db.json real do
 * projeto. Chamar `limpar()` no afterEach.
 */
export function bancoTemporario(): { caminho: string; limpar: () => Promise<void> } {
  const caminho = path.join(
    os.tmpdir(),
    `classdays-db-teste-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
  process.env.CLASSDAYS_DB_FILE = caminho;

  return {
    caminho,
    async limpar() {
      delete process.env.CLASSDAYS_DB_FILE;
      await fs.rm(caminho, { force: true });
      await fs.rm(`${caminho}.tmp`, { force: true });
    },
  };
}
