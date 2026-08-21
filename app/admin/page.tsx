import type { Metadata } from "next";
import Link from "next/link";

import { salir, urlComprobante } from "@/app/admin/actions";
import AccionesOrden from "@/components/admin/AccionesOrden";
import LoginAdmin from "@/components/admin/LoginAdmin";
import { haySesion } from "@/lib/auth";
import { boletosDisponibles, db, tipoBoletoActivo, type Order } from "@/lib/db";
import { EVENTO } from "@/lib/event";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await haySesion("admin"))) {
    return (
      <main className="mx-auto max-w-sm px-6 py-24">
        <h1 className="mb-2 font-display text-3xl text-hueso">Panel</h1>
        <p className="mb-8 text-sm text-hueso-tenue">
          Solo para la organización del evento.
        </p>
        <LoginAdmin />
      </main>
    );
  }

  const { data } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const ordenes = (data ?? []) as Order[];
  const porRevisar = ordenes.filter((o) => o.status === "pending_review");
  const pagadas = ordenes.filter((o) => o.status === "paid");
  const resto = ordenes.filter(
    (o) => o.status !== "pending_review" && o.status !== "paid",
  );

  const vendidos = pagadas.reduce((suma, o) => suma + o.quantity, 0);
  const recaudado = pagadas.reduce((suma, o) => suma + o.total_cents, 0);

  let quedan: number | null = null;
  try {
    quedan = await boletosDisponibles((await tipoBoletoActivo()).id);
  } catch {
    quedan = null;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-hueso">Panel</h1>
          <p className="text-sm text-hueso-tenue">{EVENTO.grupo}</p>
        </div>
        <form action={salir}>
          <button className="text-sm text-hueso-tenue transition hover:text-oro">
            Salir
          </button>
        </form>
      </div>

      <div className="mb-10 grid grid-cols-3 gap-3">
        <Cifra valor={String(vendidos)} etiqueta="vendidos" />
        <Cifra valor={`$${(recaudado / 100).toFixed(0)}`} etiqueta="recaudado" />
        <Cifra
          valor={quedan === null ? "—" : String(quedan)}
          etiqueta={`de ${EVENTO.aforo} libres`}
        />
      </div>

      <Seccion
        titulo={`Por revisar (${porRevisar.length})`}
        vacio="Nada pendiente. Cuando alguien suba un comprobante de Yappy aparece aquí."
      >
        {porRevisar.map((orden) => (
          <TarjetaOrden key={orden.id} orden={orden} revisable />
        ))}
      </Seccion>

      <Seccion titulo={`Pagadas (${pagadas.length})`} vacio="Aún no hay ventas confirmadas.">
        {pagadas.map((orden) => (
          <TarjetaOrden key={orden.id} orden={orden} />
        ))}
      </Seccion>

      {resto.length > 0 && (
        <Seccion titulo={`Otras (${resto.length})`} vacio="">
          {resto.map((orden) => (
            <TarjetaOrden key={orden.id} orden={orden} />
          ))}
        </Seccion>
      )}
    </main>
  );
}

async function TarjetaOrden({
  orden,
  revisable,
}: {
  orden: Order;
  revisable?: boolean;
}) {
  // URL firmada que dura una hora: el bucket de comprobantes es privado.
  const comprobante = orden.proof_url ? await urlComprobante(orden.proof_url) : null;

  return (
    <article className="rounded-sm border border-piedra bg-noche-suave p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-sm tracking-widest text-oro">
            {orden.short_code}
          </p>
          <p className="mt-1 text-hueso">{orden.buyer_name}</p>
          <p className="text-sm text-hueso-tenue">{orden.buyer_email}</p>
          {orden.buyer_phone && (
            <p className="text-sm text-hueso-tenue">Tel {orden.buyer_phone}</p>
          )}
        </div>

        <div className="text-right">
          <p className="font-display text-2xl text-hueso">
            ${(orden.total_cents / 100).toFixed(2)}
          </p>
          <p className="text-sm text-hueso-tenue">
            {orden.quantity} {orden.quantity === 1 ? "boleto" : "boletos"} ·{" "}
            {orden.payment_method === "yappy" ? "Yappy" : "Tarjeta"}
          </p>
          <p className="text-xs text-hueso-tenue">
            {new Date(orden.created_at).toLocaleString("es-PA", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {comprobante && (
        <a
          href={comprobante}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-oro underline underline-offset-4"
        >
          Ver comprobante →
        </a>
      )}

      {revisable && !orden.proof_url && (
        <p className="mt-3 text-sm text-hueso-tenue">
          Todavía no ha subido comprobante.
        </p>
      )}

      {revisable && <AccionesOrden id={orden.id} />}

      {orden.status === "paid" && (
        <Link
          href={`/orden/${orden.id}`}
          className="mt-3 inline-block text-sm text-hueso-tenue underline underline-offset-4 hover:text-oro"
        >
          Ver boletos
        </Link>
      )}

      {orden.admin_note && orden.status !== "paid" && (
        <p className="mt-3 text-sm text-acordeon">{orden.admin_note}</p>
      )}
    </article>
  );
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-sm border border-piedra bg-noche-suave p-4 text-center">
      <p className="font-display text-3xl text-oro">{valor}</p>
      <p className="mt-1 text-xs text-hueso-tenue">{etiqueta}</p>
    </div>
  );
}

function Seccion({
  titulo,
  vacio,
  children,
}: {
  titulo: string;
  vacio: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xs tracking-[0.3em] text-oro uppercase">{titulo}</h2>
      {children.length === 0 ? (
        vacio ? (
          <p className="text-sm text-hueso-tenue">{vacio}</p>
        ) : null
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </section>
  );
}
