# Classdays

Calendário acadêmico da turma — grade da semana, provas, entregas e cancelamentos,
num link público que se entende em segundos. O admin (representante de turma)
cadastra eventos **escrevendo uma frase em português**:

> *"dia 13/07 haverá prova de álgebra linear"*
> *"na próxima terça não haverá aula"*

O sistema transforma isso em evento estruturado, mostra um **preview editável** e só
salva quando o admin confirma.

**No ar:** https://classdays.vercel.app

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
npm test          # 79 testes (datas relativas, cancelamentos, parser)
npm run build      # build de produção
```

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

## Estrutura

```
src/
  app/                    páginas e rotas de API (App Router)
    page.tsx              agenda do aluno (pública)
    admin/page.tsx        painel do representante (protegido por cookie)
    api/                  parse, eventos, login/logout
  components/             UI (agenda/ e admin/)
  lib/
    agenda.ts             lógica pura: semana × cancelamentos, "próximo"
    dates.ts              datas no fuso de Brasília (o servidor roda em UTC)
    parser/                regras locais + chamada ao Claude + schemas zod
    db/                    contrato + adaptadores (JSON local / Supabase)
supabase/                  SQL: schema com RLS + seed
docs/COMO-FUNCIONA.md      passeio guiado pelo código, decisão por decisão
```

## Deploy (resumo)

1. **Supabase**: crie um projeto, rode `supabase/0001_schema.sql` e `0002_seed.sql`
   no SQL Editor, copie URL + anon key + service_role key.
2. **Vercel**: importe o repositório e cadastre as variáveis do `.env.example`.
3. Com as variáveis do Supabase presentes, o app troca de banco sozinho — nenhuma
   linha de código muda.

## Documentação

- [`docs/COMO-FUNCIONA.md`](docs/COMO-FUNCIONA.md) — passeio guiado pelo código:
  cada peça, o porquê de cada decisão, e o que estudar em cada arquivo.
