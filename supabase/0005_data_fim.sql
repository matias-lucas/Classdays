-- E2: eventos contínuos (período de dias em vez de só uma data).
-- Aditiva: coluna nullable + índice; check aceito porque nenhuma linha
-- atual usa data_fim ainda (fica null nelas, comportamento inalterado).

alter table eventos add column data_fim date;

alter table eventos
  add constraint eventos_periodo_check check (data_fim is null or data_fim > data);

create index eventos_data_fim_idx on eventos (data_fim);
