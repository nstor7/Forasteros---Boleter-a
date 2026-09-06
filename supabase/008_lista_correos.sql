-- Migración 008 — lista de correos y clics de salida
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run
-- Es idempotente: se puede correr varias veces sin romper nada.

-- ---------------------------------------------------------------------------
-- Lista de correos
-- ---------------------------------------------------------------------------
-- Hasta ahora el único correo que teníamos era el de quien compraba
-- (`orders.buyer_email` + `marketing_opt_in`). Eso deja fuera a quien se
-- interesa y no compra, que en un evento anunciado con pocos días es la
-- mayoría. Esta tabla los captura por separado, sin pasar por el checkout.
create table if not exists suscriptores (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  nombre       text,
  -- De dónde salió la suscripción: qué página, y el UTM del enlace por el que
  -- llegó. Sirve para saber qué reel o historia construye lista de verdad.
  origen       text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  -- Se apaga desde el enlace de baja de los correos, nunca se borra la fila:
  -- si alguien pidió no recibir más, hay que poder respetarlo aunque vuelva a
  -- dejar el correo en otro formulario.
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists suscriptores_activo_idx on suscriptores (activo);

-- ---------------------------------------------------------------------------
-- Clics de salida
-- ---------------------------------------------------------------------------
-- Cuando el cobro lo hace un tercero (el hotel), la compra ocurre fuera de
-- nuestro sistema y no hay forma de verla. Lo único medible de nuestro lado
-- es cuánta gente llegó hasta el botón y salió hacia allá — así que se
-- registra ese clic antes de redirigir.
create table if not exists clics_salida (
  id           uuid primary key default gen_random_uuid(),
  destino      text not null,
  -- Con qué enlace veníamos marcando la fuente: 'historia', 'bio', 'correo'.
  origen       text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  referer      text,
  -- Se guarda solo para poder descartar bots al contar: los rastreadores de
  -- Meta y de WhatsApp siguen los enlaces al generar la vista previa.
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists clics_salida_destino_idx on clics_salida (destino, created_at);

-- RLS activo y sin políticas públicas, igual que el resto: todo el acceso
-- pasa por el servidor con la llave secreta.
alter table suscriptores enable row level security;
alter table clics_salida enable row level security;
