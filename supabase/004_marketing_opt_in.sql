-- Migración 004 — casilla de "avísenme de futuros conciertos"
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run
-- Es idempotente: se puede correr varias veces sin romper nada.

-- Por defecto `true` porque la casilla en /boletos nace marcada (decisión
-- de Nestor, 22 de agosto): la mayoría de compradores no la va a tocar, así
-- que el default de la columna debe coincidir con el default del formulario.
alter table orders
  add column if not exists marketing_opt_in boolean not null default true;
