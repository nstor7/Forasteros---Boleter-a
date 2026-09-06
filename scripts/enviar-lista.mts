/**
 * Manda un correo a la lista — los compradores del 2 de septiembre que
 * aceptaron recibir noticias, más quien se haya suscrito desde el sitio.
 *
 * No es una "cadena de correos" automatizada a propósito: para una lista de
 * decenas de personas, montar secuencias programadas es infraestructura para
 * nadie. Son dos correos que se mandan a mano, cuando toca.
 *
 * Uso (desde la raíz del proyecto):
 *
 *   npm run lista -- anuncio                  # ensayo: no manda nada
 *   npm run lista -- anuncio --prueba TU@CORREO
 *   npm run lista -- anuncio --enviar         # de verdad
 *
 * El ensayo es el modo por defecto a propósito: un correo mandado no se puede
 * deshacer.
 */

import { enlaceBaja } from "../lib/firma-baja.ts";
import { PROXIMO, ventaAbierta } from "../lib/proximo.ts";

process.loadEnvFile(".env.local");

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const LLAVE = process.env.SUPABASE_SECRET_KEY;
const RESEND = process.env.RESEND_API_KEY;
const DESDE = process.env.EMAIL_FROM;
const SITIO = process.env.NEXT_PUBLIC_SITE_URL || "https://www.forasterosdeltango.com";

// Resend acepta 2 envíos por segundo en el plan gratis; 600 ms deja margen.
const ESPERA_MS = 600;

type Destinatario = { email: string; nombre: string };

/* ------------------------------------------------------------ argumentos */

const [, , mensaje, ...resto] = process.argv;

if (!mensaje) {
  console.error("Falta el mensaje. Ej: node scripts/enviar-lista.mts anuncio");
  process.exit(1);
}

const enviarDeVerdad = resto.includes("--enviar");
const indicePrueba = resto.indexOf("--prueba");
const correoPrueba = indicePrueba >= 0 ? resto[indicePrueba + 1] : undefined;

/* --------------------------------------------------------- destinatarios */

async function consultar(ruta: string) {
  const res = await fetch(`${SUPABASE}/rest/v1/${ruta}`, {
    headers: { apikey: LLAVE!, Authorization: `Bearer ${LLAVE}` },
  });
  if (!res.ok) {
    const detalle = await res.text();
    // El caso que de verdad va a pasar: las tablas nuevas todavía no existen.
    if (detalle.includes("suscriptores") || detalle.includes("clics_salida")) {
      throw new Error(
        "Falta correr la migración `supabase/008_lista_correos.sql` en Supabase.",
      );
    }
    throw new Error(`Supabase respondió ${res.status}: ${detalle}`);
  }
  return res.json();
}

/**
 * Junta las dos fuentes de correos y deduplica.
 *
 * Quien se dio de baja alguna vez queda fuera aunque siga con `opt_in` en una
 * orden vieja: la baja manda siempre, sin importar por dónde entró el correo.
 */
async function destinatarios(): Promise<Destinatario[]> {
  const compradores = await consultar(
    "orders?select=buyer_email,buyer_name&status=eq.paid&marketing_opt_in=is.true",
  );
  const suscritos = await consultar("suscriptores?select=email,nombre,activo");

  const dadosDeBaja = new Set<string>(
    suscritos
      .filter((s: { activo: boolean }) => !s.activo)
      .map((s: { email: string }) => s.email.toLowerCase().trim()),
  );

  const porCorreo = new Map<string, Destinatario>();

  for (const c of compradores) {
    const email = c.buyer_email.toLowerCase().trim();
    if (!porCorreo.has(email)) {
      porCorreo.set(email, { email, nombre: primerNombre(c.buyer_name) });
    }
  }

  for (const s of suscritos) {
    if (!s.activo) continue;
    const email = s.email.toLowerCase().trim();
    if (!porCorreo.has(email)) {
      porCorreo.set(email, { email, nombre: primerNombre(s.nombre ?? "") });
    }
  }

  for (const email of dadosDeBaja) porCorreo.delete(email);

  return [...porCorreo.values()];
}

/** "María del Carmen Pérez" -> "María". Vacío -> "hola" sin nombre. */
function primerNombre(completo: string): string {
  const primero = completo.trim().split(/\s+/)[0] ?? "";
  return primero.length > 1 ? primero : "";
}

/* ------------------------------------------------------------- plantilla */

/** Mismo aspecto que los correos de boletos, para que se vea de la misma casa. */
function envolver(contenido: string, baja: string): string {
  return `
<div style="background:#0c0a09;padding:32px 16px;font-family:Georgia,serif">
  <div style="max-width:520px;margin:0 auto;background:#16110f;border:1px solid #2a211d;padding:32px;color:#c9bfb2;font-size:16px;line-height:1.6">
    <p style="margin:0 0 4px;color:#d9a441;font-size:11px;letter-spacing:3px;text-transform:uppercase">
      ${PROXIMO.titulo}
    </p>
    <h1 style="margin:0 0 24px;color:#f5efe6;font-size:28px;font-weight:normal">
      ${PROXIMO.grupo}
    </h1>
    ${contenido}
    <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #2a211d;font-size:12px;color:#8a8177">
      Recibes este correo porque compraste boletos o te suscribiste en nuestro sitio.<br>
      <a href="${baja}" style="color:#8a8177">Darme de baja</a>
    </p>
  </div>
</div>`;
}

async function mandar(para: string, asunto: string, html: string, baja: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: DESDE,
      to: [para],
      subject: asunto,
      html,
      // Ayuda a que no caiga en spam cuando se manda a varias decenas de
      // direcciones el mismo día.
      headers: { "List-Unsubscribe": `<${baja}>` },
    }),
  });

  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/* ----------------------------------------------------------------- envío */

const { asunto, cuerpo } = await import(`./correos/${mensaje}.mts`);

if (!SUPABASE || !LLAVE) {
  console.error("Faltan las llaves de Supabase en .env.local.");
  process.exit(1);
}

if (!ventaAbierta()) {
  console.error(
    "lib/proximo.ts todavía no tiene la URL de cobro del hotel.\n" +
      "Sin eso el correo mandaría a la gente a una página sin botón. Llénala primero.",
  );
  process.exit(1);
}

let lista: Destinatario[];
try {
  lista = correoPrueba
    ? [{ email: correoPrueba, nombre: "Nestor" }]
    : await destinatarios();
} catch (e) {
  console.error(`\n${(e as Error).message}\n`);
  process.exit(1);
}

const enlaceCompra = `${SITIO}/ir/hotel?de=correo&utm_source=correo&utm_medium=email&utm_campaign=${mensaje}`;

console.log(`\nMensaje: ${mensaje}`);
console.log(`Asunto:  ${asunto}`);
console.log(`Destinos: ${lista.length}\n`);

if (!enviarDeVerdad && !correoPrueba) {
  for (const d of lista) console.log(`  ${d.email}${d.nombre ? ` (${d.nombre})` : ""}`);
  console.log(
    `\nEnsayo — no se mandó nada.` +
      `\nPara verlo en tu bandeja:  npm run lista -- ${mensaje} --prueba TU@CORREO` +
      `\nPara mandarlo de verdad:   npm run lista -- ${mensaje} --enviar\n`,
  );
  process.exit(0);
}

if (!RESEND || !DESDE) {
  console.error("Faltan RESEND_API_KEY o EMAIL_FROM en .env.local.");
  process.exit(1);
}

let enviados = 0;
const fallidos: string[] = [];

for (const d of lista) {
  const baja = enlaceBaja(d.email, SITIO);
  const saludo = d.nombre || "hola";
  const html = envolver(cuerpo(saludo, enlaceCompra), baja);

  try {
    await mandar(d.email, asunto, html, baja);
    enviados++;
    console.log(`  ✓ ${d.email}`);
  } catch (e) {
    fallidos.push(d.email);
    console.error(`  ✗ ${d.email} — ${(e as Error).message}`);
  }

  await new Promise((r) => setTimeout(r, ESPERA_MS));
}

console.log(`\nEnviados: ${enviados}. Fallidos: ${fallidos.length}.`);
if (fallidos.length) console.log(fallidos.join("\n"));
