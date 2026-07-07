-- ============================================================================
-- Classdays — schema do banco (Supabase / Postgres)
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo → Run.
-- Depois rode o 0002_seed.sql.
-- ============================================================================

-- As três tabelas espelham exatamente os tipos do app (src/lib/types.ts).

create table materias (
  id     text primary key,          -- curto e legível: 'alglin', 'calc'...
  nome   text not null,
  prof   text,
  cor    text not null              -- hex da matéria na UI, ex: '#5457C5'
);

create table grade_horaria (
  id         bigserial primary key,
  materia_id text not null references materias(id),
  dia_semana int  not null check (dia_semana between 1 and 5), -- 1=seg … 5=sex
  hora_ini   time not null,
  hora_fim   time not null,
  sala       text
);

create table eventos (
  id          bigserial primary key,
  tipo        text not null check (tipo in ('prova','trabalho','atividade','evento','cancelamento')),
  titulo      text not null,
  materia_id  text references materias(id),  -- null = evento geral da turma
  data        date not null,
  hora        time,
  observacao  text,
  created_at  timestamptz not null default now()
);

-- A consulta mais comum é "eventos desta data em diante", então indexamos data.
create index eventos_data_idx on eventos (data);

-- ----------------------------------------------------------------------------
-- Segurança (RLS — Row Level Security)
--
-- A anon key (pública, vai no navegador em tese) só passa pelas policies.
-- Aqui: QUALQUER UM pode LER (a agenda é pública), NINGUÉM escreve pela anon.
-- As escritas do /admin usam a service_role key, que ignora RLS — e ela só
-- existe no servidor.
-- ----------------------------------------------------------------------------

alter table materias      enable row level security;
alter table grade_horaria enable row level security;
alter table eventos       enable row level security;

create policy "leitura publica" on materias      for select using (true);
create policy "leitura publica" on grade_horaria for select using (true);
create policy "leitura publica" on eventos       for select using (true);

-- (nenhuma policy de insert/update/delete = anon não escreve nada)
