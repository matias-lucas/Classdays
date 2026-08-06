# Classdays — Roadmap

> Fonte da verdade entre sessões: leia isto primeiro, faça a primeira etapa
> desmarcada, atualize a caixa. Regras de qualidade em §Definition of Done.

## Feito ✅

- **Etapas 1–4 do projeto original** — app completo: agenda pública (server
  component), `/admin` com login por cookie HMAC, input inteligente
  (Claude structured outputs + fallback de regras locais pt-BR, 79 testes),
  banco com 2 adaptadores (JSON local / Supabase), datas em
  `America/Sao_Paulo`.
- **Fases 0–6** — tema escuro sem flash, drawer, timeline "Hoje",
  chips com fade+nudge, hero "Próximo" clicável (detalhe expressivo),
  arraste vertical da grade, seções recolhíveis persistidas, hardening
  (foco, alvos ≥44px, AA, reduced-motion).
- **Rodada de ajustes (2026-07-13)** — âncoras `sec-{id}` + expansão por
  evento custom; menu lateral com navegação (Próximos eventos, Painel
  admin); topbar simétrica; week-nav do rodapé como pílula segmentada;
  dot "iminente" pulsando quando falta ≤1h; splash de entrada 1x por sessão;
  docs enxutos.

- **Infra (07–07/2026)** — projeto Supabase criado e populado com a grade real
  da turma, deploy na Vercel, `/admin` protegido, link divulgado.

## Classdays v2 ⬜

Plano completo (SQL, contratos, rotas, testes, QA, deploy) em
**[`docs/PLANO-V2.md`](PLANO-V2.md)** — leia-o antes de começar qualquer
entrega. Regras que valem para todas: uma branch por entrega, migrations
sempre aditivas (preview e produção **compartilham o banco**), banco antes da
interface, e parada obrigatória para confirmação entre uma entrega e a próxima.

- ✅ **E1 — Fundação + grade e matérias no `/admin`** *(prazo: 10/08, volta das
  aulas)*. Código em `main` e em produção (merge `b21150c`, 05/08/2026): banco
  local testável, helpers de rota, selo tolerante a tipo novo, CRUD de
  `grade_horaria` e `materias` com exclusão bloqueada quando há vínculo,
  página `/admin/grade`. Verificado em produção (05/08/2026): as 5 matérias
  do 4º período com professores reais (nenhum placeholder), grade com 5 aulas
  (uma por dia, seg–sex), cadastradas pela interface, sem abrir o SQL Editor
  para a grade em si. `supabase/0004_grade_admin.sql` confirmado rodado em
  produção (06/08/2026, via MCP do Supabase).
- ✅ **E2 — Eventos contínuos + editar eventos** *(06/08/2026)*. Código em
  `main` e em produção (merge `3a50e85`): coluna `data_fim` (aditiva, já
  aplicada em produção), `fimDe`/`ehPeriodo`/`ativoEm`/`emAndamento`/
  `continuosAtivos` em `agenda.ts`, parser (Claude e regras) entendendo
  período nos dois caminhos, `PATCH /api/eventos/:id` (preserva id/created_at),
  faixa "em andamento" em Hoje e na grade, "termina em N dias" no hero. 174
  testes verdes, tsc/build limpos, preview e produção verificados por fetch
  direto (sem erro, dados reais renderizando certo). Fusão dos eventos 21/22
  concluída (06/08/2026): o evento 22 já tinha sido editado via `/admin` para
  o período 04–09/08 (`data_fim`); o 21 (ponto de início, redundante) foi
  apagado direto no banco de produção com confirmação do Lucas. Sobra um
  único evento canônico cobrindo o período.
- ⬜ **E3 — Feriados e recessos**. Tipos novos reaproveitando o período; em dia
  de feriado a grade mostra o destaque no lugar das aulas.
- ⬜ **E4 — Meu Classdays**. `localStorage` com matérias ocultas; some de
  Hoje/Grade/Próximo/Eventos; a agenda pública fica intacta para quem nunca
  configurar.
- ⬜ **E5 — Sino in-app**. Badge de não lidos sobre os eventos dos próximos
  7 dias, sem servidor.
- ⬜ **E6 — Web Push (PWA)**. Service worker, VAPID, Vercel Cron na véspera e
  no dia; iOS exige o app na tela de início.

## Pendências de infra ⬜

- Obter `ANTHROPIC_API_KEY` (parsing por Claude em produção; sem ela o parser
  de regras assume e o app roda a custo zero).
- Apontar o domínio **classdays.net** (o `metadataBase` do código já aponta
  para lá) — passo a passo em `docs/PLANO-V2.md` §11.

## Definition of Done (toda etapa)

- `npx tsc --noEmit` limpo, `npm test` verde, `npm run build` passa.
- Lógica pura em `src/lib/` com testes determinísticos; UI em `src/components`.
- Correto nos **dois temas**; `prefers-reduced-motion` respeitado (JS também).
- A11y: foco visível, teclado, `aria-*`, alvos ≥44px em `pointer: coarse`.
- Mobile **e** desktop (≥1000px) certos; sem hydration mismatch (padrão
  `hojeInicial`/`agoraInicial`).

## Referência de design

O sistema visual vigente é o do repo (`src/styles/` + `DESIGN.md`).
