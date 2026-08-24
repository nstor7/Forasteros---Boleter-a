import { NextResponse } from "next/server";

import { tipoBoletoActivo } from "@/lib/db";
import { ErrorDeOrden, crearOrden } from "@/lib/orders";

/**
 * POST /api/orders — crea una orden y devuelve a dónde mandar al comprador.
 *
 * No cobra nada: solo reserva el cupo. El cobro pasa después, en PayPal
 * (tarjeta) o subiendo el comprobante (Yappy).
 */
export async function POST(request: Request) {
  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const datos = cuerpo as Record<string, unknown>;

  try {
    const tipo = await tipoBoletoActivo();

    const orden = await crearOrden(
      {
        nombre: String(datos.nombre ?? ""),
        email: String(datos.email ?? ""),
        telefono: datos.telefono ? String(datos.telefono) : "",
        cantidad: Number(datos.cantidad ?? 0),
        metodo: datos.metodo === "yappy" ? "yappy" : "card",
        aceptaNoticias: datos.aceptaNoticias !== false,
        utm:
          datos.utm && typeof datos.utm === "object"
            ? (datos.utm as Record<string, string>)
            : undefined,
      },
      tipo.id,
    );

    return NextResponse.json(
      {
        id: orden.id,
        shortCode: orden.short_code,
        totalCents: orden.total_cents,
        redirigirA: `/orden/${orden.id}`,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ErrorDeOrden) {
      const status =
        e.codigo === "datos_invalidos" ? 400 : e.codigo === "sin_cupo" ? 409 : 500;

      // El error de base de datos no se le enseña al comprador, pero sí
      // queda en los logs del servidor para poder diagnosticarlo.
      if (e.codigo === "error_bd") console.error("[orders]", e.message);

      return NextResponse.json(
        {
          error:
            e.codigo === "error_bd"
              ? "No pudimos procesar tu compra. Intenta de nuevo."
              : e.message,
          codigo: e.codigo,
          disponibles: e.disponibles,
        },
        { status },
      );
    }

    console.error("[orders] inesperado", e);
    return NextResponse.json(
      { error: "No pudimos procesar tu compra. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
