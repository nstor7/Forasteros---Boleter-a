import "server-only";

import type { Order } from "@/lib/db";

/**
 * PayPal por HTTP directo a su REST API — igual que lib/email.ts con Resend,
 * no hace falta el SDK oficial para tres llamadas (token, crear orden,
 * verificar webhook).
 */

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function credenciales() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secreto = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secreto) return null;
  return { id, secreto };
}

export function paypalActivo(): boolean {
  return credenciales() !== null;
}

async function tokenAcceso(): Promise<string> {
  const c = credenciales();
  if (!c) throw new Error("PayPal no está configurado (faltan PAYPAL_CLIENT_ID/SECRET).");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${c.id}:${c.secreto}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal no dio token de acceso (${res.status}): ${await res.text()}`);
  }

  const datos = await res.json();
  return datos.access_token as string;
}

/**
 * Crea la orden en PayPal para una orden nuestra ya reservada (status
 * "pending"). `custom_id` guarda nuestro id para reconocerla cuando llegue
 * el webhook, sin tener que hacer otra llamada a PayPal.
 */
export async function crearOrdenPaypal(orden: Order): Promise<string> {
  const token = await tokenAcceso();

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: orden.id,
          description: `${orden.quantity} boleto${orden.quantity === 1 ? "" : "s"} · Los Forasteros del Tango`,
          amount: {
            currency_code: "USD",
            value: (orden.total_cents / 100).toFixed(2),
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`PayPal no pudo crear la orden (${res.status}): ${await res.text()}`);
  }

  const datos = await res.json();
  return datos.id as string;
}

export type EventoWebhook = {
  id: string;
  event_type: string;
  resource: {
    id: string;
    custom_id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
};

/**
 * Verifica que el webhook lo mandó PayPal de verdad. Sin esto cualquiera
 * podría mandar un POST falso a la ruta del webhook y sacar boletos gratis.
 */
export async function verificarFirmaWebhook(
  headers: Headers,
  cuerpoCrudo: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[paypal] PAYPAL_WEBHOOK_ID no configurado, se rechaza el webhook.");
    return false;
  }

  const authAlgo = headers.get("paypal-auth-algo");
  const certUrl = headers.get("paypal-cert-url");
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const transmissionTime = headers.get("paypal-transmission-time");

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false;
  }

  const token = await tokenAcceso();

  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(cuerpoCrudo),
    }),
  });

  if (!res.ok) {
    console.error("[paypal] verify-webhook-signature respondió", res.status, await res.text());
    return false;
  }

  const datos = await res.json();
  return datos.verification_status === "SUCCESS";
}
