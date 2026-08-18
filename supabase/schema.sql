-- Esquema de la boletería — Los Forasteros del Tango
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run

create extension if not exists pgcrypto;

-- Tipos de boleto. Arranca con una sola fila, pero soporta varios.
create table if not exists ticket_types (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  price_cents  integer not null check (price_cents > 0),
  capacity     integer not null check (capacity > 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Una orden = una compra, puede incluir varios boletos.
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  short_code      text unique not null,
  buyer_name      text not null,
  buyer_email     text not null,
  buyer_phone     text,
  ticket_type_id  uuid not null references ticket_types(id),
  quantity        integer not null check (quantity > 0),
  total_cents     integer not null check (total_cents > 0),
  payment_method  text not null check (payment_method in ('card', 'yappy')),
  status          text not null check (status in ('pending', 'pending_review', 'paid', 'rejected', 'expired')),
  paypal_order_id text,
  proof_url       text,
  admin_note      text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- Un ticket = una entrada individual con su QR.
create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  code        text unique not null,
  used_at     timestamptz,
  used_by     text,
  created_at  timestamptz not null default now()
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_short_code_idx on orders (short_code);
create index if not exists tickets_code_idx on tickets (code);
create index if not exists tickets_order_idx on tickets (order_id);

-- RLS activo y sin políticas públicas: todo el acceso pasa por el servidor
-- usando la service_role key. El navegador nunca toca estas tablas.
alter table ticket_types enable row level security;
alter table orders       enable row level security;
alter table tickets      enable row level security;

-- Disponibilidad: cuenta boletos vendidos y en revisión.
create or replace function boletos_disponibles(tipo uuid)
returns integer
language sql
stable
as $$
  select t.capacity - coalesce((
    select sum(o.quantity)
    from orders o
    where o.ticket_type_id = t.id
      and o.status in ('paid', 'pending_review')
  ), 0)
  from ticket_types t
  where t.id = tipo;
$$;

-- Datos del evento
insert into ticket_types (name, price_cents, capacity)
select 'Entrada General', 1500, 115
where not exists (select 1 from ticket_types);
