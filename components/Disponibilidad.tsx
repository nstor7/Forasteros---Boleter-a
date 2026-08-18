import { boletosDisponibles, tipoBoletoActivo } from "@/lib/db";
import { EVENTO } from "@/lib/event";

/**
 * Contador de boletos. Si la base de datos no responde no tumbamos la
 * página: se muestra el aforo sin el conteo y el botón de compra sigue
 * ahí, porque una landing sin contador vende y una landing caída no.
 */
export default async function Disponibilidad() {
  let quedan: number | null = null;

  try {
    const tipo = await tipoBoletoActivo();
    quedan = await boletosDisponibles(tipo.id);
  } catch {
    quedan = null;
  }

  if (quedan === null) {
    return (
      <p className="text-sm text-hueso-tenue">
        Aforo limitado a {EVENTO.aforo} personas
      </p>
    );
  }

  if (quedan === 0) {
    return (
      <p className="text-sm font-semibold tracking-wide text-acordeon uppercase">
        Entradas agotadas
      </p>
    );
  }

  const pocos = quedan <= 20;

  return (
    <p className={`text-sm ${pocos ? "text-oro-claro" : "text-hueso-tenue"}`}>
      {pocos && <span className="font-semibold">¡Últimos boletos! </span>}
      Quedan <span className="font-semibold text-oro">{quedan}</span> de{" "}
      {EVENTO.aforo}
    </p>
  );
}
