import { NextResponse } from "next/server";

import { registrarClicSalida } from "@/lib/lista";
import { PROXIMO, ventaAbierta } from "@/lib/proximo";

/**
 * GET /ir/hotel — salida hacia la página de cobro del hotel.
 *
 * El cobro del concierto del 13 lo hace el hotel en su propio sistema, así
 * que la compra ocurre donde no la vemos. Pasar por esta redirección es lo
 * único que nos deja contar cuánta gente llegó hasta el botón — y es también
 * el número que podemos enseñarle al hotel después ("les mandamos tantas
 * personas").
 *
 * `?de=` dice desde dónde se hizo clic: 'pagina', 'historia', 'correo'.
 */

// Cada visita se registra; nada de servir esto desde caché.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const utm: Record<string, string> = {};
  for (const [clave, valor] of url.searchParams) {
    if (clave.startsWith("utm_")) utm[clave] = valor;
  }

  // Registrar no puede costarle la compra a nadie: si la base falla, se
  // pierde la medición de ese clic y la persona sigue su camino igual.
  await registrarClicSalida({
    destino: "hotel",
    origen: url.searchParams.get("de"),
    utm,
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  });

  // Sin enlace del hotel todavía, devolver a la página del evento es mejor
  // que mandar a la persona a un error.
  if (!ventaAbierta()) {
    return NextResponse.redirect(new URL("/13-septiembre", request.url), 302);
  }

  return NextResponse.redirect(PROXIMO.urlCobro, 302);
}
