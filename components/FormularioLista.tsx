"use client";

import { useState } from "react";

import { leerUTM } from "@/components/CapturarUTM";

/**
 * Alta en la lista de correos.
 *
 * Va **debajo** del botón de compra, nunca antes: quien puede ir el domingo
 * tiene que poder comprar sin llenar nada. Esto es para el que no puede ir,
 * que hasta ahora se iba sin dejar rastro.
 */
export default function FormularioLista({ origen }: { origen: string }) {
  const [estado, setEstado] = useState<"pidiendo" | "enviando" | "listo">("pidiendo");
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (estado === "enviando") return;

    setEstado("enviando");
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          nombre: form.get("nombre"),
          origen,
          utm: leerUTM(),
        }),
      });

      if (!res.ok) {
        const datos = await res.json().catch(() => ({}));
        setError(datos.error ?? "No pudimos guardarlo. Intenta de nuevo.");
        setEstado("pidiendo");
        return;
      }

      window.fbq?.("track", "Lead");
      setEstado("listo");
    } catch {
      setError("No hay conexión. Revisa tu internet e intenta de nuevo.");
      setEstado("pidiendo");
    }
  }

  if (estado === "listo") {
    return (
      <p role="status" className="text-hueso">
        Listo, quedaste en la lista. Te escribimos cuando anunciemos el próximo.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="lista-nombre" className="sr-only">
          Nombre
        </label>
        <input
          id="lista-nombre"
          name="nombre"
          type="text"
          autoComplete="given-name"
          placeholder="Nombre"
          className="w-full rounded-sm border border-piedra bg-noche-suave px-4 py-3 text-hueso outline-none transition placeholder:text-hueso-tenue/50 focus:border-oro sm:w-40"
        />

        <label htmlFor="lista-email" className="sr-only">
          Correo electrónico
        </label>
        <input
          id="lista-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          className="w-full flex-1 rounded-sm border border-piedra bg-noche-suave px-4 py-3 text-hueso outline-none transition placeholder:text-hueso-tenue/50 focus:border-oro"
        />

        <button
          type="submit"
          disabled={estado === "enviando"}
          className="rounded-full border border-oro px-6 py-3 text-sm font-semibold text-oro transition hover:bg-oro hover:text-noche disabled:opacity-60"
        >
          {estado === "enviando" ? "Un momento…" : "Avísenme"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-hueso">
          {error}
        </p>
      )}

      <p className="text-xs text-hueso-tenue">
        Solo para avisar de conciertos. Te puedes dar de baja en un clic.
      </p>
    </form>
  );
}
