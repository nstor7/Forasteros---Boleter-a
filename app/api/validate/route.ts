import { NextResponse } from "next/server";

import { haySesion } from "@/lib/auth";
import { db, type Order, type Ticket } from "@/lib/db";
import { codigoValido } from "@/lib/tickets";

/**
 * POST /api/validate — el escáner de la puerta consulta un boleto.
 *
 * Acepta dos formas de entrada: el código completo del QR, o el código corto
 * de la orden ("FOR-A7K2") tecleado a mano, para cuando alguien llega con el
 * celular muerto. Con el código corto se consume el primer boleto sin usar
 * de esa orden, que es exactamente lo que uno haría en papel.
 */

type Respuesta =
  | { resultado: "valido"; nombre: string; orden: string; restantes: number }
  | { resultado: "usado"; nombre: string; orden: string; cuando: string }
  | { resultado: "invalido"; motivo: string };

const ok = (r: Respuesta) => NextResponse.json(r);

export async function POST(request: Request) {
  if (!(await haySesion("puerta"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let cuerpo: { codigo?: string };

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const codigo = String(cuerpo.codigo ?? "").trim();
  if (!codigo) return ok({ resultado: "invalido", motivo: "Código vacío." });

  try {
    return /^FOR-[A-Z0-9]{4}$/i.test(codigo)
      ? await porCodigoCorto(codigo.toUpperCase())
      : await porQR(codigo);
  } catch (e) {
    console.error("[validate]", e);
    return NextResponse.json({ error: "Error de base de datos." }, { status: 500 });
  }
}

/* ------------------------------------------------------------------- QR */

async function porQR(codigo: string) {
  // La firma primero: un QR inventado se descarta sin tocar la base de datos.
  if (!codigoValido(codigo)) {
    return ok({ resultado: "invalido", motivo: "Este código no es un boleto nuestro." });
  }

  const { data, error } = await db
    .from("tickets")
    .select("*, orders!inner(id, short_code, buyer_name, quantity, status)")
    .eq("code", codigo)
    .maybeSingle();

  if (error) throw error;
  if (!data) return ok({ resultado: "invalido", motivo: "Boleto no encontrado." });

  const boleto = data as unknown as Ticket & { orders: OrdenAnidada };
  return await consumir(boleto, boleto.orders);
}

/* ----------------------------------------------------------- código corto */

type OrdenAnidada = Pick<Order, "id" | "short_code" | "buyer_name" | "quantity" | "status">;

async function porCodigoCorto(shortCode: string) {
  const { data: orden, error } = await db
    .from("orders")
    .select("id, short_code, buyer_name, quantity, status")
    .eq("short_code", shortCode)
    .maybeSingle();

  if (error) throw error;
  if (!orden) return ok({ resultado: "invalido", motivo: "No existe esa orden." });

  const info = orden as OrdenAnidada;

  if (info.status !== "paid") {
    return ok({ resultado: "invalido", motivo: "Esa orden no está pagada." });
  }

  const { data: boletos, error: errorBoletos } = await db
    .from("tickets")
    .select("*")
    .eq("order_id", info.id)
    .order("created_at");

  if (errorBoletos) throw errorBoletos;

  const libre = (boletos as Ticket[]).find((b) => !b.used_at);

  if (!libre) {
    const ultimo = (boletos as Ticket[])
      .map((b) => b.used_at)
      .filter(Boolean)
      .sort()
      .pop()!;

    return ok({
      resultado: "usado",
      nombre: info.buyer_name,
      orden: info.short_code,
      cuando: ultimo,
    });
  }

  return await consumir(libre, info);
}

/* -------------------------------------------------------------- consumo */

async function consumir(boleto: Ticket, orden: OrdenAnidada) {
  if (orden.status !== "paid") {
    return ok({ resultado: "invalido", motivo: "La orden de este boleto no está pagada." });
  }

  if (boleto.used_at) {
    return ok({
      resultado: "usado",
      nombre: orden.buyer_name,
      orden: orden.short_code,
      cuando: boleto.used_at,
    });
  }

  // `is("used_at", null)` hace atómica la marca: si otro teléfono escaneó
  // el mismo boleto medio segundo antes, esta actualización no toca nada.
  const { data: marcado, error } = await db
    .from("tickets")
    .update({ used_at: new Date().toISOString(), used_by: "puerta" })
    .eq("id", boleto.id)
    .is("used_at", null)
    .select()
    .maybeSingle();

  if (error) throw error;

  if (!marcado) {
    return ok({
      resultado: "usado",
      nombre: orden.buyer_name,
      orden: orden.short_code,
      cuando: new Date().toISOString(),
    });
  }

  // Cuántos boletos de esta orden faltan por entrar: le dice al portero
  // si el grupo viene completo o si faltan acompañantes.
  const { count } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orden.id)
    .is("used_at", null);

  return ok({
    resultado: "valido",
    nombre: orden.buyer_name,
    orden: orden.short_code,
    restantes: count ?? 0,
  });
}
