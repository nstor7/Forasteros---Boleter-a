-- Migración 006 — de qué anuncio vino cada orden
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run
-- Es idempotente: se puede correr varias veces sin romper nada.

-- Guardamos las cuatro etiquetas por separado en vez de la URL completa
-- para poder agrupar en SQL sin parsear texto. Todas nullable: las ventas
-- directas (WhatsApp, boca a boca, órdenes manuales del admin) simplemente
-- no traen ninguna, y eso también es información útil.
alter table orders
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text;

-- Índice para agrupar por creatividad al analizar resultados.
create index if not exists orders_utm_content_idx
  on orders (utm_content)
  where utm_content is not null;
