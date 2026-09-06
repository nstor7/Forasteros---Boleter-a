import Image from "next/image";
import Link from "next/link";

import FormularioLista from "@/components/FormularioLista";
import { PROXIMO, ventaAbierta } from "@/lib/proximo";

/**
 * Portada del grupo — ya no de un concierto.
 *
 * Hasta el 3 de septiembre esta página anunciaba el concierto del 2 en Rock
 * and Folk, con un botón de compra que llevaba a "la venta ya cerró". El
 * enlace de la bio de Instagram apunta aquí y fue el canal que más boletos
 * vendió, así que la portada tiene que hablar del grupo y mandar a la fecha
 * que esté viva; cada concierto vive en su propia página.
 */
export default function Home() {
  return (
    <main>
      {/* ---------- Portada ---------- */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <Image
          src="/fotos/hero-arco.jpg"
          alt={`${PROXIMO.grupo}, quinteto de tango en Panamá`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_28%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-noche/60 via-noche/45 via-55% to-noche" />

        <div className="relative flex min-h-[100svh] flex-col items-center justify-end px-6 pb-16 text-center sm:pb-24">
          <p className="mb-4 text-xs tracking-[0.4em] text-oro uppercase sm:text-sm">
            Quinteto de tango · Panamá
          </p>

          <h1 className="font-display text-5xl leading-[1.05] text-hueso sm:text-7xl lg:text-8xl">
            Los Forasteros
            <span className="block text-oro-claro">del Tango</span>
          </h1>

          <div className="filete my-8 w-full max-w-sm" />

          <p className="max-w-md text-lg text-hueso-tenue sm:text-xl">
            Violín, contrabajo, acordeón, piano y voz. Tango en vivo, con
            bailarines y cantantes invitados.
          </p>

          <Link
            href="/13-septiembre"
            className="mt-10 inline-block rounded-full bg-oro px-10 py-4 text-base font-semibold text-noche transition hover:bg-oro-claro focus-visible:ring-2 focus-visible:ring-oro-claro focus-visible:ring-offset-2 focus-visible:ring-offset-noche focus-visible:outline-none"
          >
            Próximo concierto · {PROXIMO.fechaTexto}
          </Link>
        </div>
      </section>

      {/* ---------- El grupo ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[3/4] overflow-hidden rounded-sm">
            <Image
              src="/fotos/grupo-parque.jpg"
              alt={PROXIMO.grupo}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div>
            <p className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
              El grupo
            </p>
            <h2 className="font-display text-4xl text-hueso sm:text-5xl">
              Acordeón, cuerdas y voz
            </h2>
            <div className="filete my-7 max-w-xs" />
            <div className="space-y-4 text-lg leading-relaxed text-hueso-tenue">
              <p>
                Tres años tocando tango en Panamá: los que todo el mundo
                reconoce y los que valdría la pena conocer.
              </p>
              <p>
                En escena, el quinteto suma bailarines y un cantante invitado —
                un show completo, no solo un concierto sentado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Próximas fechas ---------- */}
      <section className="border-y border-piedra bg-noche-suave">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="mb-8 text-xs tracking-[0.3em] text-oro uppercase">
            Próximas fechas
          </p>

          <Link
            href="/13-septiembre"
            className="group flex flex-col gap-2 border-t border-piedra py-6 transition sm:flex-row sm:items-baseline sm:gap-8"
          >
            <span className="font-display text-2xl text-hueso transition group-hover:text-oro sm:w-72">
              {PROXIMO.fechaTexto}
            </span>
            <span className="flex-1 text-hueso-tenue">
              {[PROXIMO.horaTexto, PROXIMO.lugar].filter(Boolean).join(" · ") ||
                "Detalles muy pronto"}
            </span>
            <span className="text-sm text-oro">
              {ventaAbierta() ? "Entradas →" : "Ver detalles →"}
            </span>
          </Link>
        </div>
      </section>

      {/* ---------- Cierre ---------- */}
      <section className="relative overflow-hidden">
        {/* En esta foto el grupo está más abajo que en la del arco, así que el
            porcentaje no coincide con el de la otra página. */}
        <Image
          src="/fotos/puerta-colonial.jpg"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover object-[50%_44%]"
        />
        <div className="absolute inset-0 bg-noche/80" />

        <div className="relative mx-auto max-w-2xl px-6 py-24 text-center sm:py-32">
          <h2 className="font-display text-4xl text-hueso sm:text-5xl">
            Entérate de los próximos
          </h2>
          <p className="mt-5 text-lg text-hueso-tenue">
            Anunciamos las fechas por correo antes que en ningún otro lado.
          </p>

          <div className="mt-10 text-left">
            <FormularioLista origen="portada" />
          </div>
        </div>
      </section>

      <footer className="border-t border-piedra px-6 py-10 text-center text-sm text-hueso-tenue">
        <p className="font-display text-base text-oro">{PROXIMO.grupo}</p>
        <p className="mt-2">Panamá</p>
        <Link
          href="/terminos"
          className="mt-4 inline-block underline underline-offset-4 transition hover:text-oro"
        >
          Términos y política de reembolso
        </Link>
      </footer>
    </main>
  );
}
