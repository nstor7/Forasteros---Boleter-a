import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

/**
 * Un boleto vale por su código: "<uuid>.<firma>".
 *
 * La firma es un HMAC del uuid con TICKET_SECRET. Así un QR inventado se
 * descarta sin consultar la base de datos, y la base de datos solo decide
 * si ese boleto legítimo ya se usó. Sin la firma bastaría con adivinar un
 * uuid; sin la base de datos no habría forma de detectar el boleto repetido.
 */

const SECRET = process.env.TICKET_SECRET;

if (!SECRET) {
  throw new Error("Falta TICKET_SECRET. Genera uno con: openssl rand -base64 32");
}

const FIRMA_LARGO = 16; // caracteres base64url; suficiente contra fuerza bruta

function firmar(id: string): string {
  return createHmac("sha256", SECRET!)
    .update(id)
    .digest("base64url")
    .slice(0, FIRMA_LARGO);
}

/** Código nuevo para un boleto recién emitido. */
export function nuevoCodigoBoleto(): string {
  const id = randomUUID();
  return `${id}.${firmar(id)}`;
}

/**
 * Verifica que el código venga de nosotros. Comparación en tiempo constante
 * para no filtrar información por la duración de la respuesta.
 */
export function codigoValido(codigo: string): boolean {
  const partes = codigo.split(".");
  if (partes.length !== 2) return false;

  const [id, firma] = partes;
  if (!id || !firma) return false;

  const esperada = Buffer.from(firmar(id));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length) return false;

  return timingSafeEqual(esperada, recibida);
}

/** PNG del QR como data URL, listo para <img src> o para adjuntar a un correo. */
export async function qrDataUrl(codigo: string): Promise<string> {
  return QRCode.toDataURL(codigo, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Código corto para que un humano pueda referirse a la orden: "FOR-A7K2".
 * Sin vocales ni caracteres ambiguos (0/O, 1/I), porque alguien lo va a
 * dictar por teléfono o buscarlo en la puerta.
 */
const ALFABETO = "23456789BCDFGHJKLMNPQRSTVWXYZ";

export function nuevoCodigoCorto(): string {
  let salida = "";
  for (let i = 0; i < 4; i++) {
    salida += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return `FOR-${salida}`;
}
