# Seguimiento de UTMs — de qué anuncio vino cada venta

**Para:** quien implemente esto en el repo (este documento es autocontenido, no
hace falta contexto de otra conversación).
**Por qué:** vamos a correr una campaña en Meta con varios videos distintos.
Sin esto, al terminar la campaña sabremos cuántos boletos se vendieron, pero
**no cuál video los vendió**. Con esto, lo sabemos con certeza — leyendo
nuestra propia base de datos, sin depender de la atribución de Meta.

---

## ⚠️ Advertencia antes de empezar

**No cambies la firma de la función `crear_orden`.**

Este repo ya se cayó una vez por eso. La migración `003` le agregó un
parámetro con `create or replace`, y como Postgres no reemplaza una función
cuando cambia la lista de parámetros, quedaron **dos** versiones conviviendo.
Postgres no pudo decidir cuál usar y **nadie pudo comprar boletos** hasta que
la migración `005` borró la vieja.

La solución de este documento **no toca `crear_orden`**. Sigue el mismo patrón
que ya usa `marketing_opt_in`: crear la orden como siempre, y después hacer un
`update` sobre la fila. Es aburrido y seguro. Manténlo así.

---

## Cómo funciona, en corto

Un UTM es simplemente **una etiqueta que viaja en el enlace**. Cuando alguien
hace clic en un anuncio, llega a una dirección así:

```
https://www.forasterosdeltango.com/?utm_source=meta&utm_medium=paid&utm_campaign=concierto-sep2&utm_content=video-invitacion
```

Esa cola después del `?` no cambia nada de lo que la persona ve. Es solo
información: *"esta visita vino del anuncio del video de invitación"*.

El problema: esa etiqueta **se pierde** cuando la persona navega de la portada
a `/boletos`. Así que hay que hacer tres cosas:

1. **Capturarla** apenas la persona llega, y guardarla en el navegador.
2. **Recuperarla** en el momento de crear la orden.
3. **Guardarla** junto a la orden en la base de datos.

Después, una consulta SQL nos dice qué video vendió cuántos boletos.

---

## Paso 1 — Migración de base de datos

Crear `supabase/006_utm_tracking.sql`, siguiendo el mismo estilo idempotente
que las migraciones anteriores:

```sql
-- Migración 006 — de qué anuncio vino cada orden
-- Correr en Supabase: SQL Editor -> New query -> pegar -> Run
-- Es idempotente: se puede correr varias veces sin romper nada.

-- Guardamos las cuatro etiquetas por separado en vez de la URL completa
-- para poder agrupar en SQL sin parsear texto. Todas nullable: las ventas
-- directas (WhatsApp, boca a boca, órdenes manuales del admin) simplemente
-- no traen ninguna, y eso también es información útil.
alter table orders
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text;

-- Índice para agrupar por creatividad al analizar resultados.
create index if not exists orders_utm_content_idx
  on orders (utm_content)
  where utm_content is not null;
```

---

## Paso 2 — Capturar la etiqueta en el navegador

Crear `components/CapturarUTM.tsx`:

```tsx
"use client";

import { useEffect } from "react";

const CLAVE = "forasteros_utm";
const CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

/**
 * Guarda las etiquetas de campaña que vienen en la URL para poder adjuntarlas
 * a la orden más adelante.
 *
 * Usa `localStorage` y no `sessionStorage` a propósito: mucha gente ve el
 * anuncio, entra a mirar, y vuelve a comprar horas después. `sessionStorage`
 * se borra al cerrar la pestaña y perderíamos esa venta.
 *
 * Si llega con etiquetas nuevas, sobrescribimos: le damos el crédito al
 * último anuncio en el que hizo clic.
 */
export function CapturarUTM() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encontradas: Record<string, string> = {};

    for (const campo of CAMPOS) {
      const valor = params.get(campo);
      if (valor) encontradas[campo] = valor.slice(0, 100);
    }

    if (Object.keys(encontradas).length === 0) return;

    try {
      localStorage.setItem(CLAVE, JSON.stringify(encontradas));
    } catch {
      // Modo privado o almacenamiento lleno. No es motivo para romper nada:
      // perdemos la atribución de esta visita y ya.
    }
  }, []);

  return null;
}

/** Lee lo guardado. Devuelve `{}` si no hay nada o si el guardado se corrompió. */
export function leerUTM(): Record<string, string> {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return {};
    const datos = JSON.parse(crudo);
    return typeof datos === "object" && datos !== null ? datos : {};
  } catch {
    return {};
  }
}
```

Montarlo en `app/layout.tsx`, dentro del `<body>`, para que corra en todas las
páginas (la persona puede llegar directo a `/boletos` desde un anuncio):

```tsx
import { CapturarUTM } from "@/components/CapturarUTM";

// ...dentro del <body>, junto al resto del contenido:
<CapturarUTM />
```

---

## Paso 3 — Adjuntar la etiqueta a la orden

En el formulario de compra (`/boletos`), leer las etiquetas con `leerUTM()` y
mandarlas junto con el resto de los datos de la compra.

Después, en `lib/orders.ts`, dentro de `crearOrden()`: **no toques la llamada a
`db.rpc("crear_orden", ...)`**. Agrega las etiquetas en el `update` posterior,
igual que se hace hoy con `marketing_opt_in`.

Ahora mismo ese `update` solo corre cuando la persona **desmarcó** la casilla.
Como las UTMs sí hay que guardarlas casi siempre, conviene juntar ambas cosas
en un solo `update` condicional:

```ts
// Después de que `crear_orden` devolvió la orden con éxito:
const orden = data as Order;

// Se junta todo lo que va fuera de `crear_orden` en un solo update para no
// hacer dos escrituras. Si no hay nada que actualizar, no se escribe.
const extras: Record<string, unknown> = {};

// La columna nace en `true` (mismo default que la casilla en /boletos),
// así que solo hay que escribir cuando la persona la desmarcó.
if (!datos.aceptaNoticias) extras.marketing_opt_in = false;

if (datos.utm?.utm_source)   extras.utm_source   = datos.utm.utm_source;
if (datos.utm?.utm_medium)   extras.utm_medium   = datos.utm.utm_medium;
if (datos.utm?.utm_campaign) extras.utm_campaign = datos.utm.utm_campaign;
if (datos.utm?.utm_content)  extras.utm_content  = datos.utm.utm_content;

if (Object.keys(extras).length === 0) return orden;

const { data: actualizada, error: errorExtras } = await db
  .from("orders")
  .update(extras)
  .eq("id", orden.id)
  .select()
  .single();

// Mismo criterio que ya está documentado en este archivo para
// marketing_opt_in: si esto falla, la orden ya se creó y el boleto ya se
// reservó. No vale la pena tirar toda la compra por una etiqueta de campaña.
if (errorExtras) {
  console.error("[orders] no se pudieron guardar los extras", errorExtras.message);
  return orden;
}
return actualizada as Order;
```

También hay que agregar `utm?: Record<string, string>` al tipo `DatosCompra` y
dejarlo pasar por `validar()` sin tocarlo (no es entrada del usuario que haya
que sanear más allá del recorte de largo que ya se hace al guardarla).

**Nota sobre PayPal:** la orden se crea *antes* de mandar a la persona a
PayPal, así que la etiqueta ya quedó guardada cuando ocurre el redirect. No
hace falta hacer nada especial para ese flujo.

---

## Paso 4 — Qué poner en Meta

En el Administrador de Anuncios, cada anuncio tiene un campo
**"Parámetros de URL"** (abajo, en la sección del destino). Ahí va la cola
**sin** el `?` inicial. No hay que editar la URL de destino.

Esquema para esta campaña:

| Parámetro | Valor | Para qué |
|---|---|---|
| `utm_source` | `meta` | De dónde vino |
| `utm_medium` | `paid` | Pagado, para distinguirlo del orgánico |
| `utm_campaign` | `concierto-sep2` | Qué evento |
| `utm_content` | **cambia por anuncio** | **La clave: identifica el video** |

Valores de `utm_content` — uno distinto por creatividad:

- `video-invitacion`
- `video-comopagar`
- `video-invitados`
- `afiche`

Ejemplo de lo que va en el campo de Meta para el anuncio del video de invitación:

```
utm_source=meta&utm_medium=paid&utm_campaign=concierto-sep2&utm_content=video-invitacion
```

Si un video se publica también en orgánico y se comparte el enlace a mano,
usar `utm_medium=organic` con el mismo `utm_content` — así se separa cuánto
vendió el video gratis y cuánto vendió pagando.

---

## Paso 5 — Leer los resultados

En el SQL Editor de Supabase:

```sql
-- Qué vendió cada anuncio
select
  coalesce(utm_content, '(sin etiqueta — directo/boca a boca)') as anuncio,
  coalesce(utm_medium, '(directo)')                            as canal,
  count(*)                                                     as ordenes,
  sum(quantity)                                                as boletos,
  sum(total_cents) / 100.0                                     as dolares
from orders
where status = 'paid'
group by 1, 2
order by boletos desc;
```

La fila `(sin etiqueta)` son las ventas que **no** vinieron de un anuncio:
WhatsApp, familiares, músicos, órdenes manuales del admin. Esa fila también
importa — comparada con el resto, dice qué porcentaje del aforo lo llenó la
campaña y qué porcentaje lo llenó la red personal.

---

## Cómo verificar que quedó bien

1. Correr la migración `006` en Supabase.
2. Abrir el sitio con una etiqueta de prueba:
   `https://www.forasterosdeltango.com/?utm_source=prueba&utm_content=test-manual`
3. En la consola del navegador: `localStorage.getItem("forasteros_utm")` →
   debe mostrar el JSON con las etiquetas.
4. Navegar a `/boletos` y completar una compra de prueba.
5. En Supabase, revisar que esa fila de `orders` tenga
   `utm_content = 'test-manual'`.
6. **Confirmar que una compra normal (entrando directo, sin etiquetas en la
   URL) sigue funcionando** — las cuatro columnas quedan en `null` y la orden
   se crea igual. Este es el caso que no se puede romper.
