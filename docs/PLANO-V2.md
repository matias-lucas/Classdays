# Classdays v2 — Plano de execução

> Documento operacional. O `ROADMAP.md` diz *o que* falta; este diz *como* cada
> entrega é construída, testada, publicada e revertida.
> Escrito em 04/08/2026, a partir do código real (`main`) e do banco de produção.

---

## 1. Como este plano funciona

**Uma entrega por branch.** Cada entrega fecha o ciclo inteiro antes da próxima
começar:

```
backup do banco → migration (aditiva) → branch → código → testes → push
   → preview na Vercel → QA manual → merge em main → produção → verificação
   → ✋ confirmação do Lucas → próxima entrega
```

Nenhuma entrega começa sem a confirmação explícita da anterior ter fechado.

**Dentro de cada entrega, a ordem é sempre de baixo para cima** — banco primeiro,
interface por último:

| # | Camada | Por que nessa ordem |
|---|--------|---------------------|
| 1 | Banco (SQL) | O formato dos dados é o alicerce; mudá-lo depois obriga a refazer tudo acima. |
| 2 | Tipos + contrato `Database` | O resto do app só conversa com essa interface. |
| 3 | Adaptadores (local **e** Supabase) | O local é o que roda nos testes e no dev; o Supabase é produção. |
| 4 | Validação (zod) | As fronteiras (rotas de API) blindadas antes de existirem. |
| 5 | Rotas de API | O verbo HTTP só depois que dado + validação existem. |
| 6 | Lógica pura (`src/lib/agenda.ts`) + testes | Regra de domínio testável sem browser. |
| 7 | Interface (React/CSS) | Desenha por cima de uma base já provada. |

Quando um passo termina, ele tem que estar **verificável sozinho** (teste verde ou
`curl` respondendo), sem depender do passo seguinte.

### Ordem das entregas

| Entrega | Conteúdo | Depende de | Tamanho | Urgência |
|---------|----------|-----------|---------|----------|
| **E1** | Fundação de segurança + editar grade e matérias no `/admin` (F4) | — | Médio | **Alta — grade do 4º período até 10/08** |
| **E2** | Eventos contínuos (F1) + editar eventos (F3) | E1 (fundação) | Médio | Média |
| **E3** | Feriados e recessos (F2) | E2 (`data_fim`) | Pequeno | Média |
| **E4** | Meu Classdays — ocultar matérias (F5) | — | Pequeno/médio | Baixa |
| **E5** | Sino de notificações in-app (F6a) | E4 | Pequeno | Baixa |
| **E6** | Web Push / PWA (F6b) | E5 | Grande | Baixa |

E1 vem primeiro porque tem prazo real: as aulas voltam **10/08** e a grade do 4º
período precisa estar no ar antes disso. E2 e E3 mexem nos mesmos arquivos
(`eventos`, parser, `agenda.ts`), por isso ficam adjacentes.

### Decisões tomadas (04/08/2026)

1. **Preview e produção compartilham o mesmo banco Supabase.** Isso é o que mais
   molda este plano — ver §3.
2. **Uma branch por entrega**, com merge em `main` entre elas.
3. **Grade continua segunda a sexta** (`dia_semana 1–5`). Sábado letivo é exceção
   e entra como *evento*, não como aula fixa.
4. **Matérias com CRUD completo**, com exclusão bloqueada quando houver aulas ou
   eventos apontando para ela (erro claro, nunca histórico órfão).

---

## 2. Estado verificado (04/08/2026)

Conferido direto no Postgres de produção, não por memória:

**Banco** — 5 matérias, 7 aulas na grade, 3 eventos.

| Matéria | id | Professor | Aulas |
|---------|-----|-----------|-------|
| Administração e Gestão Estratégica | `age` | Prof. Fulano *(placeholder)* | 1 |
| Banco de Dados II | `bd2` | Prof. Kenyo | 2 |
| Estrutura de Dados | `edados` | Prof. Ciclano *(placeholder)* | 1 |
| Extensão Curricular III | `ext3` | Prof. Beltrano *(placeholder)* | 2 |
| Programação Orientada a Objetos I | `poo1` | Prof. Naosei *(placeholder)* | 1 |

Quatro dos cinco professores ainda são nomes de mentira — a E1 existe também para
corrigir isso sem SQL.

**Eventos em produção**: id 21 (`2026-08-04`, "Data de início da renovação de
matrícula"), id 22 (`2026-08-09`, "Término do prazo…") — a gambiarra que a E2
funde num evento só — e id 25 (`2026-08-10`, "RETORNO DAS AULAS").

**Constraints existentes**: `eventos_tipo_check` (5 tipos),
`grade_horaria_dia_semana_check` (1–5), `config_singleton` (id = 1).

**Ambiente local**: `.env.local` existe com `ADMIN_PASSWORD` preenchida e as
chaves do Supabase e do Anthropic **vazias** → o `localhost` roda no adaptador
JSON (`data/db.json`) e no parser de regras. Isso é bom: desenvolver não toca em
produção. Mantenha assim.

**Testes hoje**: 79 casos verdes em 3 arquivos (`agenda`, `dates`, `regras`),
conferidos com `npm test` em 04/08. Não existe nenhum teste de adaptador de banco
nem de rota de API — a E1 cria essas duas camadas.

**Débito de documentação**: o `CLAUDE.md` manda ler `docs/COMO-FUNCIONA.md`, que
não existe mais. Corrigir junto com a E1 (§4, Passo 0).

---

## 3. Regras invioláveis (valem para todas as entregas)

### 3.1 O banco é compartilhado — toda migration é aditiva

Preview e produção leem e escrevem o **mesmo** Postgres. Isso significa que, entre
o momento em que a migration roda e o momento em que o merge chega à produção,
**o código antigo continua rodando contra o banco novo**. Daí:

- ✅ **Permitido**: adicionar coluna *nullable*, adicionar índice, adicionar
  tabela, **afrouxar** um `check` (aceitar mais valores).
- ❌ **Proibido sem plano de duas etapas**: renomear/remover coluna, tornar coluna
  `not null`, **apertar** um `check`, mudar tipo de coluna.
- A migration roda **antes** do deploy do código que a usa, nunca depois.
- Todo `.sql` fica versionado em `supabase/`, numerado em sequência, e é rodado
  no SQL Editor do Supabase (copiar/colar/Run).

### 3.2 O contrato vale nos dois adaptadores

Qualquer método novo em `Database` (`src/lib/db/index.ts`) é implementado em
`db/local.ts` **e** em `db/supabase.ts` no mesmo commit. O local é o que roda nos
testes; deixá-lo para trás quebra a suíte inteira de forma confusa.

### 3.3 Regra de domínio é função pura

Nada de `new Date()`, leitura de banco ou `localStorage` dentro de
`src/lib/agenda.ts`. "Hoje" e "agora" entram por parâmetro. É isso que mantém
servidor e navegador calculando a mesma tela (sem hydration mismatch) e os testes
determinísticos.

### 3.4 Fronteira validada

Todo corpo de request passa por zod antes de chegar ao banco. Schemas de evento
em `src/lib/parser/schema.ts`; os novos (grade/matéria) em `src/lib/schemas/`.

### 3.5 Definition of Done (idêntico ao ROADMAP)

- `npx tsc --noEmit` limpo · `npm test` verde · `npm run build` passa ·
  `npm run lint` sem erro nem aviso (zerado em 27/08/2026 — ver ROADMAP)
- Correto nos **dois temas**; `prefers-reduced-motion` respeitado
- A11y: foco visível, navegável por teclado, `aria-*`, alvos ≥44px em `pointer: coarse`
- Mobile (360px) **e** desktop (≥1000px); sem hydration mismatch
- Nenhuma cor literal nova fora de `tokens.css`

---

## 4. Salvaguardas do banco compartilhado

Como preview escreve em produção, cada entrega carrega proteções específicas.

### 4.1 Backup antes de qualquer teste destrutivo

No SQL Editor do Supabase, **antes** de começar o QA de E1 (e de qualquer
entrega que apague dados):

```sql
-- snapshot com a data do dia no nome
create table bkp_materias_20260804      as select * from materias;
create table bkp_grade_horaria_20260804 as select * from grade_horaria;
create table bkp_eventos_20260804       as select * from eventos;
```

Restaurar (se algo der errado):

```sql
begin;
delete from grade_horaria;
delete from materias where id not in (select materia_id from eventos where materia_id is not null);
insert into materias      select * from bkp_materias_20260804      on conflict (id) do nothing;
insert into grade_horaria select * from bkp_grade_horaria_20260804;
commit;
```

Apagar os snapshots só depois que a entrega estiver estável em produção
(`drop table bkp_…`). Eles não têm RLS: **não deixe snapshot de longo prazo**.

### 4.2 A chave de segurança que já existe: "Grade divulgada"

O toggle do `/admin` (`config.grade_visivel`) faz a turma ver "Ainda não
divulgado" em vez de "Hoje" e da grade. **Desligue antes de testar a E1** e
religue quando a grade do 4º período estiver completa e conferida. É a diferença
entre a turma ver uma grade meio montada e não ver nada.

### 4.3 Dados de teste com data longe

Eventos criados durante o QA usam datas de **2027** — assim nunca aparecem em
"Hoje", nem no hero, nem na grade da semana de quem está em produção. Limpeza ao
fim do QA:

```sql
delete from eventos where data >= '2027-01-01';
```

### 4.4 Tolerância a tipos desconhecidos (entra já na E1)

A E3 vai criar eventos de tipo `feriado`/`recesso`. Se eles forem criados no
preview enquanto a produção ainda roda o código antigo, o selo apareceria sem
estilo. Por isso a **E1** já deixa `.badge` com cor neutra no estado base — dois
tokens de CSS que tornam toda entrega futura segura de testar.

### 4.5 Proteção do preview

- Na Vercel: **Settings → Deployment Protection → Vercel Authentication** ligada
  para *Preview* (o preview mostra dados reais e tem `/admin`; não pode ficar
  aberto). Deployments de preview já saem com `x-robots-tag: noindex`.
- Env vars do ambiente *Preview* precisam existir: `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_PASSWORD`.
  Se estiverem marcadas como "All Environments", o preview já as herda — conferir
  antes do primeiro push.

### 4.6 Rollback

- **Código**: `git revert -m 1 <sha-do-merge>` e push — a Vercel republica sozinha.
  (Alternativa imediata: *Instant Rollback* no dashboard da Vercel.)
- **Banco**: migrations aditivas não precisam ser revertidas — a coluna extra fica
  lá, ignorada pelo código antigo. Só dados apagados precisam do snapshot (§4.1).

---

## 5. Ritual de cada entrega

Checklist que o executor segue, sem exceção:

1. `git checkout main && git pull`
2. `git checkout -b <branch-da-entrega>`
3. Rodar o `.sql` da entrega no SQL Editor do Supabase (se houver) e **commitar o
   arquivo** em `supabase/`.
4. Implementar na ordem canônica (banco → contrato → validação → rotas → lógica →
   UI), commitando por passo.
5. `npx tsc --noEmit && npm test && npm run build` — os três verdes.
6. `git push -u origin <branch>` → a Vercel gera o preview.
7. QA manual no preview seguindo o roteiro da entrega (§ da entrega).
8. Bugs achados viram commits na mesma branch; volta ao passo 5.
9. Merge em `main` (`--no-ff`, para o histórico manter a entrega como bloco).
10. Conferir produção com o roteiro de fumaça (§9).
11. Atualizar `docs/ROADMAP.md` (marcar a caixa) e o "Estado do projeto" no
    `CLAUDE.md`.
12. ✋ **Parar e reportar.** A próxima entrega só começa com confirmação.

---

## 6. E1 — Fundação + grade e matérias pelo `/admin`

**Branch**: `feat/e1-grade-admin`
**Objetivo**: montar a grade inteira do 4º período e corrigir os professores
placeholder pela interface, sem tocar em SQL.
**Prazo**: em produção antes de **10/08**.

### Passo 0 — Fundação (a base de que todas as entregas dependem)

Nada aqui é visível para a turma; tudo aqui evita retrabalho e sustos depois.

**0.1 — Banco local testável e isolado** (`src/lib/db/local.ts`)

```ts
// caminho do arquivo passa a ser uma FUNÇÃO (lida a cada chamada), pra que os
// testes apontem para um arquivo temporário sem se preocupar com ordem de import
function arquivo(): string {
  return process.env.CLASSDAYS_DB_FILE ?? path.join(process.cwd(), "data", "db.json");
}
```

E `bancoInicial()` passa a devolver **cópias** do seed:

```ts
function bancoInicial(): BancoLocal {
  return structuredClone({
    materias: MATERIAS_SEED,
    grade: GRADE_SEED,
    eventos: EVENTOS_SEED,
    config: { gradeVisivel: true },
  });
}
```

> **Bug real que isso conserta**: hoje `bancoInicial()` devolve os arrays do seed
> por referência. `addEvento` faz `push` direto em `EVENTOS_SEED`; se a gravação
> falhar (disco somente-leitura), o seed do processo fica sujo. Nos testes, um
> caso vazaria para o outro.

**0.2 — Helpers de rota** (`src/lib/api.ts`, arquivo novo)

Hoje as quatro rotas repetem o mesmo bloco de auth e o mesmo formato de erro. A
E1 adiciona seis rotas; sem extrair, viram dez cópias.

```ts
/** Devolve a resposta 401 quando não há sessão; null quando pode seguir. */
export function exigirSessao(req: NextRequest): NextResponse | null;

/** Resposta de erro no formato único do app: { erro: string }. */
export function erro(mensagem: string, status: number): NextResponse;

/** Lê o JSON do corpo e valida com um schema zod. */
export async function corpoValidado<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
): Promise<{ ok: true; dados: T } | { ok: false; resposta: NextResponse }>;

/** A matéria existe? (checagem que POST /api/eventos já faz na mão) */
export async function materiaExiste(id: string): Promise<boolean>;
```

As rotas existentes (`/api/eventos`, `/api/eventos/[id]`, `/api/parse`,
`/api/config`) passam a usar os helpers — mesmo comportamento, mesmas mensagens.
Confirmar com os testes que o passo 0.4 cria.

**0.3 — Selo tolerante a tipo novo** (`src/styles/badges.css`)

```css
.badge {
  /* … o que já existe … */
  background: var(--badge-cancelamento-bg); /* neutro: tipo ainda sem estilo próprio */
  color: var(--badge-cancelamento-fg);
}
```

As regras específicas (`.badge.prova` etc.) continuam sobrescrevendo. Custo: duas
linhas. Ganho: a E3 pode ser testada no preview sem enfeiar a produção (§4.4).

**0.4 — Infraestrutura de teste de rotas** (`src/lib/db/__tests__/tmp.ts`)

Helper que cria um `db.json` temporário por arquivo de teste:

```ts
// usa os.tmpdir() + nome único, define process.env.CLASSDAYS_DB_FILE,
// devolve { caminho, limpar() } — chamado em beforeEach/afterEach
export function bancoTemporario(): { caminho: string; limpar: () => Promise<void> };
```

Para testar as rotas, importe o handler e chame-o com um `NextRequest` montado à
mão, com o cookie de sessão real:

```ts
process.env.ADMIN_PASSWORD = "senha-de-teste";
const req = new NextRequest("http://localhost/api/grade", {
  method: "POST",
  headers: { cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}`, "content-type": "application/json" },
  body: JSON.stringify({ /* … */ }),
});
const res = await POST(req);
expect(res.status).toBe(201);
```

> **Se importar o handler no Vitest der atrito** (o Next às vezes puxa contexto de
> runtime que não existe fora do servidor): não insista. Plano B — testar
> exaustivamente as duas camadas de baixo (schemas zod + adaptador local, que é
> onde mora a lógica) e manter as rotas finas o bastante para o QA manual cobrir.
> Registre a escolha num comentário no topo do arquivo de teste.

**0.5 — Documentação**: apagar a referência a `docs/COMO-FUNCIONA.md` do
`CLAUDE.md` ou recriar o arquivo. Escolha: **apagar a referência** e apontar para
`docs/PLANO-V2.md` + `DESIGN.md`, que estão vivos.

### Passo 1 — Banco (`supabase/0004_grade_admin.sql`)

Defesa em profundidade: mesmo que um bug passe pela validação da rota, o banco
recusa. Verificado que **todas as linhas atuais já satisfazem** estas regras.

```sql
-- hora_fim sempre depois de hora_ini
alter table grade_horaria
  add constraint grade_horaria_horas_check check (hora_fim > hora_ini);

-- não existe a mesma aula duas vezes no mesmo horário
create unique index grade_horaria_slot_idx
  on grade_horaria (dia_semana, hora_ini, materia_id);

-- id de matéria em formato de slug ('bd2', 'poo1'…)
alter table materias
  add constraint materias_id_check check (id ~ '^[a-z][a-z0-9]{1,15}$');

-- cor sempre hex de 6 dígitos
alter table materias
  add constraint materias_cor_check check (cor ~ '^#[0-9A-Fa-f]{6}$');

-- a consulta da grade é sempre "ordenada por dia e hora"
create index if not exists grade_horaria_ordem_idx on grade_horaria (dia_semana, hora_ini);
```

> Ainda que sejam constraints (§3.1 pede cuidado com "apertar" checks), estas são
> seguras: nenhuma linha existente as viola e o código em produção nunca escreve
> em `materias`/`grade_horaria`. Rodar e conferir com
> `select count(*) from grade_horaria;` (deve continuar 7).

### Passo 2 — Tipos e contrato

`src/lib/types.ts`:

```ts
/** Aula ainda sem id — o que o formulário da grade produz. */
export type NovaAula = Omit<AulaFixa, "id">;
/** Matéria sem o id (edição não muda a chave primária). */
export type EdicaoMateria = Omit<Materia, "id">;
```

`src/lib/db/index.ts` — o contrato cresce; atualizar também o comentário do
cabeçalho, que hoje afirma "na v1 o admin só cria/apaga eventos":

```ts
addMateria(nova: Materia): Promise<Materia>;
updateMateria(id: string, campos: EdicaoMateria): Promise<Materia | null>; // null = não existe
deleteMateria(id: string): Promise<boolean>;                              // false = não existe
addAula(nova: NovaAula): Promise<AulaFixa>;
updateAula(id: number, campos: NovaAula): Promise<AulaFixa | null>;
deleteAula(id: number): Promise<boolean>;
/** Quantas aulas e eventos apontam para esta matéria (trava a exclusão). */
contarUsos(materiaId: string): Promise<{ aulas: number; eventos: number }>;
```

Convenção: **`null`/`false` = não encontrado** (a rota devolve 404); exceção =
falha real (a rota devolve 500).

### Passo 3 — Adaptadores

`db/local.ts`: id de aula = `max(id) + 1`; gravação pelo mesmo `gravar()`
(temporário + rename). `contarUsos` conta em memória.

`db/supabase.ts`: `update(...).eq("id", id).select().maybeSingle()`;
`delete().eq("id", id).select()` → `length > 0`. **Normalizar `hora_ini`/`hora_fim`
com `hhmm()` também no retorno de `addAula`/`updateAula`** — o Postgres devolve
`"19:00:00"` e o app inteiro fala `"19:00"`.

> **Bug existente do mesmo tipo**: `addEvento` devolve a linha crua, com
> `hora: "19:00:00"`. Hoje passa despercebido porque o painel dá `router.refresh()`
> logo em seguida. Aproveite e normalize também.

`contarUsos` no Supabase: dois `select` com `count: "exact", head: true`.

### Passo 4 — Validação (`src/lib/schemas/grade.ts`, arquivo novo)

```ts
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const NovaAulaSchema = z
  .object({
    materia_id: z.string().min(1),
    dia_semana: z.number().int().min(1).max(5),
    hora_ini: z.string().regex(HORA),
    hora_fim: z.string().regex(HORA),
    sala: z.string().trim().max(40).nullable(),
  })
  .refine((a) => a.hora_fim > a.hora_ini, {
    message: "A hora de término precisa ser depois da de início.",
    path: ["hora_fim"],
  });

export const NovaMateriaSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]{1,15}$/),
  nome: z.string().trim().min(2).max(60),
  prof: z.string().trim().max(60).nullable(),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const EdicaoMateriaSchema = NovaMateriaSchema.omit({ id: true });
```

Mais uma função pura, com teste (`src/lib/schemas/__tests__/`):

```ts
/** "Programação Orientada a Objetos I" → "programacao" (sugestão editável). */
export function slugDeNome(nome: string): string;
```

Regra: minúsculas, sem acento, só `[a-z0-9]`, corta em 12 caracteres, começa por
letra. É **sugestão** — o admin pode trocar antes de salvar.

### Passo 5 — Rotas de API

Todas atrás de `exigirSessao`, todas com `try/catch` + `console.error` + 500.

| Rota | Sucesso | Erros |
|------|---------|-------|
| `POST /api/materias` | 201 `{ materia }` | 400 inválido · 409 id já existe |
| `PATCH /api/materias/[id]` | 200 `{ materia }` | 400 · 404 não existe |
| `DELETE /api/materias/[id]` | 200 `{ ok: true }` | 404 · **409 em uso** |
| `POST /api/grade` | 201 `{ aula }` | 400 · 400 matéria inexistente · 409 horário duplicado |
| `PATCH /api/grade/[id]` | 200 `{ aula }` | 400 · 404 · 409 |
| `DELETE /api/grade/[id]` | 200 `{ ok: true }` | 404 |

O 409 de exclusão precisa **dizer o que trava**:

```ts
const { aulas, eventos } = await db.contarUsos(id);
if (aulas + eventos > 0) {
  return erro(
    `Não dá pra excluir: ${aulas} aula(s) na grade e ${eventos} evento(s) usam esta matéria. Remova-os antes.`,
    409,
  );
}
```

O 409 de horário duplicado traduz o erro do índice único (`23505` no Postgres)
para uma frase humana — nunca vaze mensagem de banco para a tela.

### Passo 6 — Testes automatizados

Casos obrigatórios (nomes livres, cobertura não):

**Adaptador local** (`src/lib/db/__tests__/local.test.ts`)
1. `addAula` gera id sequencial e persiste no arquivo temporário
2. `getGrade` devolve ordenado por dia e hora
3. `updateAula` de id inexistente → `null`
4. `deleteAula` de id inexistente → `false`
5. `addMateria` + `getMaterias` ordenadas por nome
6. `updateMateria` preserva o id mesmo se vier outro no corpo
7. `contarUsos` conta aulas e eventos separadamente
8. Seed não é mutado entre dois bancos temporários (regressão do 0.1)

**Schemas** (`src/lib/schemas/__tests__/grade.test.ts`)
9. `hora_fim <= hora_ini` → inválido (incluindo iguais)
10. `dia_semana` 0, 6 e 7 → inválidos; 1 e 5 → válidos
11. `hora` "24:00", "9:00", "19:60" → inválidas; "09:00" → válida
12. id `"BD2"`, `"2bd"`, `"bd-2"`, `"b"`, 17 caracteres → inválidos
13. cor `"#FFF"`, `"vermelho"`, `"#GGGGGG"` → inválidas
14. campos extras no corpo (`id`, `created_at`) são descartados pelo zod
15. `slugDeNome`: acentos, espaços, número no fim, nome de 1 letra

**Rotas** (se o Passo 0.4 viabilizou)
16. sem cookie → 401 em todas as seis
17. cookie inválido → 401
18. `POST /api/grade` com matéria inexistente → 400
19. horário duplicado → 409
20. `DELETE /api/materias/:id` com aula vinculada → 409 e **nada é apagado**
21. `DELETE /api/materias/:id` sem vínculo → 200 e some do `getMaterias`

### Passo 7 — Interface

**Rota nova**: `src/app/admin/grade/page.tsx` — server component, `force-dynamic`,
mesma checagem de sessão do `/admin` (sem sessão, renderiza `<LoginAdmin />`;
nenhum dado desce). Carrega `db.getMaterias()` e `db.getGrade()`.

**Componentes**:
- `src/components/admin/EditorGrade.tsx` — cinco blocos (Segunda…Sexta). Cada
  bloco lista as aulas do dia ordenadas por hora, cada linha com ✎ e ✕, e um
  botão "+ aula" no rodapé do bloco. O formulário abre **inline** (matéria, hora
  início, hora fim, sala), nunca modal.
- `src/components/admin/EditorMaterias.tsx` — uma linha por matéria: ponto na cor,
  nome, professor, seletor de cor, ✕. "+ matéria" abre linha nova com o slug
  sugerido por `slugDeNome`, editável.
- `src/hooks/useGradeAdmin.ts` — estado e rede, no espírito do `useFluxoEvento`:
  `salvandoId`, `erro`, `confirmaId`, e `router.refresh()` depois de cada
  gravação (a lista sempre é o retrato do banco, nunca estado local).

**Ligação**: botão "Editar grade" no topo do `PainelAdmin`, ao lado de `SAIR`;
`← voltar ao painel` no topo de `/admin/grade`.

**Cor**: `<input type="color">` mais atalhos com a paleta do `DESIGN.md`
(`#5457C5` índigo · `#12897E` teal · `#C77A0E` âmbar · `#C13F7A` magenta ·
`#7C4DBB` violeta).

**Sobreposição de horário**: não bloqueia (pode haver optativa em paralelo), mas
mostra aviso discreto na linha: "sobrepõe Banco de Dados II (19:00–20:40)".
Duplicata exata continua bloqueada pelo banco (409).

**Confirmação de exclusão**: inline, no padrão que o `PainelAdmin` já usa
("apagar? sim / não") — nada de `window.confirm`.

**Estilos**: estender `src/styles/admin.css`. Zero cor literal nova.

### Passo 8 — QA manual no preview

Antes de começar: **backup (§4.1)** e **desligar "Grade divulgada"** no `/admin`
de produção (§4.2).

1. `/admin/grade` sem sessão → só o formulário de login; nenhum dado no HTML
   (conferir no "ver código-fonte").
2. Criar aula válida → aparece no bloco do dia, na posição certa por horário.
3. Criar aula com fim antes do início → erro na hora, nada é salvo.
4. Criar aula idêntica a uma existente → mensagem de duplicata (não stack trace).
5. Criar aula sobreposta (horário diferente, faixa cruzada) → salva **com** aviso.
6. Editar horário e sala de uma aula → reflete na agenda pública (`/`).
7. Excluir aula → some da grade pública.
8. Criar matéria nova (slug sugerido) → aparece nos filtros da agenda e no
   `<select>` de matéria do `/admin`.
9. Editar nome/professor/cor → cor muda no ponto, no filete e no chip. **Corrigir
   aqui os quatro professores placeholder.**
10. Excluir matéria com aula vinculada → 409 com a contagem; nada apagado.
11. Excluir matéria sem vínculo → some de tudo.
12. Recarregar a página: tudo persistiu (é banco, não estado local).
13. Duas abas abertas: alterar numa, `router.refresh()` na outra reflete.
14. Mobile 360px: alvos ≥44px, sem scroll horizontal, formulário inline usável.
15. Desktop ≥1000px: cinco blocos alinhados.
16. Tema claro e escuro.
17. Teclado: Tab alcança todos os controles, foco sempre visível, Esc fecha o
    formulário inline aberto.
18. **Teste de aceitação**: montar a grade real do 4º período inteira pela
    interface, sem tocar em SQL.

### Pronto quando

A grade do 4º período está no banco, cadastrada pela interface, com os
professores de verdade — e o SQL Editor não foi aberto nenhuma vez para isso.

Depois do merge: **religar "Grade divulgada"** antes de 10/08.

---

## 7. E2 — Eventos contínuos (F1) + editar eventos (F3)

**Branch**: `feat/e2-eventos-continuos`
**Por que juntas**: mexem nos mesmos seis arquivos (`types`, `schema`, adaptadores,
`agenda.ts`, `PreviewEvento`, `PainelAdmin`). Separá-las dobraria o retrabalho.

### Passo 1 — Banco (`supabase/0005_data_fim.sql`)

```sql
alter table eventos add column data_fim date;
alter table eventos
  add constraint eventos_periodo_check check (data_fim is null or data_fim > data);
create index eventos_data_fim_idx on eventos (data_fim);
```

Repare no **`>` estrito**: um período de um dia só é representado como
`data_fim = null`. Uma representação canônica só, sempre — o schema normaliza
antes de gravar (Passo 3).

**Migração dos dados** (só **depois** do merge em produção, com backup):

```sql
update eventos
   set titulo = 'Renovação de matrícula',
       data_fim = '2026-08-09',
       observacao = 'Renovação e escolha de disciplinas — via SUAP'
 where id = 21;
delete from eventos where id = 22;
```

### Passo 2 — Tipos

`Evento` e `EventoParseado` ganham `data_fim: string | null`. `NovoEvento` herda.
No `db/local.ts`, normalizar registros antigos na leitura (mesmo padrão do
`banco.config ??=`): `for (const e of banco.eventos) e.data_fim ??= null;`.

### Passo 3 — Validação

```ts
export const EventoParseadoSchema = z
  .object({ /* … */ data_fim: z.string().regex(REGEX_DATA).nullable() })
  // período de um dia é evento pontual: some com a representação duplicada
  .transform((e) => (e.data_fim === e.data ? { ...e, data_fim: null } : e))
  .refine((e) => !e.data_fim || !e.data || e.data_fim > e.data, {
    message: "A data final precisa ser depois da inicial.",
    path: ["data_fim"],
  });
```

Atenção à ordem: `transform` antes de `refine`, e `NovoEventoSchema` continua
derivando de `EventoParseadoSchema` (data obrigatória).

### Passo 4 — Lógica pura (`src/lib/agenda.ts`)

Funções novas, todas puras e testadas:

```ts
/** Último dia do evento: o fim do período, ou a própria data. */
export function fimDe(e: Evento): string;
/** É um período (tem data_fim)? */
export function ehPeriodo(e: Evento): boolean;
/** O evento cobre esta data? */
export function ativoEm(e: Evento, dataIso: string): boolean;
/** Período que já começou e ainda não terminou. */
export function emAndamento(e: Evento, hojeIso: string): boolean;
/** Períodos rolando hoje (a faixa "em andamento" da tela). */
export function continuosAtivos(eventos: Evento[], hojeIso: string, filtro?: string | null): Evento[];
```

Mudanças nas existentes:

- **`eventosFuturos`** — filtro passa de `e.data >= hoje` para `fimDe(e) >= hoje`;
  ordenação pela **data de referência** `max(e.data, hoje)`, para que um período em
  andamento ordene como "hoje" e não pelo início, que já passou.
- **`proximoEvento`** — regra explícita, nesta ordem:
  1. candidatos = não-cancelamento, aplicando o filtro de matéria;
  2. se houver evento que **ainda não começou** (ou é de hoje com hora ≥ agora),
     o primeiro deles é o "Próximo";
  3. **senão**, o período em andamento que termina primeiro;
  4. senão, `null`.

  Ou seja: um período longo em andamento (renovação de matrícula) **não rouba** o
  hero de uma prova que vem em 3 dias — ele tem faixa própria. Só assume o hero
  quando não há mais nada à frente.
- **`itensDeHoje`** — períodos **não** entram na régua cronológica (repetiriam
  todo dia, sem hora). Vivem na faixa "em andamento", acima da timeline.
- **`montarSemana`** — o evento casado por aula passa a usar `ativoEm(e, data)` em
  vez de `e.data === data`; `DiaDaSemana` ganha `continuos: Evento[]`.

### Passo 5 — Parser (os dois caminhos, sempre)

**Claude** (`parser/claude.ts`): `data_fim` no `SaidaClaude`, regra no prompt
("de 4/8 a 9/8", "entre os dias X e Y", "recesso de 20/12 a 05/01" → preencha
`data_fim`; evento de um dia → `null`), e saneamento igual ao dos outros campos
(formato inválido ou `data_fim <= data` → `null` + aviso, nunca descartar a
resposta inteira).

**Regras** (`parser/regras.ts`): nova `acharPeriodo(normal, hojeIso)`, **tentada
antes** de `acharData`. Padrões: `de X a Y`, `de X até Y`, `do dia X ao dia Y`,
`entre os dias X e Y`, `X a Y` quando as duas são datas numéricas.

> **Armadilha da virada de ano**: "recesso de 20/12 a 05/01" — a data final cai
> num ano menor que a inicial. Regra: se `fim < ini`, soma 1 ano ao fim. Sem isso,
> o `check` do banco rejeita e o admin vê um erro sem explicação.

### Passo 6 — Edição de eventos (F3)

- `Database.updateEvento(id: number, campos: NovoEvento): Promise<Evento | null>`
  nos dois adaptadores (id e `created_at` **preservados**).
- `PATCH /api/eventos/[id]`: `exigirSessao` + `NovoEventoSchema` + `materiaExiste`
  (agora via helper do Passo 0.2) + 404 quando não existe.
- `useFluxoEvento` ganha `editandoId: number | null`; `salvar()` decide entre POST
  e PATCH; feedback "✓ Evento atualizado".
- `PainelAdmin`: botão ✎ ao lado do ✕, que carrega o evento no `PreviewEvento`
  (com a origem rotulada "edição"). Cancelar não deixa resíduo.

### Passo 7 — Interface

- `PreviewEvento`: checkbox "É um período (vários dias)" → revela "Data final".
  Vem marcado quando o parser devolveu `data_fim`. Validação inline.
- `EventoLinha`: com `data_fim`, o bloco de data mostra o intervalo
  (`04 → 09 ago`) e o corpo ganha o selo "em andamento" quando `emAndamento`.
- `HeroProximo`: quando o hero é um período em andamento, a contagem vira
  **"termina em N dias"** (`diffDias(hoje, fimDe(e))`) em vez de "passou".
- `ProximoDetalhe`: mesma leitura na contagem regressiva grande.
- Faixa "em andamento" acima da timeline de "Hoje" e no topo dos dias cobertos na
  grade da semana — **cor neutra**, nunca cor de matéria (os dois códigos de cor
  não se misturam; ver `DESIGN.md`).
- `PainelAdmin` linha 59: `futuros`/`passados` passam a separar por `fimDe(e)`,
  senão um período em andamento cai em "eventos passados".

### Passo 8 — Testes

Casos obrigatórios em `agenda.test.ts` e `regras.test.ts`:

1. `ativoEm` nas bordas: primeiro dia, último dia, véspera, dia seguinte
2. `fimDe` sem `data_fim` → a própria data
3. Período em andamento aparece em `eventosFuturos` mesmo com início no passado
4. Período terminado ontem **não** aparece
5. Ordenação: período em andamento × evento pontual de hoje × evento de amanhã
6. `proximoEvento` **ignora** período em andamento quando há evento futuro
7. `proximoEvento` **assume** o período quando não há mais nada
8. `itensDeHoje` não lista períodos
9. `montarSemana` marca `continuos` nos cinco dias de um recesso de 2 semanas
10. Período atravessando virada de mês e de ano
11. Período de um dia (`data_fim === data`) é normalizado para `null` pelo schema
12. `data_fim < data` → rejeitado pelo schema
13. Parser: "de 4/8 a 9/8" → data + data_fim
14. Parser: "recesso de 20/12 a 05/01" → fim no ano seguinte
15. Parser: "prova dia 13/07" continua sem `data_fim` (nenhuma regressão)
16. Parser Claude: `data_fim` malformada → `null` + aviso, resto preservado
17. `updateEvento` preserva id e `created_at`
18. `PATCH` de id inexistente → 404

### Pronto quando

A renovação de matrícula é **um** evento com período, aparece como faixa "em
andamento" em Hoje, na grade e na lista, o hero continua mostrando a prova mais
próxima em vez dela — e dá para corrigir um evento errado sem apagar e recriar.

---

## 8. Entregas seguintes (esboço; detalhadas ao serem confirmadas)

Cada uma segue o mesmo ritual (§5) e a mesma ordem canônica (§1).

### E3 — Feriados e recessos (F2)

- `supabase/0006_feriados.sql`: recriar `eventos_tipo_check` com
  `'feriado'` e `'recesso'` (afrouxar check = seguro, §3.1).
- `TIPOS_EVENTO` cresce; o zod acompanha sozinho.
- `agenda.ts`: `feriadoEm(eventos, dataIso)`; em dia de feriado `montarSemana`
  devolve `aulas: []` + `feriado`, e `itensDeHoje` suprime as aulas.
- Feriado **não** vira hero (é ausência, como cancelamento), mas aparece na lista.
- Tokens `--badge-feriado-*` e `--badge-recesso-*` nos dois temas, contraste AA.
- Parser nos dois caminhos: "feriado dia 7/9", "recesso de 20/12 a 05/01".
- Opcional: `supabase/feriados_2026_2.sql` com o calendário do IFG para o
  semestre, revisado por você antes de rodar.
- QA com datas de 2027 e limpeza (§4.3).

### E4 — Meu Classdays (F5)

- `usePreferencias()` sobre `localStorage`, chave `classdays:prefs:v1`,
  `{ materiasOcultas: string[] }`, validando ids que não existem mais.
- **Hydration**: estado inicial vazio (igual ao servidor), leitura em `useEffect`
  pós-mount. A agenda aparece inteira e "encolhe" num frame — honesto e sem
  mismatch. (`useLayoutEffect` não serve: avisa no SSR.)
- Filtro aplicado em `AgendaAluno` **antes** das funções puras; eventos gerais
  (`materia_id: null`) nunca somem.
- Se a matéria do filtro ativo for ocultada, o filtro volta para "Todas".
- Aviso discreto "N matérias ocultas · Meu Classdays" — ninguém pode achar que a
  agenda quebrou.
- Item no `ITENS_NAV` do `MenuLateral` (a lista já está preparada).

### E5 — Sino in-app (F6a) — ✅ entregue

Como foi planejado:

- `eventosNoIntervalo(eventos, hoje, dias)` puro em `agenda.ts`, respeitando as
  ocultas da E4.
- Não lido: `localStorage` guarda o maior `created_at` já visto; badge conta o que
  veio depois.
- Painel reaproveita o `Drawer`; cada item leva à âncora `sec-{id}` existente.

Como ficou (as duas primeiras linhas mudaram na prática):

- Candidato é `eventosFuturos()`, não a janela de 7 dias — quem cadastra hoje um
  evento de setembro quer avisar a turma **hoje**. Novidade é o cadastro, não a
  proximidade da data; `eventosNoIntervalo` saiu junto com os testes dela.
- Estado de leitura é **lista de ids** (`classdays:sino:v2`, teto de 200, com
  migração da v1 por timestamp), não um timestamp — o modelo antigo fazia um
  evento nascer lido se tivesse sido criado antes da última visita.
- **Estreia** (quem chega sem nada no `localStorage`): nasce lido só o que tem
  mais de 24h de cadastro — ver E5.5.
- `painelPorGrupo()` divide o painel em "Novidades" e "Já vistas"; abaixo de
  640px o sino sai da topbar e as notificações moram no menu lateral.

**Polimento** (branch `feat/e5-sino`, commits `722672a`, `b2bf989` e `d5ee462`):

- ✅ **E5.1 — QA headless reescrito para a UI nova.** Dois caminhos de abertura
  (hambúrguer → "Notificações" no celular, `.sino-btn` no desktop), asserts de
  `.menu-dot`, `.drawer-nav-badge` e dos dois grupos na ordem certa.
- ✅ **E5.2 — Regressões de layout viraram checagem.** Sem scroll horizontal em
  320/360/390/430px, URL longa contida no cartão e barra do painel ocupando 0px
  **com o scroll ainda vivo**. A de 320px pegou um bug de verdade, e não era a
  topbar: o balão "GitHub" do rodapé (absolute + `nowrap`, invisível mas com
  caixa) empurrava a página 14px. Corrigido em `d5ee462`.
- ✅ **E5.3 — Telas recapturadas** em `scratchpad/shots` (claro, escuro,
  desktop, topbar em 320px, cartão com a URL longa). Contraste do título já
  lido: 6.6:1 no claro, 7.8:1 no escuro.
- ✅ **E5.4 — Fechar a entrega.** Gate completo verde (tsc, build, lint nos
  mesmos 10 erros pré-existentes) e QA de tela com 47 checagens verdes.
  `feat/e5-sino` mergeado em `main` (`3464be3`).
- ✅ **E5.5 — A fumaça no celular achou o bug que o emulador não acha.** Evento
  cadastrado no admin, site aberto pela primeira vez no telefone: **nenhum
  ponto**. Não era o `localStorage` falhando — era ele funcionando conforme o
  escrito. `vistosIniciais(candidatos, null)` devolvia a janela INTEIRA como
  lida, então a estreia começava calada por definição, e o evento de minutos
  atrás junto. Sintoma idêntico em qualquer storage perdido: aba anônima, ou o
  Safari podando o site de quem passou uma semana sem abrir.

  Como ficou (`JANELA_ESTREIA_MS`, 24h):

  - **Estreia** — nasce lido o que foi cadastrado há mais de 24h; o que entrou
    nas últimas 24h é novidade. É o único aviso que o sino tem como dar a quem
    acabou de chegar, e não custa o badge-de-agenda-inteira que a baseline
    antiga evitava. O resto o aluno acha navegando.
  - **Quem já entrou** — segue por ids, sem prazo: toda novidade que ele não
    viu conta, tenha ela um dia ou um mês. A janela de 24h é da estreia, não do
    app.
  - A baseline é gravada **na chegada**, não só ao abrir o painel: prende o
    corte ao instante da estreia, senão a janela deslizaria a cada reload e o
    aviso não lido se apagaria sozinho ao completar 24h.
  - Corte por instante (`Date.parse`), não por string: `created_at` chega
    `+00:00` do Postgres e `Z` do navegador, e como texto os dois comparam
    errado.
  - `vistosIniciais` agora recebe o `agoraIso` (o relógio do aparelho, já
    depois do mount — nada de hydration mismatch). 30 testes em `sino.test.ts`,
    incluindo o roteiro fim a fim: as três funções estavam certas em separado e
    erravam encadeadas.

### E6 — Web Push / PWA (F6b)

- `manifest.json` + `sw.js` (`push`, `notificationclick`), registro no layout.
- Tabela `push_subscriptions` com RLS **sem policy** (só service_role).
- Chaves VAPID em env; `POST`/`DELETE /api/push/subscribe`.
- `GET /api/push/send` protegida por `CRON_SECRET`, disparada por Vercel Cron
  (`0 10 * * *` UTC = 07:00 BRT); remove subscription que responder 404/410.
- iOS só entrega push com o app adicionado à tela de início (16.4+) — o texto do
  opt-in precisa dizer isso; o sino da E5 cobre quem não instalar.

---

## 9. Roteiro de fumaça (depois de todo merge em produção)

Dois minutos, sempre os mesmos passos, no celular:

1. `classdays.net` abre sem erro (e o alias `classdays.vercel.app` também).
2. "Hoje" mostra o esperado para o dia.
3. A grade da semana bate com a realidade; navegar uma semana para frente e voltar.
4. O card "Próximo" mostra o evento certo, com a contagem certa.
5. `/admin` pede senha; login funciona; a lista de eventos aparece.
6. Criar um evento de teste com data de 2027 → aparece na lista → apagar.
7. Tema escuro e claro.
8. Vercel → Logs: nenhum erro novo nos últimos minutos.

---

## 10. Riscos e como cada um morre

| Risco | Como morre |
|-------|-----------|
| Testar o editor de grade estraga a grade que a turma vê | Backup (§4.1) + "Grade divulgada" desligada durante o QA (§4.2) |
| Migration quebra o código que já está em produção | Só migrations aditivas (§3.1); migration antes do código, nunca depois |
| Evento de tipo novo criado no preview aparece torto em produção | Selo neutro no estado base do `.badge`, entregue já na E1 (§4.4) |
| Adaptador Supabase implementado e o local esquecido | §3.2; a suíte de testes roda no local e quebra na hora |
| Campo novo entra num parser e não no outro | Checklist do Passo 5/E2: Claude **e** regras, com teste para cada |
| Período atravessando a virada do ano vira data inválida | Regra explícita "fim < início → +1 ano" + teste 14 (E2) |
| `localStorage` causando hydration mismatch | Estado inicial igual ao do servidor, leitura pós-mount (E4) |
| URL do preview vazando dados reais e o `/admin` | Vercel Authentication ligada no ambiente Preview (§4.5) |
| Perder o prazo de 10/08 | E1 é a primeira entrega e o teste de aceitação dela **é** cadastrar a grade real |

---

## 11. Domínio classdays.net — ✅ no ar (27/08/2026)

O `layout.tsx` já declarava `metadataBase: new URL("https://classdays.net")`, ou
seja, o código estava pronto antes da infra. O Lucas comprou o domínio e
apontou; os passos 1–4 estão feitos e verificados:

1. ✅ Domínio registrado e sob controle do Lucas.
2. ✅ Vercel → Domains com `classdays.net` e `www.classdays.net`.
3. ✅ DNS apontado e certificado TLS emitido — apex responde 200, verificação de
   certificado limpa.
4. ✅ `classdays.net` é o domínio de produção; `www` redireciona pro apex e
   `classdays.vercel.app` segue respondendo como alias (links antigos vivos).
5. ⬜ Conferir no celular: preview de link no WhatsApp com imagem e título
   corretos (o `opengraph-image` é gerado no build; só um aparelho real diz se
   o WhatsApp pegou).
6. ⬜ Divulgar o endereço novo para a turma.

---

## 12. Como abrir a sessão do executor

Modelo de briefing para cada entrega (trocar apenas a linha do topo):

```
Implemente a entrega E1 de docs/PLANO-V2.md — Fundação + grade e matérias no /admin.

Regras:
- Siga os passos na ordem do documento. Não pule para a UI antes dos passos 0–6.
- Leia §3 (regras invioláveis) e §5 (ritual) antes de escrever qualquer código.
- Todo método novo do contrato Database entra nos DOIS adaptadores no mesmo commit.
- Ao fim de cada passo: npx tsc --noEmit && npm test.
- Não rode migration nem faça merge: pare e reporte quando o código estiver pronto
  e os três comandos do DoD estiverem verdes.
- Se algo no plano estiver errado ou impossível, pare e explique — não improvise
  uma solução diferente sem avisar.
```
