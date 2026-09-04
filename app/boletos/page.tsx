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
  // Se pone en `false` solo cuando de verdad no hay ningún tipo de boleto
  // activo (evento cerrado a propósito, ver `ticket_types.active` en
  // Supabase) — no por un simple hipo de red, que se resuelve solo.
  let ventaAbierta = true;

  try {
    const tipo = await tipoBoletoActivo();
    disponibles = await boletosDisponibles(tipo.id);
  } catch {
    ventaAbierta = false;
  }

  if (!ventaAbierta) {
    return (
      <main className="mx-auto max-w-lg px-6 py-12 text-center sm:py-20">
        <Link href="/" className="text-sm text-hueso-tenue transition hover:text-oro">
          ← Volver
        </Link>
        <div className="mt-16">
          <p className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
            {EVENTO.titulo}
          </p>
          <h1 className="font-display text-4xl text-hueso sm:text-5xl">
            Gracias por acompañarnos
          </h1>
          <div className="filete my-6" />
          <p className="text-hueso-tenue">
            La venta de boletos para este evento ya cerró. Síguenos para
            enterarte del próximo.
          </p>
        </div>
      </main>
    );
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
        <p className="text-xs text-hueso-tenue/70">{EVENTO.direccion}</p>
        <p className="text-xs text-hueso-tenue/70">
          Puertas abren {EVENTO.horaPuertasTexto}
        </p>
        <p className="mt-1 text-hueso-tenue">
          {precio(EVENTO.precioCents)} por persona · Tarjeta o Yappy
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
