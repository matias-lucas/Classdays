-- 0009 — "este evento derruba as aulas do dia": um evento qualquer (a OLINFEG,
-- uma semana de exames, um congresso) pode suspender a grade enquanto acontece,
-- sem precisar de um `cancelamento` paralelo cadastrado à mão para cada dia.
--
-- Feriado e recesso continuam derrubando as aulas por serem o que são (regra de
-- domínio em src/lib/agenda.ts, `suspendeAulas`), independente desta coluna —
-- por isso ela nasce `false` em todas as linhas existentes sem mudar nada do
-- que a turma vê hoje.
--
-- Aditiva (PLANO-V2 §3.1): coluna nova com default, igual à `enfase` do 0007.
-- O código antigo, que roda contra este banco até o merge chegar à produção,
-- simplesmente ignora a coluna; os `insert` dele continuam válidos porque o
-- default preenche o campo.

alter table eventos
  add column suspende_aulas boolean not null default false;
