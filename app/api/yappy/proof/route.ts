import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { enviarComprobanteRecibido } from "@/lib/email";
import { obtenerOrden } from "@/lib/orders";

/**
 * POST /api/yappy/proof — el comprador sube la captura de su pago por Yappy.
 *
 * Subir un comprobante no confirma nada: solo deja la orden lista para que
 * un humano la revise contra la app de Yappy. Es el precio de usar una
 * cuenta personal, que no tiene API de confirmación.
 */

const TIPOS_OK = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const orderId = String(form.get("orderId") ?? "");
  const archivo = form.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Adjunta el comprobante." }, { status: 400 });
  }

  if (archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo pesa más de 5 MB. Prueba con una captura de pantalla." },
      { status: 400 },
    );
  }

  if (!TIPOS_OK.has(archivo.type)) {
    return NextResponse.json(
      { error: "Sube una imagen (JPG, PNG, HEIC) o un PDF." },
      { status: 400 },
    );
  }

  try {
    const orden = await obtenerOrden(orderId);

    if (!orden) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    if (orden.status === "paid") {
      return NextResponse.json(
        { error: "Esta orden ya está confirmada." },
        { status: 409 },
      );
    }

    if (orden.status !== "pending_review") {
      return NextResponse.json(
        { error: "Esta orden ya no admite comprobantes." },
        { status: 409 },
      );
    }

    const extension = archivo.name.split(".").pop()?.toLowerCase().slice(0, 5) || "jpg";
    const ruta = `${orden.id}/${Date.now()}.${extension}`;

    const { error: errorSubida } = await db.storage
      .from("comprobantes")
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

    if (errorSubida) {
      console.error("[yappy/proof] subida", errorSubida.message);
      return NextResponse.json(
        { error: "No pudimos guardar el comprobante. Intenta de nuevo." },
        { status: 500 },
      );
    }

    // Guardamos la ruta, no una URL pública: el bucket es privado y el
    // comprobante lleva datos bancarios del comprador.
    const { error: errorOrden } = await db
      .from("orders")
      .update({ proof_url: ruta })
      .eq("id", orden.id);

    if (errorOrden) {
      console.error("[yappy/proof] orden", errorOrden.message);
      return NextResponse.json(
        { error: "No pudimos registrar el comprobante." },
        { status: 500 },
      );
    }

    // El acuse es cortesía: si el correo falla, la compra sigue en pie.
    await enviarComprobanteRecibido(orden);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[yappy/proof] inesperado", e);
    return NextResponse.json(
      { error: "No pudimos procesar el comprobante." },
      { status: 500 },
    );
  }
}
