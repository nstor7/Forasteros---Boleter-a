import { NextResponse } from "next/server";

import { suscribir } from "@/lib/lista";

/**
 * POST /api/suscribir — alta en la lista de correos.
 *
 * A quien ya estaba se le contesta lo mismo que a quien se acaba de dar de
 * alta: enterarse de si un correo está o no en la lista de otra persona no
 * le sirve a nadie más que a quien esté fisgoneando.
 */
export async function POST(request: Request) {
  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición malformada." }, { status: 400 });
  }

  const datos = cuerpo as Record<string, unknown>;

  const resultado = await suscribir({
    email: String(datos.email ?? ""),
    nombre: datos.nombre ? String(datos.nombre) : undefined,
    origen: datos.origen ? String(datos.origen) : undefined,
    utm:
      datos.utm && typeof datos.utm === "object"
        ? (datos.utm as Record<string, string>)
        : undefined,
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
