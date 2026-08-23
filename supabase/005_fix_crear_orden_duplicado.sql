-- Migración 005 — URGENTE: arregla las compras públicas rotas
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run
-- Es idempotente: se puede correr varias veces sin romper nada.

-- ---------------------------------------------------------------------------
-- Qué pasó
-- ---------------------------------------------------------------------------
-- La migración 003 agregó `p_manual` a `crear_orden` con `create or replace`,
-- pero en Postgres eso NO reemplaza una función si la lista de parámetros
-- cambia — crea una segunda función con el mismo nombre (sobrecarga). Desde
-- entonces conviven dos versiones de `crear_orden`: la de 7 parámetros
-- (migración 002) y la de 8 (migración 003, con `p_manual`).
--
-- El checkout público (`/boletos`, Yappy y Tarjeta) llama a `crear_orden`
-- con los 7 parámetros originales, sin `p_manual`. Con las dos versiones
-- coexistiendo, Postgres ya no puede decidir cuál usar y la llamada falla
-- con "No pudimos procesar tu compra" — **nadie puede comprar boletos desde
-- que corrió la migración 003.**
--
-- ---------------------------------------------------------------------------
-- El arreglo: borrar la versión vieja de 7 parámetros
-- ---------------------------------------------------------------------------
-- Deja una sola función, la de 8 parámetros con `p_manual default false` —
-- las llamadas que no mandan `p_manual` (el checkout público) siguen
-- funcionando exactamente igual que antes.
drop function if exists public.crear_orden(
  uuid, text, text, text, integer, text, text
);
