import "server-only";

import { db, type Order, type PaymentMethod, type Ticket } from "@/lib/db";
import { EVENTO } from "@/lib/event";
import { nuevoCodigoBoleto, nuevoCodigoCorto } from "@/lib/tickets";

/**
 * Toda la lógica de órdenes vive aquí para que las rutas de API sean finas.
 * La regla que más importa: el aforo se valida dentro de la base de datos
 * (función `crear_orden`), no en JavaScript. Si lo hiciéramos aquí, dos
 * compras simultáneas podrían leer "queda 1" a la vez y vender el mismo
 * boleto dos veces.
 */

export class ErrorDeOrden extends Error {
  constructor(
    readonly codigo:
      | "datos_invalidos"
      | "sin_cupo"
      | "no_encontrada"
      | "tipo_no_encontrado"
      | "error_bd",
    mensaje: string,
    readonly disponibles?: number,
  ) {
    super(mensaje);
    this.name = "ErrorDeOrden";
  }
}

export type DatosCompra = {
  nombre: string;
  email: string;
  telefono?: string;
  cantidad: number;
  metodo: PaymentMethod;
  // Casilla "avísenme de futuros conciertos" en /boletos, nace marcada.
  // Opcional porque un `undefined` (petición vieja, o llamada manual) debe
  // tratarse igual que "sí" — la columna en Supabase también nace en `true`.
  aceptaNoticias?: boolean;
};

/** Validación mínima pero real; el navegador no es una fuente confiable. */
function validar(datos: DatosCompra): DatosCompra {
  const nombre = datos.nombre?.trim() ?? "";
  const email = datos.email?.trim().toLowerCase() ?? "";
  const telefono = datos.telefono?.trim() ?? "";
  const cantidad = Number(datos.cantidad);

  if (nombre.length < 2 || nombre.length > 120) {
    throw new ErrorDeOrden("datos_invalidos", "Escribe tu nombre completo.");
  }

  // Deliberadamente laxa: la validación estricta de correos rechaza
  // direcciones válidas. Lo que importa es que tenga forma de correo.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    throw new ErrorDeOrden("datos_invalidos", "Revisa tu correo electrónico.");
  }

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > EVENTO.maxPorOrden) {
    throw new ErrorDeOrden(
      "datos_invalidos",
      `Puedes comprar entre 1 y ${EVENTO.maxPorOrden} boletos por orden.`,
    );
  }

  if (datos.metodo !== "card" && datos.metodo !== "yappy") {
    throw new ErrorDeOrden("datos_invalidos", "Método de pago no válido.");
  }

  // Con Yappy el teléfono es necesario: es como te identificas el pago.
  if (datos.metodo === "yappy" && !/^[\d\s+-]{7,20}$/.test(telefono)) {
    throw new ErrorDeOrden(
      "datos_invalidos",
      "Necesitamos tu número de teléfono para verificar el pago por Yappy.",
    );
  }

  return {
    nombre,
    email,
    telefono,
    cantidad,
    metodo: datos.metodo,
    aceptaNoticias: datos.aceptaNoticias !== false,
  };
}

export async function crearOrden(
  entrada: DatosCompra,
  ticketTypeId: string,
): Promise<Order> {
  const datos = validar(entrada);

  // El código corto puede chocar (1 en 707k); reintentar sale más barato
  // que coordinar un contador.
  for (let intento = 0; intento < 5; intento++) {
    const { data, error } = await db.rpc("crear_orden", {
      p_tipo: ticketTypeId,
      p_nombre: datos.nombre,
      p_email: datos.email,
      p_telefono: datos.telefono ?? "",
      p_cantidad: datos.cantidad,
      p_metodo: datos.metodo,
      p_short_code: nuevoCodigoCorto(),
    });

    if (!error) {
      const orden = data as Order;

      // La columna nace en `true` (mismo default que la casilla en
      // /boletos), así que solo hace falta un segundo `update` cuando la
      // persona la desmarcó — evita una escritura extra en el caso común.
      // Si falla (por ejemplo, la migración 004 todavía no corrió y la
      // columna no existe), la orden ya se creó y el boleto ya se reservó:
      // no vale la pena tirar toda la compra por una preferencia de correo.
      // Queda registrada como si hubiera aceptado; se puede corregir a mano.
      if (!datos.aceptaNoticias) {
        const { data: actualizada, error: errorNoticias } = await db
          .from("orders")
          .update({ marketing_opt_in: false })
          .eq("id", orden.id)
          .select()
          .single();

        if (errorNoticias) {
          console.error("[orders] no se pudo guardar marketing_opt_in", errorNoticias.message);
          return orden;
        }
        return actualizada as Order;
      }

      return orden;
    }

    if (error.message.includes("sin_cupo")) {
      const quedan = Number(error.details ?? 0);
      throw new ErrorDeOrden(
        "sin_cupo",
        quedan > 0
          ? `Solo quedan ${quedan} boletos disponibles.`
          : "Las entradas se agotaron.",
        Number.isFinite(quedan) ? quedan : 0,
      );
    }

    if (error.message.includes("tipo_no_encontrado")) {
      throw new ErrorDeOrden("tipo_no_encontrado", "No hay boletos a la venta.");
    }

    // Choque de short_code: otro intento con un código nuevo.
    if (error.message.includes("orders_short_code_key")) continue;

    throw new ErrorDeOrden("error_bd", `No se pudo crear la orden: ${error.message}`);
  }

  throw new ErrorDeOrden("error_bd", "No se pudo generar un código de orden.");
}

export type DatosVentaManual = {
  nombre: string;
  email: string;
  telefono?: string;
  cantidad: number;
  nota?: string;
};

/**
 * Boleto generado a mano desde `/admin`, para ventas que pasaron fuera de la
 * plataforma (efectivo, o Yappy a otra persona del grupo que no sea Nestor).
 * A diferencia de `crearOrden`, la orden nace directamente en `paid` — quien
 * la usa ya cobró por su cuenta, esto solo reserva el cupo y emite el
 * boleto. El aforo se revisa igual que cualquier otra orden, dentro de
 * `crear_orden` con `p_manual = true`.
 */
export async function crearOrdenManual(
  entrada: DatosVentaManual,
  ticketTypeId: string,
): Promise<Order> {
  const nombre = entrada.nombre?.trim() ?? "";
  const email = entrada.email?.trim().toLowerCase() ?? "";
  const telefono = entrada.telefono?.trim() ?? "";
  const cantidad = Number(entrada.cantidad);
  const nota = entrada.nota?.trim() || "Boleto generado manualmente desde el panel";

  if (nombre.length < 2 || nombre.length > 120) {
    throw new ErrorDeOrden("datos_invalidos", "Escribe el nombre completo.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    throw new ErrorDeOrden("datos_invalidos", "Revisa el correo electrónico.");
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > EVENTO.maxPorOrden) {
    throw new ErrorDeOrden(
      "datos_invalidos",
      `Solo se pueden generar entre 1 y ${EVENTO.maxPorOrden} boletos por vez.`,
    );
  }

  for (let intento = 0; intento < 5; intento++) {
    const { data, error } = await db.rpc("crear_orden", {
      p_tipo: ticketTypeId,
      p_nombre: nombre,
      p_email: email,
      p_telefono: telefono,
      p_cantidad: cantidad,
      p_metodo: "manual",
      p_short_code: nuevoCodigoCorto(),
      p_manual: true,
    });

    if (!error) {
      // `admin_note` no lo pone `crear_orden` (ese campo es de uso general,
      // no vale la pena pasarlo como parámetro para un solo caso); se
      // completa aquí en un segundo paso.
      const { data: actualizada, error: errorNota } = await db
        .from("orders")
        .update({ admin_note: nota })
        .eq("id", (data as Order).id)
        .select()
        .single();

      if (errorNota) throw new ErrorDeOrden("error_bd", errorNota.message);
      return actualizada as Order;
    }

    if (error.message.includes("sin_cupo")) {
      const quedan = Number(error.details ?? 0);
      throw new ErrorDeOrden(
        "sin_cupo",
        quedan > 0
          ? `Solo quedan ${quedan} boletos disponibles.`
          : "Las entradas se agotaron.",
        Number.isFinite(quedan) ? quedan : 0,
      );
    }

    if (error.message.includes("tipo_no_encontrado")) {
      throw new ErrorDeOrden("tipo_no_encontrado", "No hay boletos a la venta.");
    }

    if (error.message.includes("orders_short_code_key")) continue;

    throw new ErrorDeOrden("error_bd", `No se pudo generar la orden: ${error.message}`);
  }

  throw new ErrorDeOrden("error_bd", "No se pudo generar un código de orden.");
}

export async function obtenerOrden(id: string): Promise<Order | null> {
  // Un id malformado haría que Postgres tire error de tipo uuid.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const { data, error } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new ErrorDeOrden("error_bd", error.message);
  return (data as Order) ?? null;
}

export async function ticketsDeOrden(orderId: string): Promise<Ticket[]> {
  const { data, error } = await db
    .from("tickets")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");

  if (error) throw new ErrorDeOrden("error_bd", error.message);
  return (data ?? []) as Ticket[];
}

/**
 * Emite los boletos de una orden. Idempotente a propósito: el webhook de
 * PayPal puede llegar dos veces por el mismo pago, y el admin puede darle
 * doble clic a "Aprobar". En ambos casos se devuelven los mismos boletos
 * en vez de duplicarlos.
 */
export async function emitirTickets(orden: Order): Promise<Ticket[]> {
  const existentes = await ticketsDeOrden(orden.id);
  if (existentes.length >= orden.quantity) return existentes;

  const faltan = orden.quantity - existentes.length;
  const nuevos = Array.from({ length: faltan }, () => ({
    order_id: orden.id,
    code: nuevoCodigoBoleto(),
  }));

  const { data, error } = await db.from("tickets").insert(nuevos).select();
  if (error) throw new ErrorDeOrden("error_bd", `No se pudieron emitir boletos: ${error.message}`);

  return [...existentes, ...((data ?? []) as Ticket[])];
}

/**
 * Marca la orden como pagada y emite sus boletos. Devuelve `null` si la
 * orden no existe. Segura de llamar varias veces.
 */
export async function confirmarPago(
  orderId: string,
  extra?: { paypalOrderId?: string; adminNote?: string },
): Promise<{ orden: Order; tickets: Ticket[]; yaEstabaPagada: boolean } | null> {
  const orden = await obtenerOrden(orderId);
  if (!orden) return null;

  const yaEstabaPagada = orden.status === "paid";

  if (!yaEstabaPagada) {
    const { data, error } = await db
      .from("orders")
      .update({
        status: "paid",
        reviewed_at: new Date().toISOString(),
        ...(extra?.paypalOrderId ? { paypal_order_id: extra.paypalOrderId } : {}),
        ...(extra?.adminNote ? { admin_note: extra.adminNote } : {}),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw new ErrorDeOrden("error_bd", error.message);
    const tickets = await emitirTickets(data as Order);
    return { orden: data as Order, tickets, yaEstabaPagada: false };
  }

  return { orden, tickets: await emitirTickets(orden), yaEstabaPagada: true };
}

/** Monto con formato, para mostrar en pantalla o en el correo. */
export function totalOrden(orden: Order): string {
  return `$${(orden.total_cents / 100).toFixed(2)}`;
}
