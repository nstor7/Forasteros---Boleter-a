"use client";

import { useActionState, useState } from "react";

import { generarEntrada } from "@/app/admin/actions";

type Resultado = { error: string | null; mensaje?: string };
const INICIAL: Resultado = { error: null };

/**
 * Genera boletos a mano desde el panel, para ventas que pasaron fuera de la
 * plataforma: efectivo, o Yappy a otra persona del grupo que no sea Nestor.
 * Mismos datos que pide el checkout público, pero sin método de pago — el
 * admin ya cobró por su cuenta, esto solo emite el boleto y lo manda por
 * correo.
 */
export default function GenerarEntrada() {
  const [estado, accion, generando] = useActionState(generarEntrada, INICIAL);
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="mb-10">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="mb-4 text-xs tracking-[0.3em] text-oro uppercase transition hover:text-oro-claro"
      >
        {abierto ? "− Generar boletos a mano" : "+ Generar boletos a mano"}
      </button>

      {abierto && (
        <div className="rounded-sm border border-piedra bg-noche-suave p-5">
          <p className="mb-5 text-sm text-hueso-tenue">
            Para ventas en efectivo o por Yappy a otra persona del grupo. Se
            genera el boleto de una vez, ya pagado, y se envía por correo.
          </p>

          <form action={accion} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo nombre="nombre" etiqueta="Nombre completo" tipo="text" requerido />
              <Campo nombre="email" etiqueta="Correo electrónico" tipo="email" requerido />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo nombre="telefono" etiqueta="Teléfono (opcional)" tipo="tel" />
              <Campo
                nombre="cantidad"
                etiqueta="Cuántos boletos"
                tipo="number"
                defaultValue="1"
                min={1}
                requerido
              />
            </div>

            <div>
              <label htmlFor="nota" className="mb-1.5 block text-sm text-hueso-tenue">
                Nota (opcional — cómo se pagó, para tu propio registro)
              </label>
              <input
                id="nota"
                name="nota"
                type="text"
                placeholder="Ej. Efectivo, o Yappy a Fulano"
                className="w-full rounded-sm border border-piedra bg-noche px-4 py-3 text-hueso outline-none transition placeholder:text-hueso-tenue/50 focus:border-oro"
              />
            </div>

            {estado?.mensaje && (
              <p className="rounded-sm border border-oro/40 bg-oro/10 px-3 py-2 text-sm text-oro-claro">
                {estado.mensaje}
              </p>
            )}
            {estado?.error && (
              <p role="alert" className="text-sm text-acordeon">
                {estado.error}
              </p>
            )}

            <button
              type="submit"
              disabled={generando}
              className="w-full rounded-full bg-oro px-8 py-3 text-sm font-semibold text-noche transition hover:bg-oro-claro disabled:opacity-50 sm:w-auto"
            >
              {generando ? "Generando…" : "Generar boletos"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function Campo({
  nombre,
  etiqueta,
  tipo,
  requerido,
  defaultValue,
  min,
}: {
  nombre: string;
  etiqueta: string;
  tipo: string;
  requerido?: boolean;
  defaultValue?: string;
  min?: number;
}) {
  return (
    <div>
      <label htmlFor={nombre} className="mb-1.5 block text-sm text-hueso-tenue">
        {etiqueta}
        {requerido && <span className="text-oro"> *</span>}
      </label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        required={requerido}
        defaultValue={defaultValue}
        min={min}
        className="w-full rounded-sm border border-piedra bg-noche px-4 py-3 text-hueso outline-none transition focus:border-oro"
      />
    </div>
  );
}
