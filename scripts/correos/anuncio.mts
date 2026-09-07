import { PROXIMO } from "../../lib/proximo.ts";

/**
 * Correo 1 — el anuncio, para mandar en cuanto la página esté arriba.
 *
 * Reglas de tono que salen de lo aprendido en agosto: nada de registro
 * publicitario, sin signos de exclamación, y el tango como gancho y no como
 * filtro. Es un correo de una persona, y por eso lo firma Nestor.
 *
 * **No da por hecho que la persona fue al concierto del 2.** De los 74 boletos
 * solo se escanearon 45 en la puerta, así que hay compradores que no llegaron:
 * el agradecimiento es por haber apoyado, que vale para los dos casos.
 */

// Nombra el 13 en vez de decir "este domingo": el correo puede salir un
// domingo, y ahí "este domingo" se lee como hoy.
export const asunto = "Volvemos a tocar el domingo 13";

export function cuerpo(nombre: string, enlaceCompra: string): string {
  const cuando = [PROXIMO.fechaTexto, PROXIMO.horaTexto].filter(Boolean).join(" · ");

  return `
    <p>Hola ${nombre},</p>

    <p>Gracias por habernos apoyado con el concierto del 2 de septiembre.</p>

    <p>
      El <strong>domingo 13</strong> volvemos a tocar${PROXIMO.lugar ? `, esta vez en <strong>The Club</strong>, del American Trade Hotel` : ""}.
      El programa se llama <em>${PROXIMO.titulo}</em>.
    </p>

    <p>
      <strong>${cuando}</strong>${PROXIMO.lugar ? `<br>${PROXIMO.lugar}` : ""}${PROXIMO.direccion ? `<br>${PROXIMO.direccion}` : ""}${PROXIMO.precioTexto ? `<br>${PROXIMO.precioTexto}` : ""}
    </p>

    <p style="margin:28px 0">
      <a href="${enlaceCompra}" style="display:inline-block;background:#d9a441;color:#0c0a09;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">
        Ver entradas
      </a>
    </p>

    <p style="font-size:14px">La venta la maneja el hotel en su propia página.</p>

    <p>Si conoces a alguien a quien le pueda gustar, reenvíale este correo.</p>

    <p>Gracias,<br>Nestor</p>
  `;
}
