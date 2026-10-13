import { fechaEnFrase, PROXIMO } from "../../lib/proximo.ts";

/**
 * Correo 2 — el recordatorio, para el viernes o el sábado.
 *
 * Corto a propósito: quien no abrió el primero no va a leer uno más largo, y
 * quien sí lo abrió solo necesita que le recuerden el día. Casi la mitad de
 * las decisiones se toman en las últimas 48 horas.
 *
 * Repite las dos horas (puertas y música) porque es el dato que la gente
 * busca cuando ya decidió ir y está calculando a qué hora salir de casa.
 */

export const asunto = "Este domingo 18, tango en el Casco";

export function cuerpo(nombre: string, enlaceCompra: string): string {
  return `
    <p>Hola ${nombre},</p>

    <p>
      Un recordatorio corto: tocamos el <strong>${fechaEnFrase()}</strong>${PROXIMO.lugar ? ` en <strong>${PROXIMO.lugar}</strong>` : ""}.
    </p>

    <p>
      ${PROXIMO.horaPuertasTexto ? `Puertas ${PROXIMO.horaPuertasTexto}` : ""}${PROXIMO.horaPuertasTexto && PROXIMO.horaTexto ? ", " : ""}${PROXIMO.horaTexto ? `música desde ${PROXIMO.horaTexto}` : ""}.
    </p>

    <p style="margin:28px 0">
      <a href="${enlaceCompra}" style="display:inline-block;background:#d9a441;color:#0c0a09;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">
        Ver entradas
      </a>
    </p>

    <p>
      Si este domingo no te queda, no pasa nada — te avisamos del próximo por
      aquí mismo.
    </p>
  `;
}
