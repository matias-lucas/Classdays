-- E5: ênfase do destaque no hero para eventos-período — qual data é a
-- notícia (início, término ou os dois). Aditiva: default 'ambos' preserva o
-- comportamento atual em toda linha existente (é a regra que já valia antes
-- deste campo existir — ver src/lib/agenda.ts, proximoEvento).

alter table eventos
  add column enfase text not null default 'ambos'
  check (enfase in ('inicio', 'fim', 'ambos'));
