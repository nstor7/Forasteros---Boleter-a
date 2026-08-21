-- Migración 002 — creación de órdenes y almacenamiento de comprobantes
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run
-- Es idempotente: se puede correr varias veces sin romper nada.

-- ---------------------------------------------------------------------------
-- Disponibilidad
-- ---------------------------------------------------------------------------
-- Cambio respecto a la 001: ahora una orden 'pending' (checkout de tarjeta
-- empezado pero no terminado) también ocupa cupo, pero solo por 20 minutos.
-- Sin eso, dos personas podrían pagar el último boleto a la vez; con un
-- bloqueo permanente, un carrito abandonado congelaría el inventario.
create or replace function boletos_disponibles(tipo uuid)
returns integer
language sql
stable
as $$
  select t.capacity - coalesce((
    select sum(o.quantity)
    from orders o
    where o.ticket_type_id = t.id
      and (
        o.status in ('paid', 'pending_review')
        or (o.status = 'pending' and o.created_at > now() - interval '20 minutes')
      )
  ), 0)
  from ticket_types t
  where t.id = tipo;
$$;

-- ---------------------------------------------------------------------------
-- Creación de órdenes
-- ---------------------------------------------------------------------------
-- Todo ocurre dentro de una transacción con `for update` sobre la fila del
-- tipo de boleto: dos compras simultáneas se serializan, así que el aforo
-- nunca se pasa aunque lleguen diez personas en el mismo segundo.
create or replace function crear_orden(
  p_tipo       uuid,
  p_nombre     text,
  p_email      text,
  p_telefono   text,
  p_cantidad   integer,
  p_metodo     text,
  p_short_code text
)
returns orders
language plpgsql
as $$
declare
  v_tipo     ticket_types%rowtype;
  v_ocupados integer;
  v_orden    orders%rowtype;
begin
  -- El lock serializa las compras concurrentes de este tipo de boleto.
  select * into v_tipo
  from ticket_types
  where id = p_tipo and active
  for update;

  if not found then
    raise exception 'tipo_no_encontrado';
  end if;

  select coalesce(sum(o.quantity), 0) into v_ocupados
  from orders o
  where o.ticket_type_id = p_tipo
    and (
      o.status in ('paid', 'pending_review')
      or (o.status = 'pending' and o.created_at > now() - interval '20 minutes')
    );

  if v_ocupados + p_cantidad > v_tipo.capacity then
    raise exception 'sin_cupo'
      using detail = greatest(0, v_tipo.capacity - v_ocupados)::text;
  end if;

  insert into orders (
    short_code, buyer_name, buyer_email, buyer_phone,
    ticket_type_id, quantity, total_cents, payment_method, status
  ) values (
    p_short_code, p_nombre, p_email, nullif(p_telefono, ''),
    p_tipo, p_cantidad, v_tipo.price_cents * p_cantidad, p_metodo,
    case when p_metodo = 'yappy' then 'pending_review' else 'pending' end
  )
  returning * into v_orden;

  return v_orden;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comprobantes de Yappy
-- ---------------------------------------------------------------------------
-- Bucket privado: las fotos de comprobante llevan datos bancarios del
-- comprador, así que solo se leen desde el servidor con URL firmada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes',
  'comprobantes',
  false,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
set file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    public             = false;
