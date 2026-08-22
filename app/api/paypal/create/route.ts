import { NextResponse } from "next/server";

import { crearOrdenPaypal } from "@/lib/payments";
import { obtenerOrden } from "@/lib/orders";

/**
 * POST /api/paypal/create — el botón de PayPal llama esto para saber qué
 * orden abrir. No cobra nada todavía; PayPal cobra cuando el comprador
 * aprueba, y el webhook es quien confirma el pago en nuestra base.
 */
export async function POST(request: Request) {
  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const orderId = String((cuerpo as Record<string, unknown>).orderId ?? "");

  try {
    const orden = await obtenerOrden(orderId);

    if (!orden) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    if (orden.payment_method !== "card") {
      return NextResponse.json({ error: "Esta orden no es por tarjeta." }, { status: 409 });
    }

    if (orden.status !== "pending") {
      return NextResponse.json({ error: "Esta orden ya no admite pago." }, { status: 409 });
    }

    const paypalOrderId = await crearOrdenPaypal(orden);
    return NextResponse.json({ id: paypalOrderId });
  } catch (e) {
    console.error("[paypal/create]", e);
    return NextResponse.json(
      { error: "No pudimos iniciar el pago con tarjeta. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
