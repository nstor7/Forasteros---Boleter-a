-- Migración 003 — boletos generados a mano desde el panel de admin
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run
-- Es idempotente: se puede correr varias veces sin romper nada.

-- ---------------------------------------------------------------------------
-- Nuevo método de pago "manual"
-- ---------------------------------------------------------------------------
-- Para ventas fuera de la plataforma: efectivo, o Yappy a otra persona del
-- grupo que no sea Nestor. El admin ya cobró por su cuenta; esto solo emite
-- el boleto.
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('card', 'yappy', 'manual'));

-- ---------------------------------------------------------------------------
-- crear_orden: agrega un modo "manual" que crea la orden ya pagada
-- ---------------------------------------------------------------------------
-- `p_manual` es nuevo y por defecto `false`, así que las llamadas existentes
-- desde el checkout público (que no lo mandan) siguen funcionando igual.
-- Con `p_manual = true` la orden nace en 'paid' en vez de 'pending' /
-- 'pending_review' — el aforo se sigue revisando igual que cualquier otra
-- orden, porque el asiento se ocupa sin importar cómo se cobró.
create or replace function crear_orden(
  p_tipo       uuid,
  p_nombre     text,
  p_email      text,
  p_telefono   text,
  p_cantidad   integer,
  p_metodo     text,
  p_short_code text,
  p_manual     boolean default false
)
returns orders
language plpgsql
as $$
declare
  v_tipo     ticket_types%rowtype;
  v_ocupados integer;
  v_orden    orders%rowtype;
  v_estado   text;
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

  v_estado := case
    when p_manual then 'paid'
    when p_metodo = 'yappy' then 'pending_review'
    else 'pending'
  end;

  insert into orders (
    short_code, buyer_name, buyer_email, buyer_phone,
    ticket_type_id, quantity, total_cents, payment_method, status,
    reviewed_at
  ) values (
    p_short_code, p_nombre, p_email, nullif(p_telefono, ''),
    p_tipo, p_cantidad, v_tipo.price_cents * p_cantidad, p_metodo, v_estado,
    case when p_manual then now() else null end
  )
  returning * into v_orden;

  return v_orden;
end;
$$;
