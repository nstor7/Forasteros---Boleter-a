"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
      }) => { render: (selector: string | HTMLElement) => Promise<void> };
    };
  }
}

type Estado = "cargando" | "carga_lenta" | "listo" | "confirmando" | "tardando" | "error";

export default function BotonPaypal({
  orderId,
  clientId,
}: {
  orderId: string;
  clientId: string;
}) {
  const router = useRouter();
  const contenedorId = "botones-paypal";
  // Empieza en "cargando": el SDK de PayPal tarda un momento en llegar y
  // renderizar sus botones, y antes de este cambio la pantalla se quedaba
  // en blanco mientras tanto — Nestor tuvo que recargar a mano porque
  // parecía que la página no hacía nada.
  const [estado, setEstado] = useState<Estado>("cargando");
  const yaRenderizado = useRef(false);

  // Si el SDK no termina de cargar/renderizar en un tiempo largo (script
  // bloqueado, red lenta), no dejamos a la persona esperando para siempre:
  // aparece una salida mínima. 20s es mucho más que lo que tarda un SDK que
  // sí está cargando — esto es solo para el caso roto.
  useEffect(() => {
    if (estado !== "cargando") return;

    const id = setTimeout(() => setEstado((actual) => (actual === "cargando" ? "carga_lenta" : actual)), 20000);
    return () => clearTimeout(id);
  }, [estado]);

  // El webhook de PayPal no siempre llega en los primeros segundos.
  // Reintentamos el refresh varias veces en vez de una sola: si la orden ya
  // quedó "paid", el servidor devuelve los QR y este componente ni se monta
  // de nuevo. Si se agotan los intentos, mostramos cómo seguir a mano —
  // el pago ya se hizo, nunca hay que dejar al comprador sin su boleto.
  useEffect(() => {
    if (estado !== "confirmando") return;

    let intentos = 0;
    const MAX_INTENTOS = 15; // ~45s a 3s cada uno

    const id = setInterval(() => {
      intentos += 1;
      router.refresh();
      if (intentos >= MAX_INTENTOS) {
        clearInterval(id);
        setEstado("tardando");
      }
    }, 3000);

    return () => clearInterval(id);
  }, [estado, router]);

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
        },
        onError: (err) => {
          console.error("[paypal]", err);
          setEstado("error");
        },
      })
      .render(`#${contenedorId}`)
      // `render()` resuelve cuando el botón ya está pintado en pantalla; solo
      // ahí quitamos el mensaje de "cargando" (si algo va mal, cae al catch).
      .then(() => setEstado((actual) => (actual === "confirmando" ? actual : "listo")))
      .catch((err) => {
        console.error("[paypal] render", err);
        setEstado("error");
      });
  }

  if (estado === "confirmando") {
    return <Esperando texto="Pago recibido. Preparando tu QR…" />;
  }

  if (estado === "tardando") {
    return (
      <div className="space-y-3">
        <p className="rounded-sm border border-oro/40 bg-oro/10 px-4 py-3 text-center text-sm text-oro-claro">
          Tu pago se hizo, pero la confirmación está tardando más de lo
          normal.
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="w-full rounded-full border border-piedra px-6 py-3 text-sm text-hueso transition hover:border-oro hover:text-oro"
        >
          Volver a revisar
        </button>
        <p className="text-center text-xs text-hueso-tenue">
          Si sigue igual en unos minutos, escríbenos con tu código de orden —
          el pago ya quedó registrado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {estado === "cargando" && <Esperando texto="Cargando la opción de pago…" />}

      {/* Pasados 20s asumimos que algo se atoró (red, bloqueador de
          scripts): en vez de dejar el spinner girando para siempre, se
          reemplaza por una salida sencilla y honesta. */}
      {estado === "carga_lenta" && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full text-center text-sm text-hueso-tenue underline underline-offset-4 transition hover:text-oro"
        >
          Esto está tardando más de lo normal — toca para recargar
        </button>
      )}

      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`}
        onLoad={montarBotones}
      />
      {/* Oculto mientras carga: si no, se ve un hueco vacío antes de que
          PayPal pinte el botón dentro. */}
      <div id={contenedorId} className={estado === "cargando" || estado === "carga_lenta" ? "hidden" : undefined} />

      {estado === "error" && (
        <p role="alert" className="text-center text-sm text-hueso-tenue">
          Algo falló con PayPal. Intenta de nuevo o recarga la página.
        </p>
      )}
    </div>
  );
}

/**
 * Señal mínima de "espera, ya viene": un spinner y una frase concreta sobre
 * qué está pasando, sin recuadro de alerta ni botones — para no hacer parecer
 * que hay una decisión que tomar cuando solo hay que esperar un segundo.
 */
function Esperando({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-4 text-center text-sm text-hueso-tenue">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-hueso-tenue/30 border-t-oro" />
      {texto}
    </div>
  );
}
