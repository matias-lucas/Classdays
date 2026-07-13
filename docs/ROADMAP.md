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

## Pendências de infra ⬜

- Criar o projeto **Supabase** juntos (aprendizado) e rodar `supabase/*.sql`.
- Obter `ANTHROPIC_API_KEY` (parsing por Claude em produção).
- Trocar o seed pela **grade real da turma**.
- **Deploy final na Vercel** e compartilhar o link com a turma.

## Opcional 1 — Meu Classdays ⬜

Personalização por dispositivo (primeiro estado real no cliente):
store em `localStorage` para matérias **favoritas/ocultas** + **lembretes
pessoais**. Matéria oculta some de Hoje/Grade/Próximo/Eventos. Painel
alcançável pelo menu lateral (a lista `ITENS_NAV` em `MenuLateral.tsx` já
está pronta para receber o item). Estritamente client-side: sem servidor,
sem auth; a agenda pública fica intacta para quem nunca abrir.

**Pronto quando:** ocultar uma matéria a remove de todas as seções;
favoritas/lembretes persistem; DoD completo.

## Opcional 2 — Lembretes & Calendário ⬜

**Bottom sheet** de exportação: `.ics` gerado no cliente, links Google/Apple
Calendar e opt-in de **Web Notifications** (fluxo de permissão com
degradação graciosa quando negado/não suportado). Aberto pelo drawer ou por
um evento.

**Pronto quando:** o `.ics` importa limpo num calendário real; toggles de
notificação degradam bem; sheet correto com teclado/scrim/Esc.

## Definition of Done (toda etapa)

- `npx tsc --noEmit` limpo, `npm test` verde, `npm run build` passa.
- Lógica pura em `src/lib/` com testes determinísticos; UI em `src/components`.
- Correto nos **dois temas**; `prefers-reduced-motion` respeitado (JS também).
- A11y: foco visível, teclado, `aria-*`, alvos ≥44px em `pointer: coarse`.
- Mobile **e** desktop (≥1000px) certos; sem hydration mismatch (padrão
  `hojeInicial`/`agoraInicial`).

## Referência de design

O sistema visual vigente é o do repo (`globals.css` + `DESIGN.md`).
