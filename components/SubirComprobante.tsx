"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SubirComprobante({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!archivo || enviando) return;

    setEnviando(true);
    setError(null);

    const cuerpo = new FormData();
    cuerpo.append("orderId", orderId);
    cuerpo.append("archivo", archivo);

    try {
      const res = await fetch("/api/yappy/proof", { method: "POST", body: cuerpo });
      const datos = await res.json();

      if (!res.ok) {
        setError(datos.error ?? "No pudimos subir el comprobante.");
        setEnviando(false);
        return;
      }

      // La página vuelve a renderizarse en el servidor y muestra el estado
      // "comprobante recibido".
      router.refresh();
    } catch {
      setError("No hay conexión. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <label
        htmlFor="archivo"
        className="flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-piedra bg-noche-suave px-6 py-10 text-center transition hover:border-oro"
      >
        <span className="text-hueso">
          {archivo ? archivo.name : "Toca para adjuntar el comprobante"}
        </span>
        <span className="mt-1 text-xs text-hueso-tenue">
          Captura de pantalla o PDF · máximo 5 MB
        </span>
        <input
          id="archivo"
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            setError(null);
          }}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-sm border border-acordeon/50 bg-acordeon/10 px-4 py-3 text-sm text-hueso"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!archivo || enviando}
        className="w-full rounded-full bg-oro px-8 py-4 font-semibold text-noche transition hover:bg-oro-claro disabled:opacity-40"
      >
        {enviando ? "Subiendo…" : "Enviar comprobante"}
      </button>
    </form>
  );
}
