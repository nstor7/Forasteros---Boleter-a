import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import BotonPaypal from "@/components/BotonPaypal";
import SubirComprobante from "@/components/SubirComprobante";
import { EVENTO, precio } from "@/lib/event";
import { obtenerOrden, ticketsDeOrden, totalOrden } from "@/lib/orders";
import { qrDataUrl } from "@/lib/tickets";

export const metadata: Metadata = { title: "Tu orden" };

// El estado cambia cuando aprobamos el pago; nunca desde caché.
export const dynamic = "force-dynamic";

export default async function OrdenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orden = await obtenerOrden(id);

  if (!orden) notFound();

  const tickets = orden.status === "paid" ? await ticketsDeOrden(orden.id) : [];
  const qrs = await Promise.all(tickets.map((t) => qrDataUrl(t.code)));

  return (
    <main className="mx-auto max-w-lg px-6 py-12 sm:py-20">
      <Link href="/" className="text-sm text-hueso-tenue transition hover:text-oro">
        ← Volver al inicio
      </Link>

      <header className="mt-8 mb-10 text-center">
        <p className="text-xs tracking-[0.3em] text-oro uppercase">
          Orden {orden.short_code}
        </p>
        <h1 className="mt-3 font-display text-4xl text-hueso">
          {orden.status === "paid" ? "Tus boletos" : "Tu compra"}
        </h1>
        <div className="filete my-6" />
        <p className="text-hueso-tenue">
          {orden.quantity} {orden.quantity === 1 ? "boleto" : "boletos"} ·{" "}
          {totalOrden(orden)}
        </p>
      </header>

      {orden.status === "paid" && <Boletos qrs={qrs} orden={orden.short_code} />}

      {orden.status === "pending_review" &&
        (orden.proof_url ? (
          <ComprobanteRecibido />
        ) : (
          <InstruccionesYappy orden={orden.short_code} total={totalOrden(orden)} id={orden.id} />
        ))}

      {orden.status === "pending" && <EsperandoTarjeta orderId={orden.id} />}

      {(orden.status === "rejected" || orden.status === "expired") && (
        <Rechazada nota={orden.admin_note} />
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- Pagada */

function Boletos({ qrs, orden }: { qrs: string[]; orden: string }) {
  return (
    <div className="space-y-6">
      <p className="rounded-sm border border-oro/40 bg-oro/10 px-4 py-3 text-center text-sm text-oro-claro">
        Pago confirmado. También te enviamos los boletos por correo.
      </p>

      {qrs.map((qr, i) => (
        <div
          key={i}
          className="rounded-sm border border-piedra bg-noche-suave p-6 text-center"
        >
          <p className="mb-4 text-xs tracking-[0.3em] text-oro uppercase">
            Boleto {i + 1} de {qrs.length}
          </p>

          {/* QR sobre blanco: los lectores fallan con fondo oscuro. */}
          <div className="mx-auto w-fit rounded-sm bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt={`Código QR del boleto ${i + 1}`}
              width={256}
              height={256}
              className="h-56 w-56 sm:h-64 sm:w-64"
            />
          </div>

          <p className="mt-4 text-sm text-hueso-tenue">
            {EVENTO.fechaTexto} · {EVENTO.horaTexto} · {EVENTO.lugar}
          </p>
          <p className="text-xs text-hueso-tenue/70">
            Puertas abren {EVENTO.horaPuertasTexto}
          </p>
        </div>
      ))}

      <div className="rounded-sm border border-piedra p-5 text-sm text-hueso-tenue">
        <p className="mb-2 font-semibold text-hueso">En la puerta</p>
        <p>
          Muestra cada QR desde el celular. Cada boleto sirve para una sola
          entrada, así que si vienes acompañado enséñale a cada quien el suyo.
          Si el celular falla, en la puerta pueden buscarte por{" "}
          <span className="text-oro">{orden}</span>.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Yappy */

function InstruccionesYappy({
  orden,
  total,
  id,
}: {
  orden: string;
  total: string;
  id: string;
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-sm border border-piedra bg-noche-suave p-6">
        <p className="mb-5 text-xs tracking-[0.3em] text-oro uppercase">
          Paso 1 · Envía el pago
        </p>

        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-hueso-tenue">Yappy a</dt>
            <dd className="font-display text-3xl text-oro">
              {EVENTO.yappyTelefono}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-hueso-tenue">Monto exacto</dt>
            <dd className="font-display text-3xl text-hueso">{total}</dd>
          </div>
          <div>
            <dt className="text-sm text-hueso-tenue">
              Escribe esto en la descripción
            </dt>
            <dd className="font-mono text-xl tracking-widest text-hueso">
              {orden}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-sm text-hueso-tenue">
          Poner el código nos deja emparejar tu pago sin llamarte.
        </p>
      </div>

      <div>
        <p className="mb-5 text-xs tracking-[0.3em] text-oro uppercase">
          Paso 2 · Sube el comprobante
        </p>
        <SubirComprobante orderId={id} />
      </div>

      <p className="text-center text-sm text-hueso-tenue">
        Guardamos tu cupo mientras revisamos. Los boletos llegan por correo en
        cuanto confirmemos el pago.
      </p>
    </div>
  );
}

function ComprobanteRecibido() {
  return (
    <div className="rounded-sm border border-piedra bg-noche-suave p-8 text-center">
      <p className="font-display text-2xl text-oro">Comprobante recibido</p>
      <p className="mt-4 leading-relaxed text-hueso-tenue">
        Estamos verificando tu pago. Te enviamos los boletos por correo apenas
        lo confirmemos — normalmente el mismo día. Tu cupo ya está apartado.
      </p>
      <p className="mt-4 text-sm text-hueso-tenue">
        Puedes volver a esta página cuando quieras para ver tus QR.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- Tarjeta */

function EsperandoTarjeta({ orderId }: { orderId: string }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    // No debería pasar en producción (si llegó hasta aquí con método
    // "tarjeta" es porque /boletos ya vio la llave de PayPal activa), pero
    // si pasa, no tiene sentido ofrecerle Yappy a mitad de una compra con
    // tarjeta — es una salida distinta a la que eligió, y confunde más de
    // lo que ayuda. Mejor ser honestos: algo falló, que empiece de nuevo.
    return (
      <div className="rounded-sm border border-piedra bg-noche-suave p-8 text-center">
        <p className="font-display text-2xl text-oro">Hubo un problema con el pago</p>
        <p className="mt-4 leading-relaxed text-hueso-tenue">
          No pudimos cargar el cobro con tarjeta para esta orden. Tu cupo
          sigue apartado — intenta de nuevo.
        </p>
        <Link
          href="/boletos"
          className="mt-6 inline-block rounded-full bg-oro px-8 py-3 font-semibold text-noche transition hover:bg-oro-claro"
        >
          Volver a intentar
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-piedra bg-noche-suave p-8 text-center">
      <p className="font-display text-2xl text-oro">Completa el pago</p>
      <p className="mt-4 mb-6 leading-relaxed text-hueso-tenue">
        Tu cupo está reservado. Paga con tarjeta o cuenta de PayPal para
        recibir tus boletos al instante.
      </p>
      <BotonPaypal orderId={orderId} clientId={clientId} />
    </div>
  );
}

/* ------------------------------------------------------------- Rechazada */

function Rechazada({ nota }: { nota: string | null }) {
  return (
    <div className="rounded-sm border border-acordeon/50 bg-acordeon/10 p-8 text-center">
      <p className="font-display text-2xl text-hueso">Orden no confirmada</p>
      <p className="mt-4 leading-relaxed text-hueso-tenue">
        {nota ?? "No pudimos verificar el pago de esta orden."}
      </p>
      <Link
        href="/boletos"
        className="mt-6 inline-block rounded-full border border-hueso-tenue/40 px-8 py-3 text-hueso transition hover:border-oro hover:text-oro"
      >
        Intentar de nuevo
      </Link>
      <p className="mt-4 text-xs text-hueso-tenue">
        Precio vigente: {precio(EVENTO.precioCents)}
      </p>
    </div>
  );
}
