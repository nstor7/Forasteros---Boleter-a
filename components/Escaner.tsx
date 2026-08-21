"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Escáner de la puerta. Pensado para usarse de noche, de pie y con prisa:
 * el resultado ocupa toda la pantalla, en verde o rojo, con un sonido corto
 * para no tener que mirar el teléfono en cada persona.
 */

type Resultado =
  | { resultado: "valido"; nombre: string; orden: string; restantes: number }
  | { resultado: "usado"; nombre: string; orden: string; cuando: string }
  | { resultado: "invalido"; motivo: string };

const CONTENEDOR = "lector-qr";

export default function Escaner() {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [consultando, setConsultando] = useState(false);

  // Se guarda en ref y no en estado: cambiarlo no debe re-renderizar.
  const lector = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const ocupado = useRef(false);

  const consultar = useCallback(async (codigo: string) => {
    if (ocupado.current) return;
    ocupado.current = true;
    setConsultando(true);
    setError(null);

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });

      if (res.status === 401) {
        setError("La sesión venció. Recarga la página y vuelve a poner el PIN.");
        return;
      }

      const datos = await res.json();
      if (datos.error) {
        setError(datos.error);
        return;
      }

      setResultado(datos as Resultado);
      pitar(datos.resultado === "valido");
    } catch {
      setError("Sin conexión. El escáner necesita internet para verificar.");
    } finally {
      setConsultando(false);
      // Pequeña pausa antes de admitir otro escaneo, para no leer el mismo
      // QR tres veces mientras la persona guarda el teléfono.
      setTimeout(() => {
        ocupado.current = false;
      }, 1200);
    }
  }, []);

  useEffect(() => {
    let vivo = true;

    // La librería toca `window` al importarse, así que se carga en el efecto.
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (!vivo) return;

      const instancia = new Html5Qrcode(CONTENEDOR, { verbose: false });
      lector.current = instancia;

      instancia
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (texto) => consultar(texto),
          () => {}, // cada cuadro sin QR entra aquí; no es un error
        )
        .catch(() => {
          setError(
            "No pudimos abrir la cámara. Dale permiso en el navegador, o usa la búsqueda por código.",
          );
        });
    });

    return () => {
      vivo = false;
      lector.current?.stop().then(() => lector.current?.clear()).catch(() => {});
    };
  }, [consultar]);

  return (
    <div className="space-y-6">
      <div
        id={CONTENEDOR}
        className="overflow-hidden rounded-sm border border-piedra [&_video]:w-full"
      />

      {error && (
        <p role="alert" className="rounded-sm border border-acordeon/50 bg-acordeon/10 px-4 py-3 text-sm text-hueso">
          {error}
        </p>
      )}

      {/* Respaldo: el portero teclea el código corto que dicta la persona. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) consultar(manual.trim());
          setManual("");
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.toUpperCase())}
          placeholder="FOR-A7K2"
          className="min-w-0 flex-1 rounded-sm border border-piedra bg-noche-suave px-4 py-3 font-mono tracking-widest text-hueso outline-none focus:border-oro"
        />
        <button
          type="submit"
          disabled={consultando}
          className="rounded-sm border border-piedra px-5 text-sm text-hueso-tenue transition hover:border-oro hover:text-oro disabled:opacity-40"
        >
          Buscar
        </button>
      </form>

      {resultado && (
        <PantallaResultado
          resultado={resultado}
          cerrar={() => setResultado(null)}
        />
      )}
    </div>
  );
}

function PantallaResultado({
  resultado,
  cerrar,
}: {
  resultado: Resultado;
  cerrar: () => void;
}) {
  const valido = resultado.resultado === "valido";

  return (
    <div
      role="status"
      onClick={cerrar}
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center p-8 text-center ${
        valido ? "bg-[#14532d]" : "bg-[#7f1d1d]"
      }`}
    >
      <p className="font-display text-6xl text-white sm:text-8xl">
        {valido ? "ADELANTE" : resultado.resultado === "usado" ? "YA ENTRÓ" : "NO VÁLIDO"}
      </p>

      {resultado.resultado !== "invalido" && (
        <>
          <p className="mt-6 text-2xl text-white/90">{resultado.nombre}</p>
          <p className="mt-1 font-mono tracking-widest text-white/60">
            {resultado.orden}
          </p>
        </>
      )}

      {resultado.resultado === "valido" && resultado.restantes > 0 && (
        <p className="mt-4 text-lg text-white/80">
          Faltan {resultado.restantes} de su grupo
        </p>
      )}

      {resultado.resultado === "usado" && (
        <p className="mt-4 text-lg text-white/80">
          Escaneado a las{" "}
          {new Date(resultado.cuando).toLocaleTimeString("es-PA", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}

      {resultado.resultado === "invalido" && (
        <p className="mt-6 text-lg text-white/80">{resultado.motivo}</p>
      )}

      <p className="mt-12 text-sm text-white/50">Toca para seguir escaneando</p>
    </div>
  );
}

/** Dos tonos distintos para no tener que leer la pantalla en cada persona. */
function pitar(bien: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();

    osc.frequency.value = bien ? 880 : 220;
    vol.gain.value = 0.15;

    osc.connect(vol).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (bien ? 0.12 : 0.4));
  } catch {
    // Sin audio no pasa nada: el color ya dice todo.
  }
}
