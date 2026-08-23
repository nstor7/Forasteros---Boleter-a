import Image from "next/image";
import Link from "next/link";

import { EVENTO, precio } from "@/lib/event";

export default function Home() {
  return (
    <main>
      {/* ---------- Portada ---------- */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <Image
          src="/fotos/hero-arco.jpg"
          alt={`${EVENTO.grupo} en el Casco Antiguo`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_28%]"
        />
        {/* El degradado hace legible el texto sin apagar la luz dorada de la foto */}
        <div className="absolute inset-0 bg-gradient-to-b from-noche/60 via-noche/45 via-55% to-noche" />

        <div className="relative flex min-h-[100svh] flex-col items-center justify-end px-6 pb-16 text-center sm:pb-24">
          <p className="mb-4 text-xs tracking-[0.4em] text-oro uppercase sm:text-sm">
            {EVENTO.titulo}
          </p>

          <h1 className="font-display text-5xl leading-[1.05] text-hueso sm:text-7xl lg:text-8xl">
            Los Forasteros
            <span className="block text-oro-claro">del Tango</span>
          </h1>

          <div className="filete my-8 w-full max-w-sm" />

          <div className="space-y-1 text-lg text-hueso sm:text-xl">
            <p className="font-medium">
              {EVENTO.fechaTexto} · {EVENTO.horaTexto}
            </p>
            <p className="text-hueso-tenue">{EVENTO.lugar}</p>
          </div>

          <Link
            href="/boletos"
            className="mt-10 inline-block rounded-full bg-oro px-10 py-4 text-base font-semibold text-noche transition hover:bg-oro-claro focus-visible:ring-2 focus-visible:ring-oro-claro focus-visible:ring-offset-2 focus-visible:ring-offset-noche focus-visible:outline-none"
          >
            Comprar boletos · {precio(EVENTO.precioCents)}
          </Link>
        </div>
      </section>

      {/* ---------- El grupo ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[3/4] overflow-hidden rounded-sm">
            <Image
              src="/fotos/grupo-parque.jpg"
              alt={EVENTO.grupo}
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
                Violín, contrabajo, acordeón, guitarra y voz para una noche de
                tango en el corazón de la ciudad.
              </p>
              <p>
                Una velada íntima, para {EVENTO.aforo} personas nada más, en un
                escenario que se presta para escuchar de cerca.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Datos prácticos ---------- */}
      <section className="border-y border-piedra bg-noche-suave">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3 sm:py-20">
          <Dato titulo="Cuándo">
            <p className="text-hueso">{EVENTO.fechaTexto}</p>
            <p className="text-hueso-tenue">{EVENTO.horaTexto}</p>
          </Dato>

          <Dato titulo="Dónde">
            <p className="text-hueso">{EVENTO.lugar}</p>
            <a
              href={EVENTO.mapaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-hueso-tenue underline decoration-oro/40 underline-offset-4 transition hover:text-oro"
            >
              {EVENTO.direccion}
            </a>
          </Dato>

          <Dato titulo="Entrada">
            <p className="text-hueso">
              {precio(EVENTO.precioCents)} por persona
            </p>
            <p className="text-hueso-tenue">Tarjeta o Yappy</p>
          </Dato>
        </div>
      </section>

      {/* ---------- Cierre ---------- */}
      <section className="relative overflow-hidden">
        <Image
          src="/fotos/puerta-colonial.jpg"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover object-[50%_35%]"
        />
        <div className="absolute inset-0 bg-noche/80" />

        <div className="relative mx-auto max-w-2xl px-6 py-24 text-center sm:py-32">
          <h2 className="font-display text-4xl text-hueso sm:text-5xl">
            Te esperamos
          </h2>
          <p className="mt-5 text-lg text-hueso-tenue">
            Tu boleto llega con un código QR que presentas en la puerta. Nada de
            imprimir: basta con mostrarlo desde el celular.
          </p>

          <Link
            href="/boletos"
            className="mt-10 inline-block rounded-full bg-oro px-10 py-4 text-base font-semibold text-noche transition hover:bg-oro-claro focus-visible:ring-2 focus-visible:ring-oro-claro focus-visible:ring-offset-2 focus-visible:ring-offset-noche focus-visible:outline-none"
          >
            Comprar boletos
          </Link>
        </div>
      </section>

      <footer className="border-t border-piedra px-6 py-10 text-center text-sm text-hueso-tenue">
        <p className="font-display text-base text-oro">{EVENTO.grupo}</p>
        <p className="mt-2">
          {EVENTO.fechaTexto} · {EVENTO.lugar} · Panamá
        </p>
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

function Dato({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
        {titulo}
      </p>
      <div className="space-y-1 text-lg">{children}</div>
    </div>
  );
}
