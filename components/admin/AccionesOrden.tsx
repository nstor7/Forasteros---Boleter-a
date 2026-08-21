"use client";

import { useActionState, useState } from "react";

import { aprobar, rechazar } from "@/app/admin/actions";

type Resultado = { error: string | null; mensaje?: string };
const INICIAL: Resultado = { error: null };

export default function AccionesOrden({ id }: { id: string }) {
  const [estadoOk, accionAprobar, aprobando] = useActionState(aprobar, INICIAL);
  const [estadoNo, accionRechazar, rechazando] = useActionState(rechazar, INICIAL);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  const resultado = estadoOk.mensaje || estadoNo.mensaje;
  const error = estadoOk.error || estadoNo.error;

  return (
    <div className="mt-4 space-y-3">
      {resultado && (
        <p className="rounded-sm border border-oro/40 bg-oro/10 px-3 py-2 text-sm text-oro-claro">
          {resultado}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-acordeon">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <form action={accionAprobar}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={aprobando}
            className="rounded-full bg-oro px-6 py-2.5 text-sm font-semibold text-noche transition hover:bg-oro-claro disabled:opacity-50"
          >
            {aprobando ? "Emitiendo…" : "Aprobar y enviar boletos"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMostrarRechazo((v) => !v)}
          className="rounded-full border border-piedra px-6 py-2.5 text-sm text-hueso-tenue transition hover:border-acordeon hover:text-acordeon"
        >
          Rechazar
        </button>
      </div>

      {mostrarRechazo && (
        <form action={accionRechazar} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={id} />
          <input
            name="motivo"
            placeholder="Motivo (le llega al comprador)"
            className="min-w-48 flex-1 rounded-sm border border-piedra bg-noche px-3 py-2 text-sm text-hueso outline-none focus:border-oro"
          />
          <button
            type="submit"
            disabled={rechazando}
            className="rounded-full bg-acordeon px-5 py-2 text-sm font-semibold text-hueso transition hover:opacity-90 disabled:opacity-50"
          >
            {rechazando ? "…" : "Confirmar rechazo"}
          </button>
        </form>
      )}
    </div>
  );
}
