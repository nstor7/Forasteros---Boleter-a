"use client";

import { useActionState } from "react";

import { entrar } from "@/app/admin/actions";

export default function LoginAdmin() {
  const [estado, accion, pendiente] = useActionState(entrar, { error: null });

  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="clave" className="mb-1.5 block text-sm text-hueso-tenue">
          Contraseña
        </label>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="w-full rounded-sm border border-piedra bg-noche-suave px-4 py-3 text-hueso outline-none focus:border-oro"
        />
      </div>

      {estado?.error && (
        <p role="alert" className="text-sm text-acordeon">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-full bg-oro px-8 py-3 font-semibold text-noche transition hover:bg-oro-claro disabled:opacity-50"
      >
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
