import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la llave secreta. Salta RLS, así que solo puede
 * existir en el servidor — el import de "server-only" hace que el build
 * falle si algún componente de cliente lo arrastra por accidente.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY. Revisa .env.local.",
  );
}

export const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type OrderStatus =
  | "pending"
  | "pending_review"
  | "paid"
  | "rejected"
  | "expired";

export type PaymentMethod = "card" | "yappy";

export type TicketType = {
  id: string;
  name: string;
  price_cents: number;
  capacity: number;
  active: boolean;
};

export type Order = {
  id: string;
  short_code: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  ticket_type_id: string;
  quantity: number;
  total_cents: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  paypal_order_id: string | null;
  proof_url: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Ticket = {
  id: string;
  order_id: string;
  code: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
};

/** El tipo de boleto activo. Hoy hay uno solo, pero el esquema soporta varios. */
export async function tipoBoletoActivo(): Promise<TicketType> {
  const { data, error } = await db
    .from("ticket_types")
    .select("*")
    .eq("active", true)
    .order("created_at")
    .limit(1)
    .single();

  if (error) throw new Error(`No se pudo leer el tipo de boleto: ${error.message}`);
  return data as TicketType;
}

/**
 * Boletos que quedan. Cuenta como ocupados tanto los pagados como los que
 * están en revisión, para que un comprobante de Yappy pendiente no se venda
 * dos veces mientras lo apruebas.
 */
export async function boletosDisponibles(ticketTypeId: string): Promise<number> {
  const { data, error } = await db.rpc("boletos_disponibles", {
    tipo: ticketTypeId,
  });

  if (error) throw new Error(`No se pudo calcular disponibilidad: ${error.message}`);
  return Math.max(0, Number(data ?? 0));
}
