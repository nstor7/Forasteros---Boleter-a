"use client";

import { useActionState } from "react";

import { entrarPuerta } from "@/app/validar/actions";

export default function LoginPuerta() {
  const [estado, accion, pendiente] = useActionState(entrarPuerta, { error: null });

  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="pin" className="mb-1.5 block text-sm text-hueso-tenue">
          PIN de la puerta
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          required
          autoFocus
          className="w-full rounded-sm border border-piedra bg-noche-suave px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-hueso outline-none focus:border-oro"
        />
      </div>

      {estado?.error && (
        <p role="alert" className="text-center text-sm text-acordeon">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-full bg-oro px-8 py-3 font-semibold text-noche transition hover:bg-oro-claro disabled:opacity-50"
      >
        {pendiente ? "Entrando…" : "Abrir escáner"}
      </button>
    </form>
  );
}
