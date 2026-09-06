import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import BotonCobro from "@/components/BotonCobro";
import FormularioLista from "@/components/FormularioLista";
import { PROXIMO, ventaAbierta } from "@/lib/proximo";

/**
 * Página del concierto del 13 de septiembre en el hotel.
 *
 * Aquí no se vende: el hotel cobra en su sistema. Esta página existe para
 * tres cosas, en este orden — informar, mandar el clic medido hacia el hotel
 * (`/ir/hotel`), y recoger el correo de quien no puede ir ese domingo.
 *
 * El formulario de correo va al final y nunca antes del botón: cada paso que
 * se le pone delante a quien ya decidió comprar cuesta compras.
 */

const dondeYCuando = [PROXIMO.fechaTexto, PROXIMO.horaTexto, PROXIMO.lugar]
  .filter(Boolean)
  .join(", ");

export const metadata: Metadata = {
  title: `${PROXIMO.fechaTexto}`,
  description: `${PROXIMO.grupo} en vivo. ${dondeYCuando}.`,
  openGraph: {
    title: `${PROXIMO.grupo} — ${PROXIMO.fechaTexto}`,
    description: `${PROXIMO.grupo} en vivo. ${dondeYCuando}.`,
    type: "website",
    locale: "es_PA",
    images: [{ url: "/fotos/puerta-colonial.jpg", width: 1200, height: 1800 }],
  },
};

export default function TreceDeSeptiembre() {
  const abierta = ventaAbierta();

  return (
    <main>
      {/* ---------- Portada ---------- */}
      <section className="relative min-h-[100svh] overflow-hidden">
        {/* La foto del afiche del hotel. Es vertical y en pantalla ancha se
            recorta arriba y abajo, así que el porcentaje del object-position
            es lo que decide si se les ve la cara. */}
        <Image
          src="/fotos/puerta-colonial.jpg"
          alt={`${PROXIMO.grupo} en vivo`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_42%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-noche/60 via-noche/45 via-55% to-noche" />

        {/* Título arriba y datos abajo, no todo junto al pie como en la
            portada: la foto es vertical y el grupo ocupa la mitad de abajo, así
            que amontonar el texto ahí les tapa la cara. Repartido, el texto cae
            sobre el portón vacío y la banda se ve. Es también la composición
            del afiche del hotel. */}
        <div className="relative flex min-h-[100svh] flex-col items-center justify-between px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
          <div>
            <p className="mb-4 text-xs tracking-[0.4em] text-oro uppercase sm:text-sm">
              {PROXIMO.titulo}
            </p>

            <h1 className="font-display text-5xl leading-[1.05] text-hueso sm:text-7xl lg:text-8xl">
              Los Forasteros
              <span className="block text-oro-claro">del Tango</span>
            </h1>

            <div className="filete mx-auto mt-8 w-full max-w-sm" />
          </div>

          <div className="flex flex-col items-center">
          <div className="space-y-1 text-lg text-hueso sm:text-xl">
            <p className="font-medium">
              {PROXIMO.fechaTexto}
              {PROXIMO.horaTexto && ` · ${PROXIMO.horaTexto}`}
            </p>
            {PROXIMO.lugar && <p className="text-hueso-tenue">{PROXIMO.lugar}</p>}
            {PROXIMO.horaPuertasTexto && (
              <p className="text-xs text-hueso-tenue/70">
                Puertas abren {PROXIMO.horaPuertasTexto}
              </p>
            )}
          </div>

          {abierta ? (
            <>
              <BotonCobro
                de="portada"
                className="mt-10 inline-block rounded-full bg-oro px-10 py-4 text-base font-semibold text-noche transition hover:bg-oro-claro focus-visible:ring-2 focus-visible:ring-oro-claro focus-visible:ring-offset-2 focus-visible:ring-offset-noche focus-visible:outline-none"
              >
                Comprar entradas
                {PROXIMO.precioTexto && ` · ${PROXIMO.precioTexto}`}
              </BotonCobro>
              {PROXIMO.lugar && (
                <p className="mt-4 text-xs text-hueso-tenue">
                  La venta la maneja {PROXIMO.lugar}.
                </p>
              )}
            </>
          ) : (
            <p className="mt-10 rounded-full border border-piedra px-8 py-4 text-base text-hueso-tenue">
              Entradas a la venta muy pronto
            </p>
          )}
          </div>
        </div>
      </section>

      {/* ---------- La noche ---------- */}
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
              La noche
            </p>
            <h2 className="font-display text-4xl text-hueso sm:text-5xl">
              {PROXIMO.titulo}
            </h2>
            <div className="filete my-7 max-w-xs" />
            <div className="space-y-4 text-lg leading-relaxed text-hueso-tenue">
              <p>
                Los tangos que cualquiera reconoce y algunos que valdría la
                pena conocer, en un salón donde se escucha todo de cerca.
              </p>
              <p>{PROXIMO.formacion}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Datos prácticos ---------- */}
      <section className="border-y border-piedra bg-noche-suave">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3 sm:py-20">
          <Dato titulo="Cuándo">
            <p className="text-hueso">{PROXIMO.fechaTexto}</p>
            {PROXIMO.horaTexto && (
              <p className="text-hueso-tenue">{PROXIMO.horaTexto}</p>
            )}
            {PROXIMO.horaPuertasTexto && (
              <p className="text-xs text-hueso-tenue/70">
                Puertas abren {PROXIMO.horaPuertasTexto}
              </p>
            )}
          </Dato>

          <Dato titulo="Dónde">
            {PROXIMO.lugar && <p className="text-hueso">{PROXIMO.lugar}</p>}
            {PROXIMO.direccion &&
              (PROXIMO.mapaUrl ? (
                <a
                  href={PROXIMO.mapaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hueso-tenue underline decoration-oro/40 underline-offset-4 transition hover:text-oro"
                >
                  {PROXIMO.direccion}
                </a>
              ) : (
                <p className="text-hueso-tenue">{PROXIMO.direccion}</p>
              ))}
          </Dato>

          <Dato titulo="Entrada">
            {PROXIMO.precioTexto && (
              <p className="text-hueso">{PROXIMO.precioTexto}</p>
            )}
            {PROXIMO.incluye && (
              <p className="text-hueso-tenue">{PROXIMO.incluye}</p>
            )}
            {PROXIMO.lugar && (
              <p className="text-xs text-hueso-tenue/70">
                Se compra en la página de {PROXIMO.lugar}.
              </p>
            )}
          </Dato>
        </div>
      </section>

      {/* ---------- Cierre ---------- */}
      <section className="relative overflow-hidden">
        {/* Los rostros están a un cuarto de la altura de esta foto; el
            encuadre por defecto los dejaba fuera del recorte. */}
        <Image
          src="/fotos/hero-arco.jpg"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover object-[50%_25%]"
        />
        <div className="absolute inset-0 bg-noche/80" />

        <div className="relative mx-auto max-w-2xl px-6 py-24 text-center sm:py-32">
          <h2 className="font-display text-4xl text-hueso sm:text-5xl">
            Te esperamos
          </h2>

          {abierta && (
            <BotonCobro
              de="cierre"
              className="mt-10 inline-block rounded-full bg-oro px-10 py-4 text-base font-semibold text-noche transition hover:bg-oro-claro focus-visible:ring-2 focus-visible:ring-oro-claro focus-visible:ring-offset-2 focus-visible:ring-offset-noche focus-visible:outline-none"
            >
              Comprar entradas
            </BotonCobro>
          )}

          {/* La captura de correo va aquí, después de las dos oportunidades de
              comprar — es la red para quien no puede ir, no un peaje. */}
          <div className="mt-16 border-t border-piedra pt-10 text-left">
            <p className="mb-2 text-xs tracking-[0.3em] text-oro uppercase">
              ¿No puedes ese día?
            </p>
            <p className="mb-5 text-hueso-tenue">
              Déjanos tu correo y te avisamos del próximo concierto antes que a
              nadie.
            </p>
            <FormularioLista origen="13-septiembre" />
          </div>
        </div>
      </section>

      <footer className="border-t border-piedra px-6 py-10 text-center text-sm text-hueso-tenue">
        <p className="font-display text-base text-oro">{PROXIMO.grupo}</p>
        <p className="mt-2">
          {PROXIMO.fechaTexto}
          {PROXIMO.lugar && ` · ${PROXIMO.lugar}`} · Panamá
        </p>
        <Link
          href="/"
          className="mt-4 inline-block underline underline-offset-4 transition hover:text-oro"
        >
          Sobre el grupo
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
