"use client";

import { leerUTM } from "@/components/CapturarUTM";

/**
 * Botón que manda a comprar al hotel, pasando por `/ir/hotel` para que el
 * clic quede contado.
 *
 * Es un `<a>` normal a propósito: si el JavaScript no cargó, el enlace sigue
 * funcionando. Las etiquetas de campaña se agregan en el momento del clic
 * (viven en localStorage, que no existe en el servidor), y si eso falla se
 * va igual con el enlace base — nunca al revés.
 */
export default function BotonCobro({
  de,
  children,
  className,
}: {
  de: string;
  children: React.ReactNode;
  className?: string;
}) {
  function alHacerClic(e: React.MouseEvent<HTMLAnchorElement>) {
    window.fbq?.("trackCustom", "ClicCobroHotel", { origen: de });

    try {
      const params = new URLSearchParams({ de });
      for (const [clave, valor] of Object.entries(leerUTM())) {
        params.set(clave, valor);
      }
      e.currentTarget.href = `/ir/hotel?${params}`;
    } catch {
      // Se va con el enlace base; perdemos la atribución de ese clic y ya.
    }
  }

  return (
    <a href={`/ir/hotel?de=${encodeURIComponent(de)}`} onClick={alHacerClic} className={className}>
      {children}
    </a>
  );
}
