-- ============================================================================
-- Classdays — configuração da turma (linha única)
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo → Run.
-- ============================================================================

-- Tabela de uma linha só (id sempre 1): liga/desliga a divulgação da grade
-- fixa pra turma. Enquanto falsa, "Hoje" e "Grade da semana" mostram
-- "Ainda não divulgado" em vez do horário (ex.: início de semestre, antes da
-- grade oficial sair). O admin alterna isso no /admin.
create table config (
  id            int primary key default 1,
  grade_visivel boolean not null default true,
  constraint config_singleton check (id = 1)
);

insert into config (id, grade_visivel) values (1, true);

alter table config enable row level security;

create policy "leitura publica" on config for select using (true);

-- (nenhuma policy de update = anon não escreve; a escrita do /admin usa a
-- service_role key, que ignora RLS — mesmo padrão das outras tabelas)
