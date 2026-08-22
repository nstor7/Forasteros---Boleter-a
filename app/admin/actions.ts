"use server";

import { revalidatePath } from "next/cache";

import { claveCorrecta, cerrarSesion, haySesion, iniciarSesion } from "@/lib/auth";
import { db, tipoBoletoActivo } from "@/lib/db";
import { enviarBoletos, enviarRechazo } from "@/lib/email";
import { ErrorDeOrden, confirmarPago, crearOrdenManual, emitirTickets, obtenerOrden } from "@/lib/orders";

/**
 * Acciones del panel. Cada una revisa la sesión por su cuenta: una acción de
 * servidor es un endpoint POST real, así que cualquiera podría invocarla sin
 * pasar por la pantalla de login.
 */

async function exigirAdmin() {
  if (!(await haySesion("admin"))) throw new Error("No autorizado");
}

export async function entrar(_estado: unknown, form: FormData) {
  const clave = String(form.get("clave") ?? "");

  if (!claveCorrecta("admin", clave)) {
    // Pausa deliberada: hace inviable probar contraseñas a fuerza bruta.
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Contraseña incorrecta." };
  }

  await iniciarSesion("admin");
  revalidatePath("/admin");
  return { error: null };
}

export async function salir() {
  await cerrarSesion("admin");
  revalidatePath("/admin");
}

export async function aprobar(_estado: unknown, form: FormData) {
  await exigirAdmin();

  const id = String(form.get("id") ?? "");
  const resultado = await confirmarPago(id, { adminNote: "Yappy verificado" });

  if (!resultado) return { error: "Orden no encontrada." };

  const correo = await enviarBoletos(resultado.orden, resultado.tickets);
  revalidatePath("/admin");

  return {
    error: null,
    mensaje: correo.enviado
      ? `Boletos enviados a ${resultado.orden.buyer_email}`
      : `Boletos emitidos, pero el correo no salió (${correo.motivo}). Pásale el enlace de la orden.`,
  };
}

export async function rechazar(_estado: unknown, form: FormData) {
  await exigirAdmin();

  const id = String(form.get("id") ?? "");
  const motivo = String(form.get("motivo") ?? "").trim() || "No recibimos el pago.";

  const orden = await obtenerOrden(id);
  if (!orden) return { error: "Orden no encontrada." };

  if (orden.status === "paid") {
    return { error: "Esa orden ya está pagada; no se puede rechazar." };
  }

  const { error } = await db
    .from("orders")
    .update({
      status: "rejected",
      admin_note: motivo,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await enviarRechazo(orden, motivo);
  revalidatePath("/admin");

  return { error: null, mensaje: `Orden ${orden.short_code} rechazada.` };
}

/**
 * Genera boletos a mano para una venta que pasó fuera de la plataforma
 * (efectivo, o Yappy a otra persona del grupo que no sea Nestor). La orden
 * nace ya pagada — ver `crearOrdenManual` en lib/orders.ts.
 */
export async function generarEntrada(_estado: unknown, form: FormData) {
  await exigirAdmin();

  const cantidad = Number(form.get("cantidad") ?? 1);

  try {
    const tipo = await tipoBoletoActivo();
    const orden = await crearOrdenManual(
      {
        nombre: String(form.get("nombre") ?? ""),
        email: String(form.get("email") ?? ""),
        telefono: form.get("telefono") ? String(form.get("telefono")) : "",
        cantidad,
        nota: String(form.get("nota") ?? ""),
      },
      tipo.id,
    );

    const tickets = await emitirTickets(orden);
    const correo = await enviarBoletos(orden, tickets);
    revalidatePath("/admin");

    return {
      error: null,
      mensaje: correo.enviado
        ? `Boletos generados y enviados a ${orden.buyer_email} (orden ${orden.short_code}).`
        : `Boletos generados (orden ${orden.short_code}), pero el correo no salió (${correo.motivo}). Comparte el enlace de la orden a mano.`,
    };
  } catch (e) {
    if (e instanceof ErrorDeOrden) return { error: e.message };
    console.error("[admin] generarEntrada inesperado", e);
    return { error: "No se pudo generar la orden." };
  }
}

/**
 * URL temporal para ver el comprobante. El bucket es privado porque esas
 * capturas llevan datos bancarios del comprador.
 */
export async function urlComprobante(ruta: string): Promise<string | null> {
  await exigirAdmin();

  const { data, error } = await db.storage
    .from("comprobantes")
    .createSignedUrl(ruta, 3600);

  return error ? null : data.signedUrl;
}
