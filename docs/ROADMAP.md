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
- ✅ **E3 — Feriados e recessos** *(10/08/2026)*. Código em `main` e em
  produção: tipos `feriado`/`recesso` reaproveitando `data_fim`, `feriadoEm`
  em `agenda.ts`, grade mostra o destaque no lugar das aulas, lista com cor
  própria (sem "GERAL"), parser nos dois caminhos. `supabase/0006_feriados.sql`
  (afrouxa `eventos_tipo_check`) confirmado rodado em produção pelo Lucas.
  189 testes verdes, tsc/build limpos.
- ✅ **E4 — Meu Classdays** *(11/08/2026)*. Código em `main` e em produção
  (merge `bdee111`): `usePreferencias()` sobre `localStorage`
  (`classdays:prefs:v1`), plugado em `AgendaAluno` antes das funções puras de
  `agenda.ts` (eventos gerais, `materia_id null`, nunca somem); filtro ativo
  volta pra "Todas" se a matéria filtrada for ocultada; `MeuClassdays.tsx`
  (aviso "N matérias ocultas" + painel com switch por matéria, reaproveitando
  o `Drawer`); item no `ITENS_NAV` do `MenuLateral`. 189 testes, tsc/build
  limpos; testado no dev server (Playwright), dois temas, sem hydration
  mismatch. Polimento posterior fora do escopo formal da entrega: período "em
  andamento" nos Próximos eventos, professor no timeline, filtro "Ocultar
  gerais" nos chips de matéria (eventos sem `materia_id`), dot vermelho e
  navegação por setas nos chips, Vercel Analytics.
- ✅ **E5 — Sino in-app** *(21/08/2026)*. Código em `main` e em produção
  (merge `b3a4e73`): badge de não lidos sobre `eventosFuturos()` (todo
  evento que ainda não terminou, sem teto de dias — candidato a novidade é
  o cadastro, não a proximidade da data); estado de leitura por id em
  `localStorage` (`classdays:sino:v2`, com migração da v1 por timestamp);
  `painelPorGrupo()` divide o painel em "Novidades" (todas) e "Já vistas"
  (as mais próximas, teto de 8), reaproveitando o `Drawer` — cada item leva
  à âncora do evento em Próximos eventos. 216 testes, tsc/build limpos;
  verificado em produção (21/08/2026) por fetch direto (markup do sino
  renderizando). Polimento posterior (24/08/2026): novidades em cima, painel
  sem scroll horizontal e com a barra de rolagem oculta, título
  "Notificações", h1 da topbar em `clamp()` e sino fora da topbar no celular
  — no lugar dele, a aba "Notificações" no menu lateral, com dot e contador.
  **Correção de estreia** (24/08/2026, merge `1bab165`): quem chegava pela
  primeira vez via o sino calado — `vistosIniciais` devolvia a janela inteira
  como lida, então a estreia começava por definição sem novidade nenhuma, e o
  evento cadastrado minutos antes junto. Agora nasce lido só o que tem mais de
  24h (`JANELA_ESTREIA_MS`), com a baseline gravada na chegada e o corte por
  instante (`Date.parse`), não por string. Detalhe em `PLANO-V2.md` §E5.5.
- ⬜ **E6 — Web Push (PWA)**. Service worker, VAPID, Vercel Cron na véspera e
  no dia; iOS exige o app na tela de início. **É a última entrega planejada** —
  fechada ela, o plano v2 acaba.

### Correções fora de entrega

- ✅ **Contagem dos períodos respeitava a ênfase só no hero** *(27/08/2026,
  merge `247d418`)*. `EventoLinha` contava sempre até o término, então um
  período de ênfase `"inicio"` aparecia com um número na lista e outro no
  hero. Em produção: "Aplicação dos exames" (31/08→04/09) dizia "em 8 dias"
  para algo que abre em 4; a OLINFEG (16→18/09), "em 22 dias" para 20. A regra
  estava duplicada literalmente em dois componentes e ausente no terceiro —
  virou `contaAteOTermino()` em `agenda.ts`, e os três chamam a mesma função.
  Achado abrindo o site, não pelo gate: **nenhuma camada de teste cobre a
  escolha de data feita dentro de um componente**, e é por aí que este tipo de
  divergência entra. Regra de domínio em componente é o cheiro a vigiar.

### Melhorias fora de entrega

- ⬜ **Evento que derruba a aula do dia** *(27/08/2026)*. Campo
  `suspende_aulas` em `eventos` (`supabase/0009_suspende_aulas.sql`, aditiva,
  **ainda não rodada em produção**): qualquer evento pode entrar no LUGAR das
  aulas enquanto acontece — a OLINFEG (16–18/09) é o caso que motivou. Antes,
  era preciso cadastrar o evento E um `cancelamento` de dia inteiro para cada
  data, e as duas linhas viviam desencontradas. Em `agenda.ts`, `feriadoEm`
  virou `suspensaoEm` sobre `suspendeAulas()`, que junta as duas origens:
  feriado/recesso derrubam por tipo, o resto derruba por escolha do admin.
  Cancelamento fica de fora de propósito (senão um cancelamento de uma matéria
  com a caixa marcada apagaria o dia inteiro). Sempre o dia INTEIRO, mesmo com
  matéria — tirar uma aula só continua sendo trabalho do `cancelamento`.
  Caixa no preview do `/admin`, selo "sem aula" na lista de eventos, e a grade
  mostra o evento no lugar das aulas. Nenhum dos dois parsers infere o campo,
  como já acontece com a `enfase`: quem marca é o admin. 244 testes verdes,
  tsc/build/lint limpos, render conferido fora do navegador (grade, linha da
  lista e as quatro variações do formulário).

## Pendências de infra

- ✅ **Domínio classdays.net no ar** *(27/08/2026)*. Comprado e apontado pelo
  Lucas; verificado: apex responde 200 com TLS válido, `www` redireciona pro
  apex, e `classdays.vercel.app` segue como alias (links antigos vivos). O
  `metadataBase` do código já apontava pra lá. Passo a passo em
  `docs/PLANO-V2.md` §11.
- ⬜ Obter `ANTHROPIC_API_KEY` (parsing por Claude em produção; sem ela o parser
  de regras assume e o app roda a custo zero).
- ⬜ **Apagar `bkp_eventos_20260806`** (`drop table` no SQL Editor — passo 2 de
  `supabase/0008_drop_backup_e2.sql`). O snapshot da E2 estava no schema
  `public` **sem RLS**, legível por qualquer visitante através da chave anônima
  que vai no bundle; a RLS foi ligada em 27/08/2026 e a exposição está fechada,
  então o que resta é faxina, não urgência. As 4 linhas estão arquivadas no
  próprio `.sql`, então o drop não perde nada. Achado pelo `get_advisors` do
  Supabase — que virou passo fixo do §4.1 do plano por causa disto.

## Definition of Done (toda etapa)

- `npx tsc --noEmit` limpo, `npm test` verde, `npm run build` passa,
  `npm run lint` **sem erros nem avisos** (zerado em 27/08/2026; o que é
  padrão deliberado do projeto está marcado inline com a razão escrita, então
  qualquer coisa que apareça no lint é nova de verdade).
- Lógica pura em `src/lib/` com testes determinísticos; UI em `src/components`.
- Correto nos **dois temas**; `prefers-reduced-motion` respeitado (JS também).
- A11y: foco visível, teclado, `aria-*`, alvos ≥44px em `pointer: coarse`.
- Mobile **e** desktop (≥1000px) certos; sem hydration mismatch (padrão
  `hojeInicial`/`agoraInicial`).

## Referência de design

O sistema visual vigente é o do repo (`src/styles/` + `DESIGN.md`).
