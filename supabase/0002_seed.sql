-- ============================================================================
-- Classdays — dados iniciais
--
-- ⚠️ PLACEHOLDER: mesma grade de exemplo do protótipo (src/lib/db/seed.ts).
-- Troque pelos dados reais da turma antes (ou depois) de rodar.
-- ============================================================================

insert into materias (id, nome, prof, cor) values
  ('alglin', 'Álgebra Linear',      'Prof. Marina Alves',  '#5457C5'),
  ('calc',   'Cálculo II',          'Prof. Roberto Lima',  '#12897E'),
  ('edados', 'Estrutura de Dados',  'Prof. Carla Souza',   '#C77A0E'),
  ('req',    'Eng. de Requisitos',  'Prof. Daniel Rocha',  '#C13F7A'),
  ('bd',     'Banco de Dados',      'Prof. Helena Dias',   '#7C4DBB');

-- dia_semana: 1=seg … 5=sex
insert into grade_horaria (materia_id, dia_semana, hora_ini, hora_fim, sala) values
  ('alglin', 1, '19:00', '20:40', 'Sala 3'),
  ('calc',   1, '20:50', '22:30', 'Sala 3'),
  ('edados', 2, '19:00', '20:40', 'Lab 2'),
  ('bd',     2, '20:50', '22:30', 'Lab 2'),
  ('req',    3, '19:00', '20:40', 'Sala 5'),
  ('calc',   4, '19:00', '20:40', 'Sala 3'),
  ('alglin', 4, '20:50', '22:30', 'Sala 3'),
  ('bd',     5, '19:00', '20:40', 'Lab 1');

-- Eventos de demonstração (datas de julho/2026) — apague pelo /admin depois.
insert into eventos (tipo, titulo, materia_id, data, hora, observacao) values
  ('prova',        'Prova — Unidade 2',       'alglin', '2026-07-13', '19:00', null),
  ('trabalho',     'Entrega do Projeto AVL',  'edados', '2026-07-14', null,    'Enviar pelo AVA até o fim do dia'),
  ('cancelamento', 'Não haverá aula',         null,     '2026-07-15', null,    'Conselho universitário'),
  ('atividade',    'Lista de SQL (vale nota)','bd',     '2026-07-16', '23:59', null),
  ('cancelamento', 'Aula cancelada',          'bd',     '2026-07-17', null,    'Professora em congresso'),
  ('evento',       'Semana Acadêmica',        null,     '2026-07-22', null,    'Programação no mural do curso'),
  ('prova',        'Prova — Integrais',       'calc',   '2026-07-23', '19:00', null);
