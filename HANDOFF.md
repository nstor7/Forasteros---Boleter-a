# Handoff — instrucciones para el modelo que continúa

Este archivo es el punto de entrada. Si acabas de llegar a este proyecto, léelo
completo antes de tocar código. El detalle largo está en `PLAN.md`; esto es lo
operativo.

**Primer prompt sugerido para retomar:** "Lee HANDOFF.md y continúa con la
siguiente tarea pendiente."

---

## 1. Qué es este proyecto

Boletería web para un concierto único: **Los Forasteros del Tango**, el
**2 de septiembre de 2026, 7:00 PM, en Rock and Folk (Panamá)**. Vende boletos
a **$15** con aforo de **115 personas**, cobra por tarjeta y por Yappy, y
entrega a cada comprador un **QR único** que se valida en la puerta.

Es un proyecto de una sola noche, no un producto. Cuando dudes entre robusto y
simple, elige simple — pero nunca a costa de que alguien pague y no reciba su
boleto.

---

## 2. Reglas de trabajo (no negociables)

1. **Lee `node_modules/next/dist/docs/` antes de escribir código de Next.**
   Esta es una versión con cambios que rompen (Next 16.3.1). `params` y
   `searchParams` son *promesas*. Lo dice `AGENTS.md` y va en serio.
2. **Todo en español**: comentarios, nombres de funciones, textos de la
   interfaz, mensajes de error. El código existente ya está así; imítalo.
3. **Comenta el porqué, no el qué.** El estilo del repo explica decisiones
   ("el bucket es privado porque el comprobante lleva datos bancarios"), no
   describe líneas obvias.
4. **No hagas `git commit` ni `git push` sin que Nestor lo pida.**
5. **No inventes credenciales ni pasos que no puedes verificar.** Si algo está
   bloqueado por una llave que no existe, dilo y sigue con otra tarea.
6. **Verifica antes de decir que funciona**: `npx next build` tiene que pasar,
   y si es una pantalla, ábrela en el navegador y míralas.
7. **No cambies decisiones ya tomadas** (sección 4) sin plantearlo primero.

---

## 3. Estado verificado al 21 de agosto de 2026

Verificado consultando Supabase y git, no de memoria.

### Funciona
- Landing (`app/page.tsx`), diseño y paleta propios, responsive.
- Base de datos en Supabase con el esquema `supabase/schema.sql` corriendo.
- `ticket_types` sembrado: Entrada General, $15.00, aforo 115.
- Núcleo de boletos: firma HMAC, generación de QR, códigos cortos.
- Páginas `/boletos` (antes `/comprar` — se renombró porque el banner ya
  apunta ahí), `/orden/[id]`, `/admin`, `/validar` y sus APIs escritas, con
  `npx next build` pasando limpio.
- `/terminos` (T3 de la sección 6): política de reembolso, cómo se paga, qué
  pasa con tus datos y contacto. Enlazada desde el pie de compra y el footer
  de la landing.
- Repo con remoto en GitHub (`git@github.com:nstor7/Forasteros---Boleter-a.git`),
  working tree limpio al commit `b989dec`.

### No funciona todavía
- **`supabase/002_ordenes.sql` sigue SIN correr**, confirmado dos veces con un
  script de un solo uso contra Supabase (no de memoria, la última el 21 de
  agosto): `crear_orden` y `expirar_ordenes_pendientes` no existen, el bucket
  `comprobantes` tampoco. Consecuencia: `POST /api/orders` responde 500 y
  **no se puede vender nada**. Nestor reportó un intento que falló con
  `ERROR: 42601: syntax error at or near "cat"` — señal de que pegó el
  *comando* de terminal (`cat ... | pbcopy`) directo en el SQL Editor, en vez
  de copiar el contenido del archivo con ese comando y pegar el contenido. Es
  tarea de Nestor, no tuya — está en `TUS-TAREAS.md`.
- `PAYPAL_*` vacías → la opción "Tarjeta" sale deshabilitada en `/boletos`.
- `RESEND_API_KEY` vacía → los correos no se envían, solo se registran en
  consola. Los boletos igual se emiten y se ven en `/orden/[id]`.
- Hay 0 órdenes en la base de datos: nunca se ha probado una compra completa.
- **Vercel falló en el primer deploy** con `TypeError: Invalid URL` en
  `app/layout.tsx` porque `NEXT_PUBLIC_SITE_URL` llegó como cadena vacía (no
  "sin definir") y `new URL(x ?? fallback)` no cae al fallback con `""`. Ya
  está arreglado en el código (`||` en vez de `??`), verificado reproduciendo
  el build con la variable vacía. **Pero el arreglo no está commiteado ni
  pusheado** — Vercel va a seguir fallando hasta que Nestor pida commitear y
  subir este cambio (regla 2.4: no hago `git commit`/`git push` sin que lo
  pida).

---

## 4. Decisiones ya tomadas — no las re-litigues

| Decisión | Razón |
|---|---|
| **PayPal**, no Stripe | Stripe no acepta negocios domiciliados en Panamá |
| Yappy **manual** (comprobante + aprobación) | Con Yappy personal no hay API de confirmación |
| **Next.js**, no React puro | Hacen falta webhooks, firma de QR y llaves en servidor |
| Aforo validado **dentro de Postgres** | Dos compras simultáneas podrían vender el mismo boleto |
| Un solo tipo de boleto | El esquema soporta varios, pero hoy hay uno |
| Auth por contraseña y PIN en variables de entorno | Dos operadores, una noche; cuentas de verdad sería complejidad sin beneficio |

---

## 5. Mapa del código

```
lib/event.ts      Datos del evento (fecha, precio, aforo, Yappy). Cambiar aquí, no en las páginas.
lib/db.ts         Cliente Supabase con llave secreta + tipos. Solo servidor.
lib/tickets.ts    Código de boleto = "<uuid>.<hmac>". Firma, verificación, QR, código corto.
lib/orders.ts     Crear orden, emitir boletos (idempotente), confirmar pago.
lib/email.ts      Tres plantillas vía Resend. Sin llave: registra en consola y sigue.
lib/auth.ts       Sesiones firmadas con HMAC. Roles "admin" y "puerta".

app/page.tsx              Landing
app/boletos/              Formulario de compra
app/orden/[id]/           Estado de la orden: instrucciones Yappy, subida de comprobante, o los QR
app/admin/                Panel: revisar comprobantes, aprobar (emite + envía) o rechazar
app/validar/              Escáner de puerta con cámara + PIN
app/api/orders/           POST crear orden
app/api/yappy/proof/      POST subir comprobante
app/api/validate/         POST validar QR o código corto

supabase/schema.sql       Migración 001 — ya corrida
supabase/002_ordenes.sql  Migración 002 — PENDIENTE de correr
```

**Invariantes que no se pueden romper:**
- La emisión de boletos es idempotente: el webhook de PayPal puede llegar dos
  veces y el admin puede dar doble clic.
- Marcar un boleto usado va con `is("used_at", null)`, para que dos escáneres
  simultáneos no dejen entrar dos veces.
- El aforo se calcula en la función `crear_orden`, nunca en JavaScript.

---

## 6. Tareas pendientes, en orden

### T1 — Verificar el flujo Yappy completo *(bloqueada hasta que corra la migración 002)*
Crear una orden de prueba, subir un comprobante, aprobarla desde `/admin`, y
confirmar que aparecen los QR en `/orden/[id]`.
**Hecho cuando:** una orden pasa de creada a pagada con sus boletos visibles.

### T2 — Integrar PayPal *(bloqueada hasta que existan las llaves)*
Crear `lib/payments/paypal.ts` y `lib/payments/index.ts` (interfaz común, para
poder cambiar de pasarela sin tocar el checkout), más:
- `app/api/paypal/create/route.ts` — crea la orden en PayPal
- `app/api/webhooks/paypal/route.ts` — **verifica la firma del webhook** y
  llama a `confirmarPago()`
- Botones de PayPal en `/orden/[id]` cuando la orden está `pending`

**La verificación de firma no es opcional.** Sin ella cualquiera puede
falsificar un pago con un `curl` y sacar boletos gratis.
**Hecho cuando:** una compra en sandbox termina con boletos emitidos.

### T3 — Página de términos ✅ hecha
`/terminos` con política de reembolso, cómo se paga y contacto. Enlazada
desde `/boletos` y desde el footer de la landing.

### T4 — Limpieza previa al lanzamiento
- [x] Expirar órdenes `pending` viejas: antes solo se ignoraban por tiempo en
      el cálculo de disponibilidad, pero se quedaban como `pending` para
      siempre en la tabla. Ahora `expirar_ordenes_pendientes()` (agregada al
      final de `supabase/002_ordenes.sql`, que sigue sin correr) las marca
      `expired`, y `/admin` la llama de paso al cargar la lista.
- [x] Revisar textos y ortografía de toda la interfaz: se leyó cada página,
      componente y ruta de API en busca de errores — no se encontró ninguno.
      Sigue valiendo la pena que Nestor lo lea con ojos frescos antes de
      lanzar, sobre todo el texto del grupo en `app/page.tsx` (es genérico,
      ver tarea 9 de `TUS-TAREAS.md`).
- [ ] Probar en un teléfono real, sobre todo `/validar` con la cámara. Esto
      necesita un teléfono físico — no se puede verificar desde aquí.

---

## 7. Cómo verificar tu trabajo

```bash
npx next build          # tiene que pasar limpio
npx eslint app lib components
```

Para las pantallas, levanta el servidor de desarrollo (hay configuración en
`.claude/launch.json`, nombre `boleteria`) y ábrelas de verdad. No pidas que
Nestor las revise por ti.

Para saber el estado de la base de datos sin adivinar, consulta Supabase
directamente con un script de un solo uso y bórralo después.

---

## 8. Lo que NO debes hacer

- No borres ni edites `.env.local` (tiene secretos reales).
- No subas `.env.local` a git; ya está en `.gitignore`.
- No cambies `TICKET_SECRET` después de emitir boletos: invalidaría todos los
  QR ya enviados.
- No pases a PayPal `live` sin que Nestor lo pida explícitamente.
- No agregues dependencias pesadas. Hoy son seis y con eso alcanza.
