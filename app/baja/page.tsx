import type { Metadata } from "next";
import Link from "next/link";

import { firmaBajaValida } from "@/lib/lista";
import { PROXIMO } from "@/lib/proximo";

import { confirmarBaja } from "./actions";

export const metadata: Metadata = { title: "Darse de baja" };

/**
 * Baja de la lista de correos.
 *
 * La baja se confirma con un botón y no al abrir el enlace: los filtros de
 * correo de Gmail y Outlook visitan los enlaces por su cuenta para
 * revisarlos, y darían de baja a gente que nunca lo pidió.
 */
export default async function BajaPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string; estado?: string }>;
}) {
  const { e: email = "", t: firma = "", estado } = await searchParams;

  const valido = email !== "" && firma !== "" && firmaBajaValida(email, firma);

  return (
    <main className="mx-auto max-w-lg px-6 py-20 text-center">
      <p className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
        {PROXIMO.grupo}
      </p>

      {estado === "hecho" ? (
        <>
          <h1 className="font-display text-4xl text-hueso">Listo</h1>
          <div className="filete my-6" />
          <p className="text-hueso-tenue">
            No te escribimos más. Gracias por habernos acompañado.
          </p>
        </>
      ) : !valido || estado === "invalido" ? (
        <>
          <h1 className="font-display text-4xl text-hueso">Enlace vencido</h1>
          <div className="filete my-6" />
          <p className="text-hueso-tenue">
            Este enlace no sirve para dar de baja ningún correo. Respóndenos el
            correo que recibiste y te sacamos de la lista a mano.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-4xl text-hueso">
            ¿Dejamos de escribirte?
          </h1>
          <div className="filete my-6" />
          <p className="text-hueso-tenue">
            Sacaremos <span className="text-hueso">{email}</span> de la lista.
            No recibirás más correos nuestros.
          </p>

          <form action={confirmarBaja} className="mt-8">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="t" value={firma} />
            <button
              type="submit"
              className="rounded-full bg-oro px-8 py-3 text-base font-semibold text-noche transition hover:bg-oro-claro"
            >
              Sí, darme de baja
            </button>
          </form>
        </>
      )}

      <Link
        href="/"
        className="mt-10 inline-block text-sm text-hueso-tenue underline underline-offset-4 transition hover:text-oro"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
