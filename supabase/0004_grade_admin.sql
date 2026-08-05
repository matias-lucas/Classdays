-- ============================================================================
-- Classdays — E1: defesa em profundidade para grade e matérias editáveis
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo → Run.
--
-- Migration ADITIVA (§3.1 do docs/PLANO-V2.md): só constraints e índices
-- novos, nenhuma coluna muda de tipo/nome. Conferido que todas as linhas
-- atuais de materias/grade_horaria já satisfazem estas regras — rodar é
-- seguro mesmo com o código antigo (v1) ainda em produção, porque o v1
-- nunca escreve nessas duas tabelas.
-- ============================================================================

-- hora_fim sempre depois de hora_ini
alter table grade_horaria
  add constraint grade_horaria_horas_check check (hora_fim > hora_ini);

-- não existe a mesma aula duas vezes no mesmo horário
create unique index grade_horaria_slot_idx
  on grade_horaria (dia_semana, hora_ini, materia_id);

-- a consulta da grade é sempre "ordenada por dia e hora"
create index if not exists grade_horaria_ordem_idx on grade_horaria (dia_semana, hora_ini);

-- id de matéria em formato de slug ('bd2', 'poo1'…)
alter table materias
  add constraint materias_id_check check (id ~ '^[a-z][a-z0-9]{1,15}$');

-- cor sempre hex de 6 dígitos
alter table materias
  add constraint materias_cor_check check (cor ~ '^#[0-9A-Fa-f]{6}$');

-- Conferir depois de rodar: a contagem de aulas não deve mudar.
-- select count(*) from grade_horaria; -- esperado: 7
