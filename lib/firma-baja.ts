import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma del enlace de baja de la lista de correos.
 *
 * Vive en su propio archivo, sin importar nada del proyecto, porque lo usan
 * dos mundos distintos: la app (a través de `lib/lista.ts`) y el script que
 * manda los correos (`scripts/enviar-lista.ts`, que corre en node pelado y no
 * resuelve el alias `@/` ni puede arrastrar el cliente de Supabase).
 *
 * Sin firma, cualquiera podría dar de baja el correo de otra persona
 * escribiendo su dirección en la URL.
 */

function firmar(email: string): string {
  const secreto = process.env.TICKET_SECRET;
  if (!secreto) throw new Error("Falta TICKET_SECRET.");
  return createHmac("sha256", secreto)
    .update(`baja.${email}`)
    .digest("base64url")
    .slice(0, 16);
}

export function enlaceBaja(email: string, sitio: string): string {
  const limpio = email.trim().toLowerCase();
  const params = new URLSearchParams({ e: limpio, t: firmar(limpio) });
  return `${sitio}/baja?${params}`;
}

export function firmaBajaValida(email: string, firma: string): boolean {
  const esperada = Buffer.from(firmar(email.trim().toLowerCase()));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length) return false;
  return timingSafeEqual(esperada, recibida);
}
