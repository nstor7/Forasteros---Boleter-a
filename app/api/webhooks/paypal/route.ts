import { NextResponse } from "next/server";

import { enviarBoletos } from "@/lib/email";
import { confirmarPago } from "@/lib/orders";
import { type EventoWebhook, verificarFirmaWebhook } from "@/lib/payments";

/**
 * POST /api/webhooks/paypal — única fuente de verdad de que una tarjeta se
 * cobró de verdad. El botón en /orden/[id] también captura del lado del
 * cliente, pero eso solo es para que el comprador vea "listo" rápido; los
 * boletos se emiten aquí, después de verificar la firma. Sin la firma
 * cualquiera podría mandar un POST falso y sacar boletos gratis.
 */
export async function POST(request: Request) {
  const cuerpoCrudo = await request.text();

  const firmaValida = await verificarFirmaWebhook(request.headers, cuerpoCrudo).catch((e) => {
    console.error("[webhooks/paypal] error verificando firma", e);
    return false;
  });

  if (!firmaValida) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  const evento = JSON.parse(cuerpoCrudo) as EventoWebhook;

  if (evento.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    // Otros eventos (denegado, reembolso, etc.) no nos interesan hoy.
    return NextResponse.json({ ok: true });
  }

  const orderId = evento.resource.custom_id;
  const paypalOrderId = evento.resource.supplementary_data?.related_ids?.order_id;

  if (!orderId) {
    console.error("[webhooks/paypal] captura sin custom_id", evento.resource.id);
    return NextResponse.json({ error: "Evento sin referencia a la orden." }, { status: 400 });
  }

  try {
    const resultado = await confirmarPago(orderId, { paypalOrderId });

    if (!resultado) {
      console.error("[webhooks/paypal] orden no encontrada", orderId);
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    if (!resultado.yaEstabaPagada) {
      await enviarBoletos(resultado.orden, resultado.tickets);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhooks/paypal] confirmarPago falló", e);
    // 500 para que PayPal reintente el webhook más tarde.
    return NextResponse.json({ error: "No se pudo confirmar el pago." }, { status: 500 });
  }
}
