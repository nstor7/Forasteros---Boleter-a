"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * Carga el SDK de PayPal por <script>, no por paquete npm — igual de
 * liviano que llamar a Resend por fetch en vez de traer su SDK.
 * `actions.order.capture()` cobra de verdad del lado de PayPal, pero los
 * boletos solo se emiten cuando llega el webhook con la firma verificada
 * (ver app/api/webhooks/paypal). Este botón únicamente iniciа el cobro y
 * avisa al comprador que espere la confirmación.
 */

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: Record<string, string>;
        createOrder: () => Promise<string>;
        onApprove: (
          data: { orderID: string },
          actions: { order: { capture: () => Promise<unknown> } },
        ) => Promise<void>;
        onError?: (err: unknown) => void;
      }) => { render: (selector: string | HTMLElement) => void };
    };
  }
}

export default function BotonPaypal({
  orderId,
  clientId,
}: {
  orderId: string;
  clientId: string;
}) {
  const router = useRouter();
  const contenedorId = "botones-paypal";
  const [estado, setEstado] = useState<"listo" | "confirmando" | "error">("listo");
  const yaRenderizado = useRef(false);

  function montarBotones() {
    if (yaRenderizado.current || !window.paypal) return;
    yaRenderizado.current = true;

    window.paypal
      .Buttons({
        style: { color: "gold", shape: "pill", label: "pay" },
        createOrder: async () => {
          const res = await fetch("/api/paypal/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          const datos = await res.json();
          if (!res.ok) throw new Error(datos.error ?? "No se pudo iniciar el pago.");
          return datos.id as string;
        },
        onApprove: async (_data, actions) => {
          // Hay que capturar explícitamente: aprobar no cobra por sí solo.
          await actions.order.capture();
          setEstado("confirmando");
          // El webhook confirma en nuestra base en cuanto PayPal lo manda,
          // normalmente en segundos. Refrescamos la página del servidor
          // para que muestre los QR apenas esté listo.
          setTimeout(() => router.refresh(), 3000);
        },
        onError: (err) => {
          console.error("[paypal]", err);
          setEstado("error");
        },
      })
      .render(`#${contenedorId}`);
  }

  if (estado === "confirmando") {
    return (
      <p className="rounded-sm border border-oro/40 bg-oro/10 px-4 py-3 text-center text-sm text-oro-claro">
        Pago recibido, confirmando… esta página se actualiza sola.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`}
        onLoad={montarBotones}
      />
      <div id={contenedorId} />
      {estado === "error" && (
        <p role="alert" className="text-center text-sm text-hueso-tenue">
          Algo falló con PayPal. Intenta de nuevo o recarga la página.
        </p>
      )}
    </div>
  );
}
