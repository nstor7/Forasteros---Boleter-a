import { PROXIMO } from "../../lib/proximo.ts";

/**
 * Correo 1 — el anuncio, para mandar en cuanto la página esté arriba.
 *
 * Reglas de tono que salen de lo aprendido en agosto: nada de registro
 * publicitario, sin signos de exclamación, y el tango como gancho y no como
 * filtro. Es un correo de una persona a alguien que ya estuvo en la sala.
 */

export const asunto = "Volvemos a tocar este domingo";

export function cuerpo(nombre: string, enlaceCompra: string): string {
  const cuando = [PROXIMO.fechaTexto, PROXIMO.horaTexto].filter(Boolean).join(" · ");

  return `
    <p>Hola ${nombre},</p>

    <p>
      Te escribimos porque fuiste parte de la noche del 2 de septiembre en Rock
      and Folk. Se llenó, y para nosotros fue la mejor que hemos tocado juntos.
    </p>

    <p>
      Este <strong>domingo 13</strong> volvemos a tocar${PROXIMO.lugar ? `, esta vez en <strong>${PROXIMO.lugar}</strong>` : ""},
      con un programa que se llama <em>${PROXIMO.titulo}</em>. Es un salón
      chico, de los de escuchar de cerca.
    </p>

    <p><strong>${cuando}</strong>${PROXIMO.direccion ? `<br>${PROXIMO.direccion}` : ""}${PROXIMO.precioTexto ? `<br>${PROXIMO.precioTexto}` : ""}</p>

    <p style="margin:28px 0">
      <a href="${enlaceCompra}" style="display:inline-block;background:#d9a441;color:#0c0a09;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">
        Ver entradas
      </a>
    </p>

    ${PROXIMO.lugar ? `<p style="font-size:14px">La venta la maneja ${PROXIMO.lugar} en su propia página.</p>` : ""}

    <p>
      Si conoces a alguien a quien le gustaría, reenvíale este correo — es la
      forma en que de verdad se llena una sala.
    </p>

    <p>Gracias por seguirnos.</p>
  `;
}
