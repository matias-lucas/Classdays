# Como o Classdays funciona — um passeio guiado

Este documento existe porque o objetivo do projeto não é só *ter* um app, é
**entender cada peça dele**. Leia com o código aberto do lado; cada seção aponta
os arquivos. A ordem foi pensada para estudar de ponta a ponta.

---

## 1. O mapa em 60 segundos

```
o aluno abre /            o admin abre /admin
        │                         │
        ▼                         ▼
  page.tsx (servidor)      admin/page.tsx (servidor, exige cookie)
        │ lê o banco              │ lê o banco
        ▼                         ▼
  AgendaAluno (navegador)  PainelAdmin (navegador)
   filtros, semanas,        frase → /api/parse → preview editável
   "próximo" ao vivo        confirmar → /api/eventos → salvo
```

Duas telas, quatro rotas de API, uma camada de dados com dois "motores"
(JSON local em dev, Supabase em produção) e dois interpretadores de frase
(Claude e regras locais). Todo o resto é detalhe destas peças.

---

## 2. Servidor vs navegador (o conceito que organiza o Next)

**Server component** é componente React que roda **no servidor**: pode ler banco
e segredos, e manda para o navegador só o HTML pronto. **Client component**
(arquivo começando com `"use client"`) roda **no navegador**: pode ter estado,
cliques, relógio.

No Classdays:

- [`src/app/page.tsx`](../src/app/page.tsx) é server: busca matérias/grade/eventos
  e entrega tudo como *props*.
- [`src/components/agenda/AgendaAluno.tsx`](../src/components/agenda/AgendaAluno.tsx)
  é client: guarda o filtro escolhido, a semana exibida e um relógio que
  re-calcula o card "Próximo" a cada minuto.

Repare no detalhe de `hojeInicial`/`agoraInicial`: o servidor calcula "hoje" e
"agora" (no fuso de Brasília) e **passa por props**. Se o navegador calculasse
por conta própria no primeiro render, servidor e navegador poderiam desenhar
telas diferentes — o erro de *hydration mismatch*. Primeiro render idêntico;
depois de montado, o relógio local assume.

O `export const dynamic = "force-dynamic"` na página desliga o cache do Next
para essa rota: cancelamento salvo às 18h aparece pra quem abrir às 18h01.

---

## 3. A lógica do domínio é pura ([`src/lib/agenda.ts`](../src/lib/agenda.ts))

As três perguntas centrais do app são respondidas por funções que **não tocam
banco, relógio nem tela** — recebem dados, devolvem dados:

- `montarSemana(grade, cancelamentos, segunda)` → os 5 dias úteis, cada aula já
  marcada com seu cancelamento (de dia inteiro ou só da matéria);
- `proximoItem(grade, eventos, hoje, agora, filtro)` → o que vem agora
  (aulas não canceladas + eventos futuros, ordenados por data/hora);
- `eventosFuturos(eventos, hoje, filtro)` → a lista de baixo.

Por que puras? Porque aí dá pra **testar com data fixa**
([`agenda.test.ts`](../src/lib/__tests__/agenda.test.ts)): "se hoje é terça
07/07 às 19h30 e a primeira aula já começou, o próximo é a aula das 20h50".
São 15 testes desses. Regra de negócio testável = regra de negócio confiável.

O **cancelamento** (decisão do CLAUDE.md) é só um evento com
`tipo: "cancelamento"`: `materia_id` null derruba o dia; preenchido, derruba só
aquela aula. A grade real nasce do cruzamento grade fixa × cancelamentos.

---

## 4. Datas sem pegadinha ([`src/lib/dates.ts`](../src/lib/dates.ts))

Dois princípios:

1. **Data de calendário viaja como string** `"AAAA-MM-DD"`, nunca como `Date`.
   `Date` carrega fuso junto e produz o clássico "a prova aparece um dia antes".
2. **"Hoje" é sempre calculado no fuso de Brasília** (`America/Sao_Paulo`),
   porque o servidor da Vercel vive em UTC: às 23h daqui já é amanhã lá. Sem
   isso, o calendário viraria o dia três horas mais cedo.

Curiosidade que virou comentário no código: `horaAgora` usa `hourCycle: "h23"`
em vez de `hour12: false`, porque alguns engines devolvem `"24:00"` à meia-noite
no segundo caso — e `"24:00" >= "19:00"` daria comparação errada de string.

`proximoDiaDaSemana` resolve o "próxima terça": dito numa terça, pula pra
semana seguinte; "sexta que vem" dito numa terça é a sexta desta semana (uso
coloquial). O preview sempre mostra a data resolvida — ambiguidade nunca entra
no banco escondida.

---

## 5. Um banco, dois motores ([`src/lib/db/`](../src/lib/db))

[`index.ts`](../src/lib/db/index.ts) define o **contrato** (`Database`): cinco
operações (`getMaterias`, `getGrade`, `getEventos`, `addEvento`,
`deleteEvento`). O resto do app só conhece esse contrato.

- [`local.ts`](../src/lib/db/local.ts): um JSON em `data/db.json`, criado do
  seed na primeira leitura. Zero dependências para desenvolver. Apagar o
  arquivo = resetar o banco.
- [`supabase.ts`](../src/lib/db/supabase.ts): as mesmas cinco operações contra
  o Postgres. Detalhe de compatibilidade: o Postgres devolve `time` como
  `"19:00:00"`, e o adaptador normaliza para `"19:00"` — os dois motores se
  comportam **identicamente** do lado de fora.

A escolha é automática: variáveis do Supabase presentes → Supabase; ausentes →
local. Trocar de banco = preencher o `.env.local`. Nenhuma linha de código muda.

No SQL ([`supabase/0001_schema.sql`](../supabase/0001_schema.sql)) vale estudar
o **RLS** (Row Level Security): qualquer um pode LER as três tabelas (a agenda é
pública), ninguém escreve pela chave pública. As escritas do admin usam a
`service_role` key — que ignora RLS e existe **só no servidor**.

---

## 6. O input inteligente ([`src/lib/parser/`](../src/lib/parser))

O fluxo completo, começando na tela:

1. O admin digita a frase no [`PainelAdmin`](../src/components/admin/PainelAdmin.tsx)
   e clica "Interpretar".
2. [`/api/parse`](../src/app/api/parse/route.ts) (servidor) monta o contexto —
   **data de hoje** + **lista de matérias** — e escolhe o intérprete:
   - com `ANTHROPIC_API_KEY`: [`claude.ts`](../src/lib/parser/claude.ts). A
     chamada usa *structured outputs*: o schema (zod) vai junto da requisição e
     a API do Claude **garante** que a resposta é um JSON válido naquele
     formato. Nada de "responda só JSON, por favor" e torcer.
   - sem chave (ou se a chamada falhar): [`regras.ts`](../src/lib/parser/regras.ts),
     um parser de expressões regulares em português que cobre o dia a dia:
     dd/mm, "13 de agosto", "amanhã", "próxima terça", "às 19h30", tipos por
     palavra-chave, matéria por casamento de tokens ("banco de dados" → `bd`).
     São 32 testes ([`regras.test.ts`](../src/lib/parser/__tests__/regras.test.ts)).
3. A regra de ouro dos dois: **nunca inventar**. Frase sem data → `data: null` +
   aviso. O card de preview obriga a preencher antes de salvar.
4. O preview ([`PreviewEvento`](../src/components/admin/PreviewEvento.tsx)) é
   **editável**: parsing é probabilístico, e a edição inline transforma "quase
   certo" em "certo" sem redigitar. Só o clique em "Confirmar" chama
   [`/api/eventos`](../src/app/api/eventos/route.ts) e salva.

A chave da API mora no `.env.local` e é lida **só** dentro da rota (servidor).
O navegador nunca a vê.

---

## 7. A porta do admin ([`src/lib/auth.ts`](../src/lib/auth.ts))

Só existe um admin, então nada de tabela de usuários. O esquema:

- a senha vive em `ADMIN_PASSWORD` (variável de ambiente);
- login certo → o servidor grava num **cookie httpOnly** um "carimbo" =
  HMAC-SHA256 derivado da senha. HMAC é uma assinatura: só quem conhece a
  senha produz aquele valor;
- cada request protegida recalcula o carimbo e compara (em tempo constante,
  `timingSafeEqual`, para não vazar informação pela demora).

Sem sessão em banco, sem estado no servidor; trocar a senha derruba todas as
sessões na hora. `httpOnly` significa que nem o próprio JavaScript da página
consegue ler o cookie — proteção contra XSS.

A página `/admin` faz a checagem **no servidor** antes de qualquer dado sair
(sem sessão, desce só o formulário de login — os eventos nem viajam). As rotas
de API repetem a checagem: a página protege a tela, as rotas protegem os dados.

---

## 8. Validação nas fronteiras ([`src/lib/parser/schema.ts`](../src/lib/parser/schema.ts))

Princípio: valida-se o que vem do **mundo externo** (corpo de request, resposta
do Claude); código interno confia nos tipos. Os schemas zod definem o formato
uma vez e as rotas usam `safeParse` — request malformada devolve 400 com
mensagem legível em vez de quebrar por dentro.

---

## 9. Testes (`npm test`)

60 testes em três arquivos, todos de lógica pura (rodam em milissegundos):

| Arquivo | O que garante |
|---|---|
| `dates.test.ts` | fuso de Brasília, aritmética de calendário, "próxima terça" |
| `agenda.test.ts` | semana × cancelamentos, o card "Próximo" em cada hora do dia |
| `regras.test.ts` | as frases do CLAUDE.md e variações (datas, horas, tipos, matérias) |

O que NÃO está coberto por teste automatizado: as telas (verificadas manualmente
e por screenshot) e a chamada real ao Claude (verificada quando houver chave).

---

## 10. Levando ao ar (Etapa 4 do roadmap)

1. **Supabase** — criar projeto em supabase.com → SQL Editor → colar e rodar
   `0001_schema.sql`, depois `0002_seed.sql` (com a grade REAL, não o seed de
   exemplo) → Project Settings → API → copiar URL, anon key e service_role key.
2. **Vercel** — importar o repositório do GitHub → em Environment Variables,
   cadastrar tudo do `.env.example` (Supabase + `ADMIN_PASSWORD` forte +
   `ANTHROPIC_API_KEY` se houver) → Deploy.
3. Testar o link no celular, cadastrar um evento de verdade, mandar no grupo. 🎓

---

## 11. Onde mexer para…

| Quero… | Mexa em… |
|---|---|
| pôr a grade real da turma | `src/lib/db/seed.ts` **e** `supabase/0002_seed.sql` (apague `data/db.json` p/ re-seedar) |
| mudar nome do curso/período | `src/lib/config.ts` |
| mudar cores de matéria | coluna `cor` no banco/seed (a UI segue sozinha) |
| mudar a senha do admin | `ADMIN_PASSWORD` no `.env.local` / Vercel |
| ligar o Claude | `ANTHROPIC_API_KEY` no `.env.local` (console.anthropic.com) |
| mudar o modelo do parsing | `CLAUDE_PARSER_MODEL` (padrão: `claude-opus-4-8`) |
| ajustar o visual | tokens em `src/app/globals.css` + `DESIGN.md` |

---

## 12. Glossário relâmpago

- **App Router** — o sistema de rotas do Next: pastas em `src/app` viram URLs;
  `page.tsx` é página, `route.ts` é API.
- **Server/client component** — seção 2.
- **Hydration** — o navegador "religa" o HTML que veio do servidor, tornando-o
  interativo. Mismatch = servidor e navegador desenharam coisas diferentes.
- **Route handler** — função `GET`/`POST` num `route.ts`; é o "backend" do app.
- **RLS** — Row Level Security do Postgres: regras de acesso por linha,
  aplicadas pelo próprio banco.
- **HMAC** — assinatura baseada em segredo compartilhado; prova que quem gerou
  o valor conhece o segredo.
- **Structured outputs** — modo da API do Claude em que a resposta
  obrigatoriamente segue um JSON Schema.
- **Seed** — dados iniciais plantados no banco.
- **`.env.local`** — segredos locais, fora do git; na Vercel viram Environment
  Variables.
