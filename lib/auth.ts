import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Autenticación mínima para las dos pantallas internas: el panel de admin
 * (aprobar pagos de Yappy) y el escáner de la puerta.
 *
 * No hay usuarios ni registro: hay una contraseña y un PIN en variables de
 * entorno. Para un evento de una noche con dos personas operando, montar
 * cuentas de verdad sería complejidad sin beneficio. La cookie va firmada
 * con HMAC para que nadie se la invente desde el navegador.
 */

export type Rol = "admin" | "puerta";

const COOKIE: Record<Rol, string> = {
  admin: "sesion_admin",
  puerta: "sesion_puerta",
};

const DURACION_HORAS: Record<Rol, number> = {
  admin: 12,
  puerta: 24, // cubre toda la noche del evento sin volver a pedir el PIN
};

function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET. Genera uno: openssl rand -base64 32");
  return s;
}

function firmar(rol: Rol, expira: number): string {
  return createHmac("sha256", secreto())
    .update(`${rol}.${expira}`)
    .digest("base64url");
}

function comparar(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** La clave esperada para cada rol, desde el entorno. */
function claveEsperada(rol: Rol): string | undefined {
  return rol === "admin" ? process.env.ADMIN_PASSWORD : process.env.SCANNER_PIN;
}

/** Compara la clave recibida en tiempo constante. */
export function claveCorrecta(rol: Rol, intento: string): boolean {
  const esperada = claveEsperada(rol);
  if (!esperada) return false;
  return comparar(intento, esperada);
}

export async function iniciarSesion(rol: Rol): Promise<void> {
  const expira = Date.now() + DURACION_HORAS[rol] * 3600_000;
  const galletas = await cookies();

  galletas.set(COOKIE[rol], `${expira}.${firmar(rol, expira)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_HORAS[rol] * 3600,
  });
}

export async function cerrarSesion(rol: Rol): Promise<void> {
  const galletas = await cookies();
  galletas.delete(COOKIE[rol]);
}

export async function haySesion(rol: Rol): Promise<boolean> {
  const galletas = await cookies();
  const valor = galletas.get(COOKIE[rol])?.value;
  if (!valor) return false;

  const [expiraTexto, firma] = valor.split(".");
  const expira = Number(expiraTexto);

  if (!expiraTexto || !firma || !Number.isFinite(expira)) return false;
  if (expira < Date.now()) return false;

  return comparar(firma, firmar(rol, expira));
}
