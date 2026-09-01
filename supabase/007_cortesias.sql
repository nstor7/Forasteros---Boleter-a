-- Migración 007 — permite boletos de cortesía ($0)
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run
-- Es idempotente: se puede correr varias veces sin romper nada.

-- `orders.total_cents` tenía `check (total_cents > 0)`. Una cortesía se
-- cobra $0, así que hay que permitir el cero (nunca negativo).
alter table orders drop constraint if exists orders_total_cents_check;
alter table orders add constraint orders_total_cents_check
  check (total_cents >= 0);
