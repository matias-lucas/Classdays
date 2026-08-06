-- E3: feriados e recessos — dois tipos novos de evento, reaproveitando o
-- mecanismo de período (data_fim) já existente. Afrouxar um check é
-- aditivo e seguro (ver §3.1 do PLANO-V2): toda linha atual continua válida.

alter table eventos drop constraint eventos_tipo_check;

alter table eventos
  add constraint eventos_tipo_check
  check (tipo in ('prova','trabalho','atividade','evento','cancelamento','feriado','recesso'));
