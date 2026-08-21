import type { Metadata } from "next";

import { salirPuerta } from "@/app/validar/actions";
import Escaner from "@/components/Escaner";
import LoginPuerta from "@/components/LoginPuerta";
import { haySesion } from "@/lib/auth";
import { EVENTO } from "@/lib/event";

export const metadata: Metadata = {
  title: "Validar boletos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ValidarPage() {
  if (!(await haySesion("puerta"))) {
    return (
      <main className="mx-auto max-w-sm px-6 py-24">
        <h1 className="mb-2 text-center font-display text-3xl text-hueso">
          Puerta
        </h1>
        <p className="mb-8 text-center text-sm text-hueso-tenue">
          {EVENTO.lugar} · {EVENTO.fechaTexto}
        </p>
        <LoginPuerta />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-hueso">Puerta</h1>
        <form action={salirPuerta}>
          <button className="text-sm text-hueso-tenue transition hover:text-oro">
            Salir
          </button>
        </form>
      </div>

      <Escaner />

      <p className="mt-8 text-center text-xs leading-relaxed text-hueso-tenue">
        Apunta al QR del celular. Verde: adelante. Rojo: ya entró o no es
        válido. Si alguien no puede mostrar el QR, escribe el código de su
        orden.
      </p>
    </main>
  );
}
