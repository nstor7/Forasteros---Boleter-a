"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EVENTO, precio } from "@/lib/event";

type Metodo = "card" | "yappy";

export default function FormularioCompra({
  disponibles,
  tarjetaActiva,
}: {
  disponibles: number | null;
  tarjetaActiva: boolean;
}) {
  const router = useRouter();

  const [metodo, setMetodo] = useState<Metodo>(tarjetaActiva ? "card" : "yappy");
  const [cantidad, setCantidad] = useState(1);
  // Nace marcada a propósito (decisión de Nestor): la mayoría de compradores
  // no la va a tocar, y quien de verdad no quiere noticias sí se toma el
  // trabajo de desmarcarla.
  const [aceptaNoticias, setAceptaNoticias] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si quedan menos boletos que el máximo por orden, el tope es lo que quede.
  const tope = Math.min(EVENTO.maxPorOrden, disponibles ?? EVENTO.maxPorOrden);
  const agotado = disponibles === 0;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.get("nombre"),
          email: form.get("email"),
          telefono: form.get("telefono"),
          cantidad,
          metodo,
          aceptaNoticias,
        }),
      });

      const datos = await res.json();

      if (!res.ok) {
        setError(datos.error ?? "No pudimos procesar tu compra.");
        setEnviando(false);
        return;
      }

      window.fbq?.("track", "InitiateCheckout", {
        value: (EVENTO.precioCents * cantidad) / 100,
        currency: "USD",
        num_items: cantidad,
      });

      router.push(datos.redirigirA);
    } catch {
      setError("No hay conexión. Revisa tu internet e intenta de nuevo.");
      setEnviando(false);
    }
  }

  if (agotado) {
    return (
      <div className="rounded-sm border border-piedra bg-noche-suave p-8 text-center">
        <p className="font-display text-2xl text-oro">Entradas agotadas</p>
        <p className="mt-3 text-hueso-tenue">
          Se vendieron los {EVENTO.aforo} boletos. Escríbenos por si se libera
          alguno.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-8">
      {/* ---------- Cantidad ---------- */}
      <fieldset>
        <legend className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
          Cuántos boletos
        </legend>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCantidad((n) => Math.max(1, n - 1))}
            disabled={cantidad <= 1}
            aria-label="Quitar un boleto"
            className="h-12 w-12 rounded-full border border-piedra text-2xl text-hueso transition hover:border-oro disabled:opacity-30"
          >
            −
          </button>

          <span
            aria-live="polite"
            className="w-12 text-center font-display text-3xl text-hueso"
          >
            {cantidad}
          </span>

          <button
            type="button"
            onClick={() => setCantidad((n) => Math.min(tope, n + 1))}
            disabled={cantidad >= tope}
            aria-label="Agregar un boleto"
            className="h-12 w-12 rounded-full border border-piedra text-2xl text-hueso transition hover:border-oro disabled:opacity-30"
          >
            +
          </button>

          <span className="ml-auto text-right">
            <span className="block font-display text-3xl text-oro">
              {precio(EVENTO.precioCents * cantidad)}
            </span>
            <span className="text-sm text-hueso-tenue">
              {cantidad} × {precio(EVENTO.precioCents)}
            </span>
          </span>
        </div>
      </fieldset>

      {/* ---------- Datos ---------- */}
      <div className="space-y-4">
        <Campo
          nombre="nombre"
          etiqueta="Nombre completo"
          tipo="text"
          autoComplete="name"
          requerido
        />
        <Campo
          nombre="email"
          etiqueta="Correo electrónico"
          tipo="email"
          autoComplete="email"
          ayuda="Aquí te enviamos los boletos con el código QR."
          requerido
        />
        <Campo
          nombre="telefono"
          etiqueta={metodo === "yappy" ? "Teléfono (el de tu Yappy)" : "Teléfono (opcional)"}
          tipo="tel"
          autoComplete="tel"
          requerido={metodo === "yappy"}
        />
      </div>

      {/* ---------- Método de pago ---------- */}
      <fieldset>
        <legend className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
          Cómo pagas
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <OpcionPago
            activa={metodo === "yappy"}
            onClick={() => setMetodo("yappy")}
            titulo="Yappy"
            detalle="Envías el pago y subes el comprobante. Los boletos llegan al confirmarlo."
          />
          <OpcionPago
            activa={metodo === "card"}
            onClick={() => setMetodo("card")}
            deshabilitada={!tarjetaActiva}
            titulo="Tarjeta"
            detalle={
              tarjetaActiva
                ? "Pago inmediato. Recibes el QR al instante."
                : "Aún no disponible. Estamos activando la pasarela."
            }
          />
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-sm text-hueso-tenue">
        <input
          type="checkbox"
          checked={aceptaNoticias}
          onChange={(e) => setAceptaNoticias(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-oro"
        />
        Avísenme por correo de futuros conciertos de {EVENTO.grupo}.
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
        disabled={enviando}
        className="w-full rounded-full bg-oro px-8 py-4 text-base font-semibold text-noche transition hover:bg-oro-claro disabled:opacity-60"
      >
        {enviando
          ? "Un momento…"
          : metodo === "yappy"
            ? "Continuar con Yappy"
            : "Continuar al pago"}
      </button>

      <p className="text-center text-xs text-hueso-tenue">
        Al continuar aceptas los{" "}
        <Link href="/terminos" className="underline underline-offset-4 hover:text-oro">
          términos y la política de reembolso
        </Link>
        : los boletos no son reembolsables, salvo cancelación del evento.
      </p>
    </form>
  );
}

function Campo({
  nombre,
  etiqueta,
  tipo,
  autoComplete,
  ayuda,
  requerido,
}: {
  nombre: string;
  etiqueta: string;
  tipo: string;
  autoComplete: string;
  ayuda?: string;
  requerido?: boolean;
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
        autoComplete={autoComplete}
        required={requerido}
        aria-describedby={ayuda ? `${nombre}-ayuda` : undefined}
        className="w-full rounded-sm border border-piedra bg-noche-suave px-4 py-3 text-hueso outline-none transition placeholder:text-hueso-tenue/50 focus:border-oro"
      />
      {ayuda && (
        <p id={`${nombre}-ayuda`} className="mt-1.5 text-xs text-hueso-tenue">
          {ayuda}
        </p>
      )}
    </div>
  );
}

function OpcionPago({
  activa,
  onClick,
  titulo,
  detalle,
  deshabilitada,
}: {
  activa: boolean;
  onClick: () => void;
  titulo: string;
  detalle: string;
  deshabilitada?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      aria-pressed={activa}
      className={`rounded-sm border p-4 text-left transition ${
        activa
          ? "border-oro bg-oro/10"
          : "border-piedra bg-noche-suave hover:border-hueso-tenue/40"
      } ${deshabilitada ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span className="block font-semibold text-hueso">{titulo}</span>
      <span className="mt-1 block text-sm text-hueso-tenue">{detalle}</span>
    </button>
  );
}
