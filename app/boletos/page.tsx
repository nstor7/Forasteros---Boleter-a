import type { Metadata } from "next";
import Link from "next/link";

import FormularioCompra from "@/components/FormularioCompra";
import { boletosDisponibles, tipoBoletoActivo } from "@/lib/db";
import { EVENTO, precio } from "@/lib/event";

export const metadata: Metadata = { title: "Comprar boletos" };

// El cupo cambia con cada venta: esta página nunca se sirve desde caché.
export const dynamic = "force-dynamic";

export default async function ComprarPage() {
  let disponibles: number | null = null;

  try {
    const tipo = await tipoBoletoActivo();
    disponibles = await boletosDisponibles(tipo.id);
  } catch {
    // Sin base de datos no podemos vender; el formulario lo dirá al enviar.
    disponibles = null;
  }

  // La opción de tarjeta solo aparece si PayPal está configurado. Mostrar un
  // botón que no cobra es peor que no mostrarlo.
  const tarjetaActiva = Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);

  return (
    <main className="mx-auto max-w-lg px-6 py-12 sm:py-20">
      <Link
        href="/"
        className="text-sm text-hueso-tenue transition hover:text-oro"
      >
        ← Volver
      </Link>

      <header className="mt-8 mb-10">
        <p className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
          {EVENTO.titulo}
        </p>
        <h1 className="font-display text-4xl text-hueso sm:text-5xl">
          {EVENTO.grupo}
        </h1>
        <div className="filete my-6" />
        <p className="text-hueso-tenue">
          {EVENTO.fechaTexto} · {EVENTO.horaTexto} · {EVENTO.lugar}
        </p>
        <p className="text-xs text-hueso-tenue/70">
          Puertas abren {EVENTO.horaPuertasTexto}
        </p>
        <p className="mt-1 text-hueso-tenue">
          {precio(EVENTO.precioCents)} por persona
        </p>
      </header>

      {disponibles !== null && disponibles > 0 && disponibles <= 20 && (
        <p className="mb-6 rounded-sm border border-oro/40 bg-oro/10 px-4 py-3 text-sm text-oro-claro">
          Quedan {disponibles} boletos de {EVENTO.aforo}.
        </p>
      )}

      <FormularioCompra disponibles={disponibles} tarjetaActiva={tarjetaActiva} />
    </main>
  );
}
