import { fechaEnFrase, PROXIMO } from "../../lib/proximo.ts";

/**
 * Correo 1 — el anuncio, para mandar en cuanto la página esté arriba.
 *
 * Reglas de tono que salen de lo aprendido en agosto: nada de registro
 * publicitario, sin signos de exclamación, y el tango como gancho y no como
 * filtro. Es un correo de una persona, y por eso lo firma Nestor.
 *
 * **No da por hecho a cuál concierto fue la persona, ni que fue a alguno.**
 * En esta lista hay compradores del 2 de septiembre que no llegaron a entrar
 * (de 74 boletos se escanearon 45), gente que vio el del 13 en el hotel, y
 * suscriptores que todavía no nos han visto tocar. Un agradecimiento genérico
 * es el único que no le queda falso a nadie.
 *
 * Volvemos al mismo salón que en septiembre, así que el texto dice "volvemos
 * a The Club" y no "esta vez en The Club" — esa frase era para cuando el
 * lugar era la novedad.
 */

// Nombra la fecha con mes. El correo sale en octubre y puede caer un domingo:
// ahí "este domingo" se lee como hoy.
export const asunto = "Volvemos a tocar el domingo 18 de octubre";

export function cuerpo(nombre: string, enlaceCompra: string): string {
  return `
    <p>Hola ${nombre},</p>

    <p>Gracias por seguirle la pista a lo que hacemos.</p>

    <p>
      El <strong>${fechaEnFrase()}</strong> volvemos a ${PROXIMO.lugar ? "<strong>The Club</strong>, del American Trade Hotel" : "tocar"}.
      El programa se llama <em>${PROXIMO.titulo}</em>${PROXIMO.subtitulo ? `, <em>${PROXIMO.subtitulo}</em>` : ""}:
      de los tangos que Gardel hizo famosos a lo que Piazzolla hizo con el
      género después.
    </p>

    <p>
      <strong>${PROXIMO.fechaTexto}</strong>${PROXIMO.horaPuertasTexto ? `<br>Puertas ${PROXIMO.horaPuertasTexto}` : ""}${PROXIMO.horaTexto ? ` · música ${PROXIMO.horaTexto}` : ""}${PROXIMO.lugar ? `<br>${PROXIMO.lugar}` : ""}${PROXIMO.direccion ? `<br>${PROXIMO.direccion}` : ""}${PROXIMO.precioTexto ? `<br>${PROXIMO.precioTexto}` : ""}
    </p>

    <p>
      Entre que abren las puertas y el primer tango hay una hora, así que da
      tiempo de llegar con calma y tomar algo.
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
