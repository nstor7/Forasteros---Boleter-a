"use client";

import { useEffect } from "react";

/**
 * Dispara el evento "Purchase" del Pixel de Meta una sola vez por orden.
 * El comprador puede volver a esta página cuando quiera para ver sus QR
 * (está pensado así a propósito, ver app/orden/[id]/page.tsx), así que sin
 * este seguro por localStorage cada visita inflaría el conteo de compras.
 */
export default function MetaPixelPurchase({
  orderId,
  valor,
  cantidad,
}: {
  orderId: string;
  valor: number;
  cantidad: number;
}) {
  useEffect(() => {
    const clave = `fb_purchase_${orderId}`;
    if (localStorage.getItem(clave)) return;

    window.fbq?.("track", "Purchase", {
      value: valor,
      currency: "USD",
      num_items: cantidad,
    });
    localStorage.setItem(clave, "1");
  }, [orderId, valor, cantidad]);

  return null;
}
