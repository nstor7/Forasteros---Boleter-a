"use server";

import { revalidatePath } from "next/cache";

import { claveCorrecta, cerrarSesion, haySesion, iniciarSesion } from "@/lib/auth";
import { db } from "@/lib/db";
import { enviarBoletos, enviarRechazo } from "@/lib/email";
import { confirmarPago, obtenerOrden } from "@/lib/orders";

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
