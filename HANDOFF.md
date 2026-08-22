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

## 3. Estado verificado al 22 de agosto de 2026 (noche)

Verificado consultando Supabase y Vercel (por HTTP/curl, sin CLI — no hay
sesión de Vercel logueada en esta máquina) y git, no de memoria.

### Funciona
- Landing (`app/page.tsx`), diseño y paleta propios, responsive.
- Base de datos en Supabase con **schema.sql y 002_ordenes.sql corridos**.
- `ticket_types` sembrado: Entrada General, $15.00, aforo 115.
- Núcleo de boletos: firma HMAC, generación de QR, códigos cortos.
- Páginas `/boletos`, `/orden/[id]`, `/admin`, `/validar`, `/terminos` y sus
  APIs, con `npx next build` pasando limpio.
- **Flujo Yappy de punta a punta**, probado el 21 de agosto (T1, cerrada).
- **PayPal de punta a punta, en sandbox Y en live:**
  - Sandbox probado el 22 de agosto con una cuenta de comprador de prueba:
    orden → botón PayPal → login → captura → webhook con firma verificada →
    orden `paid` → QR en `/orden/[id]` → **correo con los boletos recibido
    de verdad** (Resend + dominio `forasterosdeltango.com` verificado).
  - Live configurado el 22 de agosto: Nestor cargó credenciales live
    (`PAYPAL_ENV=live`, Client ID/Secret live, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
    live) y un webhook nuevo en Vercel, e hizo redeploy. Verificado desde
    aquí que el servidor puede crear órdenes reales contra el PayPal live
    (sin cobrar nada — solo se probó la creación de la orden, no una
    captura). **Falta la primera compra real de punta a punta**, que Nestor
    va a hacer el 23 de agosto con boletos de familiares.
  - Todas las órdenes de prueba (sandbox y live) se crearon y se borraron de
    Supabase el mismo día; la base queda en 0 órdenes.
- Correo (`lib/email.ts` vía Resend) funcionando de verdad: dominio
  verificado, `RESEND_API_KEY` y `EMAIL_FROM` puestos en Vercel.
- Repo con remoto en GitHub, deploy en producción funcionando en
  `https://forasteros-boleter-a.vercel.app/` y en el dominio propio
  `https://www.forasterosdeltango.com/` (el mismo deployment).

### Ojo con esto
- **`forasterosdeltango.com` (sin `www`) redirige (308) a
  `www.forasterosdeltango.com`.** PayPal no sigue redirecciones al mandar
  webhooks — la URL del webhook en PayPal *tiene* que llevar el `www.`, o
  usar `forasteros-boleter-a.vercel.app` en su lugar. Ya está así configurado
  para sandbox y para live; si alguna vez un webhook deja de llegar, revisar
  esto primero.
- El refresh automático de `/orden/[id]` tras pagar (`components/BotonPaypal.tsx`)
  reintenta cada 3s hasta 45s — el primer intento (una sola vez a los 3s) no
  alcanzaba porque el webhook a veces tarda más. Ver T5 en la sección 6:
  falta aplicar la misma idea a la etapa *anterior* (mientras carga el botón
  de PayPal).
- Nunca se ha probado una compra real pagada de principio a fin (con dinero
  de verdad). Eso pasa mañana.

### Nota sobre `.env.local`
**Nunca viaja a git** (está en `.gitignore` a propósito, nunca se commiteó
— confirmado con `git log --all -- .env.local`), así que un `git pull` en
otra máquina no trae las llaves. En esta Mac ya está presente y completo
(Supabase, PayPal live, Resend, todo). Si algún día se retoma desde una
máquina nueva y `npm run dev` o `npx next build` fallan con "Faltan
NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY", esa es la causa — hay que
copiar `.env.local` a mano desde una máquina que sí lo tenga (AirDrop entre
las propias Mac de Nestor, nunca subirlo a ningún sitio). `.env.example`
(sí está en git) trae los nombres de todas las variables sin valores.

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

### T1 — Verificar el flujo Yappy completo ✅ hecha
Probada de punta a punta el 21 de agosto (ver sección 3): orden → comprobante
→ aprobación en `/admin` → QR → escaneo en `/validar` (verde y luego rojo en
el segundo intento). Los datos de prueba se borraron de Supabase después.

### T2 — Integrar PayPal ✅ hecha en sandbox, pendiente pasar a live
Código en `lib/payments/`, las dos rutas de API y el botón en `/orden/[id]`
(`components/BotonPaypal.tsx`). **Probado de punta a punta en sandbox el 22
de agosto**: compra con tarjeta → botón de PayPal → login con cuenta de
comprador de prueba → webhook confirmado (firma verificada) → orden `paid`
→ QR visibles en `/orden/[id]` → correo con los boletos recibido de verdad.
Datos de prueba borrados de Supabase después.

Un bug se encontró y arregló en el camino: el refresh de la página tras
pagar solo se intentaba una vez a los 3 segundos; si el webhook tardaba más
(pasaba seguido en sandbox), la página se quedaba colgada diciendo que se
actualizaba sola sin hacerlo. Ahora reintenta cada 3s hasta 45s
(`components/BotonPaypal.tsx`).

**La verificación de firma no es opcional** (`verificarFirmaWebhook`,
`lib/payments/paypal.ts`). Sin ella cualquiera puede falsificar un pago con
un `curl` y sacar boletos gratis.

**Nota sobre el dominio y el webhook:** `forasterosdeltango.com` redirige
(308) a `www.forasterosdeltango.com`. PayPal no sigue redirecciones al
mandar webhooks, así que la URL del webhook en PayPal tiene que llevar el
`www.` (o usar directamente `forasteros-boleter-a.vercel.app`, que no tiene
este problema).

**Pendiente:** pasar de sandbox a live (Nestor lo pidió explícitamente el 22
de agosto, así que ya no aplica la restricción de la sección 8 de esperar
confirmación). Ver sección 3 para el detalle de qué credenciales cambian.

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

### T5 — Pendiente para el 23 de agosto (pedido por Nestor el 22 de agosto)

1. **El mismo arreglo de reintento que se hizo para la confirmación del
   pago, pero en la etapa anterior.** Cuando el comprador reserva y llega a
   `/orden/[id]` a esperar que aparezca el botón de PayPal (mientras carga
   el `<Script>` del SDK en `components/BotonPaypal.tsx`), Nestor tuvo que
   recargar la página a mano porque el botón no apareció solo. Aplicar la
   misma idea que ya existe para el estado "confirmando" (reintentar /
   mostrar algo mientras carga, no dejar la pantalla muda) a este otro
   momento — el spinner/estado antes de que `montarBotones()` termine de
   renderizar los botones de PayPal.

2. **Aclarar los textos de espera**, en las dos etapas de arriba. Nestor
   dice que "esta página se actualiza sola" no se entiende bien. Cambiar por
   algo más concreto sobre qué está pasando y qué va a recibir la persona,
   por ejemplo (ajustar tono al resto del sitio):
   - Mientras carga el botón de PayPal: algo como "En unos segundos podrás
     pagar…".
   - Mientras se confirma el pago: algo como "En unos segundos te
     entregamos tu QR…".
   La idea es que quien está esperando entienda *qué* está esperando, no
   solo que "se actualiza sola".

3. **Revisar y ajustar textos de la landing** (`app/page.tsx`), sobre todo
   la sección genérica del grupo (ya señalada en T4 arriba y en la tarea 9
   de `TUS-TAREAS.md`). Nestor va a traer cambios específicos — no inventar
   copy nuevo sin que él lo pida primero.

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
- **PayPal ya está en `live`** (Nestor lo pidió el 22 de agosto). No lo
  regreses a `sandbox` ni toques las credenciales live sin que él lo pida.
- No borres órdenes que sean compras reales (dinero de verdad) — a partir de
  mañana (23 de agosto) puede haber compras reales de familiares de Nestor
  en la base. Antes de borrar una orden con un script de limpieza, confirma
  que sea de prueba (revisa `buyer_email`, o pregúntale a Nestor).
- No agregues dependencias pesadas. Hoy son seis y con eso alcanza.
