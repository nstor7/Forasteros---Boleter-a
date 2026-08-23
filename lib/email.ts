import "server-only";

import type { Order, Ticket } from "@/lib/db";
import { EVENTO, precio } from "@/lib/event";
import { qrDataUrl } from "@/lib/tickets";

/**
 * Correo por HTTP directo a Resend — no hace falta el SDK para tres
 * plantillas. Si no hay RESEND_API_KEY configurada, el envío se registra en
 * consola y sigue: los boletos siempre se ven en /orden/[id], así que un
 * correo caído no impide que alguien entre al concierto.
 */

const API = "https://api.resend.com/emails";

type Adjunto = { filename: string; content: string };

async function enviar(opciones: {
  para: string;
  asunto: string;
  html: string;
  adjuntos?: Adjunto[];
}): Promise<{ enviado: boolean; motivo?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    console.warn(
      `[email] sin configurar — no se envió "${opciones.asunto}" a ${opciones.para}`,
    );
    return { enviado: false, motivo: "sin_configurar" };
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opciones.para],
        subject: opciones.asunto,
        html: opciones.html,
        attachments: opciones.adjuntos,
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error(`[email] Resend respondió ${res.status}: ${detalle}`);
      return { enviado: false, motivo: `http_${res.status}` };
    }

    return { enviado: true };
  } catch (e) {
    console.error("[email] falló el envío", e);
    return { enviado: false, motivo: "excepcion" };
  }
}

/* ------------------------------------------------------------ plantillas */

const ENVOLTURA = (contenido: string) => `
<div style="background:#0c0a09;padding:32px 16px;font-family:Georgia,serif">
  <div style="max-width:520px;margin:0 auto;background:#16110f;border:1px solid #2a211d;padding:32px">
    <p style="margin:0 0 4px;color:#d9a441;font-size:11px;letter-spacing:3px;text-transform:uppercase">
      ${EVENTO.titulo}
    </p>
    <h1 style="margin:0 0 24px;color:#f5efe6;font-size:28px;font-weight:normal">
      ${EVENTO.grupo}
    </h1>
    ${contenido}
    <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #2a211d;color:#c9bfb2;font-size:13px">
      ${EVENTO.fechaTexto} · ${EVENTO.horaTexto}<br>
      ${EVENTO.lugar} — ${EVENTO.direccion}<br>
      <span style="color:#8a8177;font-size:11px">Puertas abren ${EVENTO.horaPuertasTexto}</span>
    </p>
  </div>
</div>`;

const P = (texto: string) =>
  `<p style="margin:0 0 16px;color:#c9bfb2;font-size:16px;line-height:1.6">${texto}</p>`;

/** Boletos emitidos: el correo que de verdad importa. */
export async function enviarBoletos(orden: Order, tickets: Ticket[]) {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const adjuntos: Adjunto[] = await Promise.all(
    tickets.map(async (t, i) => ({
      filename: `boleto-${orden.short_code}-${i + 1}.png`,
      // El data URL trae "data:image/png;base64,"; Resend quiere solo el base64.
      content: (await qrDataUrl(t.code)).split(",")[1],
    })),
  );

  const cuantos =
    tickets.length === 1 ? "tu boleto" : `tus ${tickets.length} boletos`;

  return enviar({
    para: orden.buyer_email,
    asunto: `${cuantos === "tu boleto" ? "Tu boleto" : `Tus ${tickets.length} boletos`} · ${EVENTO.grupo}`,
    html: ENVOLTURA(`
      ${P(`Hola ${orden.buyer_name.split(" ")[0]}, tu pago quedó confirmado.`)}
      ${P(`Adjuntamos ${cuantos} con su código QR. Muéstralos desde el celular en la puerta — cada uno sirve para una sola entrada.`)}
      ${P(`Orden <strong style="color:#d9a441">${orden.short_code}</strong> · ${orden.quantity} × ${precio(EVENTO.precioCents)}`)}
      ${
        sitio
          ? P(
              `También puedes verlos en línea: <a href="${sitio}/orden/${orden.id}" style="color:#d9a441">${sitio}/orden/${orden.id}</a>`,
            )
          : ""
      }
      ${P("Nos vemos.")}
    `),
    adjuntos,
  });
}

/** Acuse de recibo del comprobante de Yappy. */
export async function enviarComprobanteRecibido(orden: Order) {
  return enviar({
    para: orden.buyer_email,
    asunto: `Recibimos tu comprobante · orden ${orden.short_code}`,
    html: ENVOLTURA(`
      ${P(`Hola ${orden.buyer_name.split(" ")[0]}, recibimos tu comprobante de pago.`)}
      ${P("Lo estamos verificando. En cuanto lo confirmemos te enviamos los boletos con su código QR a este mismo correo.")}
      ${P(`Tu cupo de ${orden.quantity} ${orden.quantity === 1 ? "boleto" : "boletos"} ya está apartado.`)}
    `),
  });
}

/** Pago que no se pudo verificar. */
export async function enviarRechazo(orden: Order, motivo: string) {
  return enviar({
    para: orden.buyer_email,
    asunto: `Problema con tu orden ${orden.short_code}`,
    html: ENVOLTURA(`
      ${P(`Hola ${orden.buyer_name.split(" ")[0]}, no pudimos confirmar el pago de tu orden.`)}
      ${P(`<strong style="color:#f5efe6">Motivo:</strong> ${motivo}`)}
      ${P("Si crees que es un error, respóndenos este correo con el comprobante y lo revisamos.")}
    `),
  });
}
