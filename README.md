# Classdays

Calendário acadêmico da turma — grade da semana, provas, entregas, cancelamentos,
períodos e feriados, num link público que se entende em segundos. O admin
(representante de turma) cadastra eventos **escrevendo uma frase em português**:

> *"dia 13/07 haverá prova de álgebra linear"*
> *"na próxima terça não haverá aula"*
> *"recesso de 20/12 a 05/01"*

O sistema transforma isso em evento estruturado, mostra um **preview editável** e só
salva quando o admin confirma.

**No ar:** https://classdays.net (alias: `classdays.vercel.app`)

## Por que existe

Notion não interpreta texto livre e a página pública não fica limpa; Google Agenda
mistura tudo numa timeline sem responder "o que vem agora?". O Classdays resolve as
duas coisas que importam: **input inteligente** para quem cadastra e **leitura
instantânea** para quem consulta — a próxima aula ou evento no topo, a semana real
(com cancelamentos) logo abaixo.

## Stack

| Peça | Papel |
|---|---|
| **Next.js 16** (App Router) | front (React) + rotas de API no mesmo projeto |
| **Supabase** (Postgres) | banco em produção — em dev, um JSON local assume automaticamente |
| **API do Claude** | frase → JSON (structured outputs); sem chave configurada, um parser de regras locais em pt-BR assume |
| **Vercel** | hospedagem |

Sem framework de CSS: design system próprio, portado de um protótipo aprovado, com
tipografia IBM Plex + Space Grotesk.

## Rodando localmente

```bash
git clone https://github.com/matias-lucas/Classdays.git
cd Classdays
npm install
cp .env.example .env.local   # defina ADMIN_PASSWORD (mín. 6 caracteres)
npm run dev
```

Abra http://localhost:3000 — a agenda funciona na hora com um banco local
(`data/db.json`, criado sozinho a partir do seed). O `/admin` usa a senha do
`.env.local`. Nenhuma chave externa é necessária para desenvolver: sem Supabase o
banco é local; sem `ANTHROPIC_API_KEY` o input inteligente usa as regras locais.

```bash
npm test           # vitest: 245 testes em 11 arquivos (contagem de 14/10/2026)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint, sem erros nem avisos
npm run build      # build de produção
```

Os quatro formam o gate de toda entrega (§Definition of Done do
[`docs/ROADMAP.md`](docs/ROADMAP.md)). A suíte cobre a lógica pura da agenda
(semana × cancelamentos, períodos, feriados, "próximo"), as datas no fuso de
Brasília, os dois parsers, o sino, o banco local e as rotas de API de eventos,
grade e matérias.

## Como o input inteligente funciona

```
/admin → frase → POST /api/parse → frase + data de hoje + matérias → Claude
                                                │
                                (sem chave ou falha: parser de regras locais)
                                                ▼
                          card de PREVIEW editável  <—  JSON estruturado
                                                │
                        admin confirma → POST /api/eventos → banco → agenda da turma
```

O preview é a peça de segurança: nada entra no banco sem passar pelos olhos do
admin. A resposta do Claude usa *structured outputs* (o schema vai na requisição e a
API garante o formato) e a chave vive só no servidor.

## O que a v2 trouxe

A v2 (plano em [`docs/PLANO-V2.md`](docs/PLANO-V2.md), estado em
[`docs/ROADMAP.md`](docs/ROADMAP.md)) tirou o SQL Editor do dia a dia do
representante e ensinou a agenda a lidar com mais de um dia:

- **Grade e matérias editáveis no `/admin`** — em `/admin/grade`, o representante
  cria, edita e apaga as aulas da grade fixa (dia de seg a sex, horário, sala) e
  as matérias (nome, professor, cor). Apagar uma matéria que ainda tem aulas ou
  eventos apontando para ela é bloqueado com um erro claro, em vez de deixar
  histórico órfão. As rotas `/api/grade` e `/api/materias` validam com zod, e o
  banco repete as regras essenciais como constraints.
- **Eventos contínuos** — um evento pode durar um período (`data` → `data_fim`):
  *"renovação de matrícula de 4/8 a 9/8"*. Os dois parsers (Claude e regras
  locais) entendem "de X a Y", "entre os dias X e Y" e "do dia X ao dia Y".
  Enquanto o período corre, ele aparece como "em andamento" em Hoje e na grade,
  e o hero mostra quanto falta para terminar. Eventos já salvos também passaram
  a ser editáveis: o mesmo card de preview, gravado com `PATCH /api/eventos/:id`.
- **Feriados e recessos** — dois tipos novos, de um dia (*"feriado dia 7/9"*) ou
  de um período (*"recesso de 20/12 a 05/01"*, com o fim jogado para o ano
  seguinte). Na grade, ocupam o lugar das aulas do dia; na lista, têm cor
  própria. Depois, qualquer evento ganhou a mesma capacidade, marcando
  "Não haverá aula" no preview (`suspende_aulas`) — para uma olimpíada ou uma
  semana de exames, sem cadastrar um cancelamento por dia.

Também vieram com a v2 o **Meu Classdays** (cada aluno oculta as matérias que não
cursa; a preferência fica no navegador) e o **sino** de notificações in-app, que
aponta o que o aluno ainda não viu. Falta a última entrega planejada, Web Push.

## Estrutura

```
src/
  app/                    páginas e rotas de API (App Router)
    page.tsx              agenda do aluno (pública)
    admin/page.tsx        painel do representante (protegido por cookie)
    admin/grade/page.tsx  editor da grade fixa e das matérias
    api/                  parse, eventos, grade, materias, config, login/logout
  components/             UI (agenda/, admin/, layout/, ui/)
  hooks/                  estado do cliente (fluxo do /admin, preferências, sino)
  lib/
    agenda.ts             lógica pura: semana × cancelamentos e feriados, períodos, "próximo"
    dates.ts              datas no fuso de Brasília (o servidor roda em UTC)
    sino.ts               o que conta como novidade no sino (funções puras)
    parser/               regras locais + chamada ao Claude + schemas zod
    schemas/              validação zod das rotas de grade e matérias
    db/                   contrato + adaptadores (JSON local / Supabase)
supabase/                 SQL: schema com RLS, seed e migrations numeradas
docs/ROADMAP.md           estado do projeto + o que vem depois
docs/PLANO-V2.md          como cada entrega da v2 é construída, testada e publicada
```

## Deploy (resumo)

1. **Supabase**: crie um projeto e rode no SQL Editor, em ordem, os arquivos de
   `supabase/` — `0001_schema.sql`, `0002_seed.sql` e as migrations `0003` a
   `0009`, menos a `0008` (faxina de uma tabela de backup que só existiu em
   produção). Copie URL + anon key + service_role key.
2. **Vercel**: importe o repositório e cadastre as variáveis do `.env.example`.
3. Com as variáveis do Supabase presentes, o app troca de banco sozinho — nenhuma
   linha de código muda.

## Princípios de produto e design

- **Dois públicos**: alunos abrem o link no celular e respondem em segundos
  "o que vem agora? tem prova? cadê a sala?" — sem login, sem configuração.
  O representante cadastra em uma frase no `/admin` e mantém a grade e as
  matérias ali mesmo.
- **Responder antes de mostrar**: cada seção existe para responder uma pergunta;
  a hierarquia segue a urgência, não a estética.
- **Dois códigos de cor**: a cor da **matéria** (`--sc`) é o fio condutor
  (filete, pontos); a cor do **tipo** vive só no selo (prova/trabalho/…).
  Nunca disputam o mesmo elemento.
- **Acessível por regra**: contraste AA, `prefers-reduced-motion`, foco visível,
  teclado, alvos ≥44px no toque — critérios de pronto, não polimento posterior.

## Documentação

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — o que está feito (v1 e entregas da v2),
  o que falta (E6, Web Push) e pendências de infra.
- [`docs/PLANO-V2.md`](docs/PLANO-V2.md) — como cada entrega da v2 é construída,
  testada, publicada e revertida.
- `DESIGN.md` (local, fora do git) — anotações do sistema visual; a fonte da
  verdade visual é `src/styles/` (importado pelo `src/app/globals.css`).
