import "server-only";

import { db } from "@/lib/db";

/**
 * Lista de correos y medición de clics hacia afuera.
 *
 * La lista es el único activo que no vive dentro de Meta ni de la boletería
 * de un tercero, así que se guarda en nuestra base y se puede exportar
 * cuando haga falta.
 */

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type UTM = Record<string, string | undefined>;

/** Deja solo las cuatro etiquetas conocidas, recortadas. */
function soloUTM(utm: UTM | undefined) {
  const campos = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
  const salida: Record<string, string> = {};
  for (const campo of campos) {
    const valor = utm?.[campo];
    if (valor) salida[campo] = String(valor).slice(0, 100);
  }
  return salida;
}

/* --------------------------------------------------------------- suscribir */

export type ResultadoAlta =
  | { ok: true; yaEstaba: boolean }
  | { ok: false; error: string };

export async function suscribir(datos: {
  email: string;
  nombre?: string;
  origen?: string;
  utm?: UTM;
}): Promise<ResultadoAlta> {
  const email = datos.email?.trim().toLowerCase() ?? "";

  if (!EMAIL_VALIDO.test(email) || email.length > 200) {
    return { ok: false, error: "Revisa el correo, parece incompleto." };
  }

  const { data: existente, error: errorLectura } = await db
    .from("suscriptores")
    .select("id, activo")
    .eq("email", email)
    .maybeSingle();

  if (errorLectura) {
    console.error("[lista] no se pudo leer suscriptores", errorLectura.message);
    return { ok: false, error: "No pudimos guardarlo. Intenta de nuevo." };
  }

  // Quien ya se dio de baja alguna vez y vuelve a llenar el formulario está
  // pidiendo entrar otra vez: se reactiva, pero no se le pisan los datos de
  // origen originales, que son los que dicen de dónde vino la primera vez.
  if (existente) {
    if (!existente.activo) {
      await db.from("suscriptores").update({ activo: true }).eq("id", existente.id);
    }
    return { ok: true, yaEstaba: true };
  }

  const { error } = await db.from("suscriptores").insert({
    email,
    nombre: datos.nombre?.trim().slice(0, 120) || null,
    origen: datos.origen?.slice(0, 60) || null,
    ...soloUTM(datos.utm),
  });

  if (error) {
    console.error("[lista] no se pudo guardar el suscriptor", error.message);
    return { ok: false, error: "No pudimos guardarlo. Intenta de nuevo." };
  }

  return { ok: true, yaEstaba: false };
}

/* -------------------------------------------------------------------- baja */

// El enlace firmado vive en `lib/firma-baja.ts` para que el script de envío
// también pueda generarlo sin arrastrar el cliente de Supabase.
export { enlaceBaja, firmaBajaValida } from "@/lib/firma-baja";

/**
 * Da de baja en los dos lados: la lista nueva y el opt-in de quien compró un
 * boleto alguna vez. Si alguien pide no recibir más correos, no puede seguir
 * recibiéndolos por estar en la otra tabla.
 */
export async function darDeBaja(email: string): Promise<void> {
  const limpio = email.trim().toLowerCase();

  await db.from("suscriptores").update({ activo: false }).eq("email", limpio);
  await db.from("orders").update({ marketing_opt_in: false }).eq("buyer_email", limpio);
}

/* ------------------------------------------------------------ clics afuera */

/**
 * Registra un clic que se va hacia el cobro de un tercero. Nunca debe impedir
 * que la persona llegue a comprar: quien llama esto ignora el error y
 * redirige igual.
 */
export async function registrarClicSalida(datos: {
  destino: string;
  origen?: string | null;
  utm?: UTM;
  referer?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const { error } = await db.from("clics_salida").insert({
    destino: datos.destino.slice(0, 40),
    origen: datos.origen?.slice(0, 60) || null,
    ...soloUTM(datos.utm),
    referer: datos.referer?.slice(0, 300) || null,
    user_agent: datos.userAgent?.slice(0, 300) || null,
  });

  if (error) console.error("[lista] no se pudo registrar el clic", error.message);
}
