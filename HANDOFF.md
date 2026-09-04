# Handoff — instrucciones para el modelo que continúa

Este archivo es el punto de entrada. Si acabas de llegar a este proyecto, léelo
completo antes de tocar código. El detalle largo está en `PLAN.md`; esto es lo
operativo.

**Primer prompt sugerido para retomar:** "Lee HANDOFF.md y continúa con la
siguiente tarea pendiente."

## ⏸️ El evento ya pasó — venta cerrada a propósito (3 de septiembre)

**Los Forasteros del Tango tocaron el 2 de septiembre. La venta de boletos
está cerrada desde el 3 de septiembre, a pedido de Nestor**, para que nadie
compre por error entrando por un enlace viejo. El sitio sigue arriba y
funcionando para todo lo demás (ver la puerta que abre y cierra en T15, más
abajo, y la guía para reabrir para un evento nuevo).

**Antes de tocar nada de código nuevo:** lee T15 completa. Ahí está el cómo y
el porqué del cierre, y los pasos exactos para reabrir cuando haya otro
concierto.

---

## 1. Qué es este proyecto

Boletería web para un concierto único: **Los Forasteros del Tango**, el
**2 de septiembre de 2026, 8:00 PM (puertas 7:00 PM), en Rock and Folk
(Panamá)**. Vende boletos a **$15** con aforo de **115 personas**, cobra por
tarjeta y por Yappy, y entrega a cada comprador un **QR único** que se valida
en la puerta.

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
  reintenta cada 3s hasta 45s. ~~El primer intento (una sola vez a los 3s) no
  alcanzaba~~ — arreglado, ver T5.1/T5.2 en la sección 6 (22 de agosto).
- Nunca se ha probado una compra real pagada de principio a fin (con dinero
  de verdad). Eso pasa mañana.

### Nota sobre `.env.local`
**Nunca viaja a git** (está en `.gitignore` a propósito, nunca se commiteó
— confirmado con `git log --all -- .env.local`), así que un `git pull` en
otra máquina no trae las llaves. `.env.example` (sí está en git) trae los
nombres de todas las variables sin valores.

**Esta Mac (la original) quedó con un `.env.local` incompleto tras el
`git pull`**, confirmado el 22 de agosto de noche: `PAYPAL_CLIENT_ID`,
`PAYPAL_CLIENT_SECRET` y `RESEND_API_KEY` sí tienen valor, pero
**`NEXT_PUBLIC_PAYPAL_CLIENT_ID` y `PAYPAL_WEBHOOK_ID` están vacíos** (se ve
al abrir `/boletos` con método tarjeta: sale "Aún no disponible" en vez del
botón). No los llené yo — regla de no editar `.env.local`. Para probar el
botón de PayPal localmente en esta Mac lo verifiqué corriendo un `next dev`
aparte en otro puerto con la variable inyectada por línea de comandos (sin
tocar el archivo), pero **Nestor debería copiar el valor de
`PAYPAL_CLIENT_ID` también a `NEXT_PUBLIC_PAYPAL_CLIENT_ID`** en
`.env.local` (son el mismo valor, ver tarea 6 de `TUS-TAREAS.md`) para que
`/boletos` con tarjeta funcione en esta Mac sin trucos. `PAYPAL_WEBHOOK_ID`
no hace falta localmente (los webhooks solo le llegan a la URL pública de
Vercel), así que ese puede quedar vacío aquí.

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

supabase/schema.sql                       Migración 001 — ya corrida
supabase/002_ordenes.sql                  Migración 002 — ya corrida
supabase/003_ordenes_manuales.sql         Migración 003 — ya corrida
supabase/004_marketing_opt_in.sql         Migración 004 — ya corrida
supabase/005_fix_crear_orden_duplicado.sql  Migración 005 — ya corrida (urgente, ver T7)
supabase/006_utm_tracking.sql             Migración 006 — ya corrida
```

**Invariantes que no se pueden romper:**
- La emisión de boletos es idempotente: el webhook de PayPal puede llegar dos
  veces y el admin puede dar doble clic.
- Marcar un boleto usado va con `is("used_at", null)`, para que dos escáneres
  simultáneos no dejen entrar dos veces.
- El aforo se calcula en la función `crear_orden`, nunca en JavaScript.
- **`create or replace function` con una firma de parámetros distinta NO
  reemplaza la función en Postgres — crea una sobrecarga nueva.** Si algún
  día hay que cambiarle los parámetros a `crear_orden` (o a cualquier otra
  función RPC), hay que `drop function` de la versión vieja con su firma
  exacta en la misma migración, o el checkout público se rompe en silencio
  (ver T7 — pasó de verdad el 22 de agosto).

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

1. ✅ **Hecho el 22 de agosto, con una segunda vuelta tras feedback de
   Nestor.** Primera versión: recuadro con texto + botón "Recargar" a los
   8s. Nestor probó y dijo que el mensaje que sugería "paga por Yappy" a
   alguien que ya había elegido tarjeta era confuso, y que en general quería
   algo **más simple: solo una señal de espera, sin botones ni texto de
   alternativas** — ni en la carga del botón ni en la confirmación del pago.
   Quedó así:
   - `"cargando"`: spinner + "Cargando la opción de pago…", sin recuadro ni
     botón (componente `Esperando` en `components/BotonPaypal.tsx`).
   - Pasados **20s** (subido de 8s — es un caso raro, no hace falta apurar
     la salida) sin cargar, aparece un enlace de texto discreto para
     recargar — la única salida que queda, para no dejar a alguien
     genuinamente atascado esperando para siempre.
   - `"confirmando"` (esperando el webhook tras pagar): mismo componente
     `Esperando`, sin recuadro.
   - El mensaje de `EsperandoTarjeta` en `app/orden/[id]/page.tsx` para
     cuando falta `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (caso raro en producción,
     pero es justo lo que Nestor vio y reportó) ya no sugiere pagar por
     Yappy — dice que hubo un problema y ofrece reintentar la compra.
   - Probado en esta Mac (caso normal y el de llave faltante), arrancando un
     `next dev` aparte con la variable inyectada por línea de comandos para
     no tocar `.env.local`. **Corrección a lo que anoté antes:** dije que
     esa prueba fue "con el SDK real en vivo, no sandbox" — es falso. Lo
     confirmé el 22 de agosto de noche: el `PAYPAL_CLIENT_ID`/`SECRET` de
     `.env.local` en esta Mac son credenciales de **sandbox** (`PAYPAL_ENV`
     también dice `sandbox` ahí), no las live que se activaron en la otra
     Mac — el `git pull` nunca las trajo. La prueba visual fue válida (el
     spinner y el botón se comportan igual en ambos modos), pero no fue
     "en vivo". La verificación real contra producción live está en T6.

2. ✅ **Hecho el 22 de agosto** (superado por el punto 1: los textos
   quedaron más cortos que la propuesta original, sin la frase "esta página
   se actualiza sola").

3. **Revisar y ajustar textos de la landing** (`app/page.tsx`), sobre todo
   la sección genérica del grupo (ya señalada en T4 arriba y en la tarea 9
   de `TUS-TAREAS.md`). Nestor va a traer cambios específicos — no inventar
   copy nuevo sin que él lo pida primero.

4. **Hacer que las respuestas a los correos lleguen a la bandeja real de
   Nestor (Gmail), no solo agregar un `Reply-To`.** Se detectó el 22 de
   agosto: los MX de `forasterosdeltango.com` apuntan a
   `inbound-smtp.us-east-1.amazonaws.com` (la recepción de Resend), que
   entrega a un webhook que no existe en este proyecto — un cliente que le
   dé "Responder" a un correo (por ejemplo el de rechazo de Yappy,
   `enviarRechazo` en `lib/email.ts`) no rebota, pero tampoco le llega a
   nadie. Nestor prefiere esto a un `Reply-To` con una dirección de Gmail
   genérica porque se ve menos profesional.

   El dominio está en **Hostinger** (registrador y DNS — nameservers
   `*.dns-parking.com`, confirmado con `whois` y `dig NS` el 22 de agosto).
   Buscar en su hPanel algo como "Emails" → "Reenvío de correo" / "Email
   Forwarding" para reenviar `boletos@forasterosdeltango.com` a la Gmail de
   Nestor. Esto normalmente cambia el registro **MX** — está bien
   reemplazar el de Resend, porque el envío (lo único que usamos) depende
   de los registros SPF/DKIM, no del MX. **No tocar ni borrar los registros
   TXT/CNAME que Resend agregó para poder enviar correo**, solo el MX. Si
   Hostinger no ofrece reenvío gratis y solo mailbox de pago (Titan Email),
   preguntarle a Nestor si vale la pena para una sola noche antes de
   sugerirlo.

   Nestor también mencionó, como posible mejora aparte y no urgente, agregar
   un contacto de WhatsApp como canal más directo — no implementar sin que
   lo pida explícitamente.

### T6 — Investigación de una orden sin pagar + boletos manuales (22 de agosto, noche)

**El caso:** Nestor vio en `/admin` una orden de "zhoe Reina", 2 boletos, $30,
método tarjeta, sin confirmar. Investigado a fondo:
- La orden nunca tuvo `paypal_order_id` (ese campo solo lo llena el
  webhook al confirmar) → nuestro sistema nunca recibió confirmación de
  pago para esa orden. Quedó `pending` los 20 minutos de rigor y después
  `expired` automáticamente.
- Confirmé que `/api/paypal/create` en producción sí crea órdenes reales
  contra PayPal **live** (se lo probé con una orden propia y comprobé que el
  id que devolvió PayPal *no* existe en el entorno sandbox — solo puede
  existir en live).
- Los logs de Vercel (`vercel logs`) solo conservan ~1 hora, así que no se
  pudo ver el rastro original de esa compra (fue ~2h antes).
- Las variables de PayPal en Vercel están marcadas **"Sensitive"** — ni con
  `vercel env pull` se puede leer su valor real. Bien por seguridad, pero
  limita lo que un modelo puede diagnosticar ahí sin ayuda de Nestor.
- **Nestor revisó PayPal directamente: no hubo ningún cargo.** La clienta es
  su amiga y le escribió para preguntarle qué pasó. Conclusión: no fue un
  bug de cobro, simplemente no completó el pago (o cambió de opinión a
  medio camino). Nada que reembolsar, nada roto en el cobro.

**Lo que salió de esto — venta manual desde `/admin`:** Nestor va a vender
boletos directo a amigos y familiares en efectivo, o por Yappy a otra
persona del grupo (no a su número). Se construyó:
- `supabase/003_ordenes_manuales.sql` — **PENDIENTE de correr** (mismo
  procedimiento de siempre: copiar el contenido, pegar en el SQL Editor,
  Run). Agrega `'manual'` como método de pago válido, y hace que
  `crear_orden` acepte un nuevo parámetro opcional `p_manual` (con default
  `false`, así que no rompe nada de lo que ya llama a esta función) que crea
  la orden directamente en `paid` en vez de `pending`/`pending_review`. El
  aforo se sigue revisando igual — un boleto vendido a mano ocupa un asiento
  igual que cualquier otro.
- `lib/orders.ts`: `crearOrdenManual()`.
- `app/admin/actions.ts`: `generarEntrada()` (revisa sesión de admin,
  valida, crea la orden ya pagada, emite boletos, manda el correo).
- `components/admin/GenerarEntrada.tsx`: formulario plegable arriba de
  "Por revisar" en `/admin` — nombre, correo, teléfono opcional, cantidad, y
  una nota opcional para que Nestor recuerde cómo se cobró (efectivo, Yappy
  a quién). Un botón: "Generar boletos".
- `app/admin/page.tsx`: las tarjetas de orden ahora distinguen "Manual" de
  "Yappy"/"Tarjeta", y muestran esa nota en tono neutro (no como advertencia
  de rechazo, que es lo que significaba `admin_note` antes de esto).
- ✅ **Migración corrida y flujo probado de punta a punta el 22 de agosto de
  noche.** Login real en `/admin`, formulario, orden creada directo en
  `paid`, aforo bajó de 115 a 114, correo enviado (confirmado por el mensaje
  de éxito del panel), QR válido en `/orden/[id]`, y la tarjeta en el panel
  mostró "Manual" con la nota en tono neutro. Orden de prueba borrada
  después — en la base solo queda la orden real de zhoe Reina (`expired`,
  sin tocar). **T6 cerrada.**

### T7 — Incidente: la migración 003 rompió el checkout público *(22 de agosto, resuelto el mismo día)*

Nestor preguntó por guardar correos/teléfonos para futuros conciertos.
Mientras se construía la casilla de opt-in, una prueba de rutina en
producción reveló algo mucho más grave: **desde que corrió la migración 003,
nadie podía comprar boletos** (ni Yappy ni Tarjeta) — `POST /api/orders`
daba 500 con `"No pudimos procesar tu compra"`.

**Causa:** la migración 003 le agregó el parámetro `p_manual` a
`crear_orden` con `create or replace function`. En Postgres eso no reemplaza
una función si la firma de parámetros cambia — crea una **sobrecarga
nueva**, así que quedaron dos versiones de `crear_orden` (7 y 8 parámetros)
conviviendo en la base. El checkout público llama con los 7 originales, sin
`p_manual`, y con las dos versiones presentes Postgres ya no podía decidir
cuál usar.

**Impacto real:** el modo de falla fue "no se puede comprar", no "se cobra
sin dar boleto" — nadie perdió dinero. No quedó ninguna orden fantasma en la
base (la función falla antes de insertar nada). No hay forma de saber cuánta
gente intentó comprar y se encontró con el error durante esa ventana, porque
un intento fallido no deja rastro en la base — solo en los logs de Vercel,
que ya habían expirado quando se investigó.

**Arreglo:** `supabase/005_fix_crear_orden_duplicado.sql` — `drop function`
de la versión vieja de 7 parámetros, dejando solo la de 8 con `p_manual
default false`. Corrida y verificada el mismo día: probé `POST
/api/orders` en producción con Yappy y con Tarjeta (ambos 201, órdenes
creadas y borradas después), y confirmé que la generación manual desde
`/admin` seguía funcionando también.

**Lección para cualquier migración futura que le cambie los parámetros a una
función RPC existente:** hay que `drop function` de la firma vieja en la
misma migración, no confiar en que `create or replace` la reemplaza. Ya
quedó anotado como invariante en la sección 5.

### T8 — Casilla de "avísenme de futuros conciertos" (22 de agosto)

Nestor quiere poder reusar correos/teléfonos después del concierto para
avisar de eventos futuros. Decidió (explícitamente, tras que le explicara el
matiz legal — Ley 81 de 2019 de Panamá considera casillas pre-marcadas un
consentimiento más débil, pero el riesgo es bajo para un evento así de
chico) que la casilla vaya **pre-marcada** en el checkout público.

- `supabase/004_marketing_opt_in.sql` — **PENDIENTE de correr.** Agrega
  `marketing_opt_in boolean not null default true` a `orders`.
- `components/FormularioCompra.tsx`: checkbox pre-marcado, "Avísenme por
  correo de futuros conciertos de {grupo}".
- `lib/orders.ts`: `crearOrden()` solo hace un `update` extra cuando la
  persona la desmarca (el default de la columna ya cubre el caso común). Si
  ese `update` falla — por ejemplo porque la migración 004 aún no corrió —
  **la compra sigue adelante igual**, con un `console.error` nada más. Nunca
  debe bloquear una venta por una preferencia de correo.
- `app/terminos/page.tsx`: sección "Tus datos" ahora explica la casilla y
  cómo pedir que se les deje de escribir.
- Solo toca el checkout público (`crearOrden`), no `crearOrdenManual` — las
  ventas manuales las hace Nestor hablando directo con la persona.
- ✅ **Migración 004 corrida y verificada el 22 de agosto de noche.** Antes
  de darla por buena, y tras el susto de T7, confirmé primero que
  `crear_orden` (el público, sin `p_manual`) seguía resolviendo sin
  ambigüedad — esta migración solo agrega una columna, no debería haber
  tocado la función, pero valía la pena confirmarlo. Después probé en
  producción real: dos órdenes por `POST /api/orders`, una con
  `aceptaNoticias: true` y otra con `false`, y consulté la base directo —
  `marketing_opt_in` quedó `true` y `false` respectivamente, como
  corresponde. Órdenes de prueba borradas después. **T8 cerrada.**

### T9 — Quitar el contador de boletos vendidos de la landing (22 de agosto) ✅ hecha

Nestor lo pidió: con pocas ventas, el contador ("Quedan X de 115") le
restaba fuerza a la oferta en la portada. Se quitó `<Disponibilidad />` de
`app/page.tsx` y se borró `components/Disponibilidad.tsx` (no se usaba en
ningún otro lado — confirmado con `grep` antes de borrar). También se quitó
`export const revalidate = 30`, que solo existía para que ese contador se
refrescara; sin él la landing es 100% estática de nuevo (`npx next build` ya
no le muestra columna de revalidación a `/`).

**Ojo:** esto es solo la landing. El contador de `/boletos`
("Quedan X boletos de 115", en `app/boletos/page.tsx`) sigue ahí — Nestor no
lo mencionó y cumple un propósito distinto (urgencia al momento de comprar,
no en la portada). No tocarlo sin que lo pida.

### T10 — El concierto empieza a las 8:00 PM, puertas 7:00 PM (22 de agosto) ✅ hecha

Nestor lo aclaró: el show es a las 8, pero las puertas abren a las 7 para
que la gente no espere afuera. Cambios:

- `lib/event.ts`: `horaTexto` pasó de "7:00 PM" a "8:00 PM"; `fecha` (el
  `Date` real, usado en metadatos) también se movió a las 20:00. Se agregó
  `horaPuertasTexto: "7:00 PM"` — nuevo campo, nunca existió antes.
- En **todos** los lugares que muestran `horaTexto` se agregó una línea en
  letra chica (`text-xs`, `text-hueso-tenue/70`) con "Puertas abren
  {horaPuertasTexto}", justo debajo: landing (dos veces — portada y sección
  "Cuándo"), `/boletos`, `/orden/[id]` (bajo cada QR), y el correo de
  boletos (`lib/email.ts`, en un tono aún más apagado dentro del pie del
  correo). También se ajustó la descripción de metadatos en `app/layout.tsx`
  (lo que se ve al compartir el link) para incluir "(puertas 7:00 PM)".
- `HANDOFF.md` sección 1 también actualizada; `PLAN.md` se dejó igual a
  propósito — es un documento histórico del diseño original, no el estado
  actual.
- **Probado el 22 de agosto:** las 4 pantallas revisadas en el navegador
  (portada, sección "Cuándo", `/boletos`, y el QR de una orden real generada
  para la prueba — que además disparó el envío del correo con la plantilla
  nueva, aceptado por Resend sin error). Orden de prueba borrada después.

### T11 — Meta Pixel (22 de agosto, cerrada el 24) ✅ hecha

Nestor pidió agregar el Pixel de Meta. Revisé sus cuentas de Meta Ads
conectadas: no había ningún Pixel para este proyecto, solo uno de otro
negocio suyo (`nestoribarravisuals.com`, inactivo desde abril 2024) — no se
reusa. Nestor va a crear uno nuevo en Meta Events Manager y pasar el ID.
Decidió explícitamente: PageView + InitiateCheckout + Purchase (no solo
PageView).

- `components/MetaPixel.tsx`: script base + noscript fallback. Solo se
  monta si existe `NEXT_PUBLIC_META_PIXEL_ID` (mismo patrón que el botón de
  PayPal sin su llave). Como esta app navega del lado del cliente (App
  Router), el PageView inicial lo manda el script base y los siguientes los
  dispara este componente al detectar cambios de ruta (`usePathname`) — el
  código base de Meta por sí solo asume recargas completas de página, y sin
  esto los PageView de navegación interna no se contarían.
- `components/FormularioCompra.tsx`: dispara `InitiateCheckout` (con
  `value`, `currency`, `num_items`) justo después de crear la orden, antes
  de redirigir a `/orden/[id]`.
- `components/MetaPixelPurchase.tsx`, montado desde `app/orden/[id]/page.tsx`
  cuando `status === "paid"`: dispara `Purchase` **una sola vez por orden**,
  usando `localStorage` como seguro. Es necesario porque el comprador puede
  volver a `/orden/[id]` cuando quiera a revisar su QR (así está pensado a
  propósito) — sin el seguro, cada visita repetida inflaría el conteo de
  compras.
- **Probado el 22 de agosto** con un ID de mentira (`0000000000000000`) en
  un `next dev` aparte, sin tocar `.env.local`: confirmé por inspección del
  DOM y espiando `window.fbq` que el script base carga e inyecta
  `fbevents.js`, que `PageView` se repite al navegar del lado del cliente
  (`/` → `/boletos`), que `InitiateCheckout` dispara con los valores
  correctos al completar el formulario, y que el seguro de `localStorage`
  para `Purchase` queda puesto en la primera visita a una orden pagada real
  (no hizo falta crear una orden de prueba: mientras probaba esto, Nestor ya
  tenía **ventas reales en curso** — ver nota abajo — así que usé una de
  esas para el chequeo, sin modificarla, solo lectura).

**Nota aparte, no planeada:** durante esta prueba encontré que **ya hay
ventas reales** en la base: `FOR-VNF7` (Electra Castillo, manual, Yappy a
Nestor) y `FOR-MGBH` (zhoe Reina, tarjeta — su segundo intento, el primero
fue el que expiró sin cobrar el mismo día). El sitio está vendiendo boletos
de verdad.

**Cerrada el 24 de agosto:** Nestor creó el Pixel en Meta Events Manager y
pasó el ID (`3038293726512844`). Con su confirmación explícita (preguntó
"tú lo pegas en Vercel o debo hacerlo yo", eligió que lo hiciera yo), lo
agregué con el CLI de Vercel ya conectado:
`vercel env add NEXT_PUBLIC_META_PIXEL_ID production --value "..." --no-sensitive`
(el flag `--no-sensitive` hizo falta: Vercel no deja marcar como "sensitive"
una variable `NEXT_PUBLIC_*`, porque de todas formas termina visible en el
bundle del navegador — tiene sentido, pero el mensaje de error no es obvio
la primera vez). Redeploy con `vercel redeploy ... --target production`
(hace falta: las `NEXT_PUBLIC_*` se hornean en el build, no se leen en
caliente). Verificado en `www.forasterosdeltango.com`: el ID aparece en el
HTML, `window.fbq` es una función, `fbevents.js` cargado, sin errores en
consola. También se completó `.env.local` de esta Mac con el ID real (no es
secreto — es el mismo valor que ya queda público en el bundle del
navegador).

**Sin verificar todavía:** que los eventos lleguen de verdad al otro lado
(Meta Events Manager → pestaña "Test events" o "Eventos de prueba"). Eso
solo lo puede confirmar Nestor desde su cuenta — pídeselo si hace falta
cerrar el loop del todo.

### T12 — Guardar de qué anuncio vino cada venta (UTMs) (23 de agosto, hecha el 24) ✅

Nestor confirmó el 24 de agosto (en otra conversación, sobre marketing) que
los cambios de código los hiciera yo aquí, para mantener todo ordenado.
Implementado siguiendo `UTM-TRACKING.md` al pie de la letra:

1. `supabase/006_utm_tracking.sql` — ya corrida. Cuatro columnas nullable en
   `orders` (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`) más
   un índice.
2. `components/CapturarUTM.tsx` — captura los parámetros de la URL y los
   guarda en `localStorage` (no `sessionStorage`, a propósito).
3. Montado en `app/layout.tsx`.
4. `components/FormularioCompra.tsx` lee lo guardado con `leerUTM()` y lo
   manda con la compra.
5. `lib/orders.ts`: el `update` posterior a `crear_orden` ahora junta
   `marketing_opt_in` y las cuatro etiquetas UTM en una sola escritura
   condicional (no dos) — **no se tocó la firma de `crear_orden`**.

**Probado el 24 de agosto**, sin la migración corrida todavía (a propósito,
para probar justo el caso sin romper nada): abrí el sitio con
`?utm_source=prueba&utm_medium=paid&utm_campaign=test&utm_content=test-manual`,
confirmé que `localStorage` guardó las cuatro etiquetas, completé una compra
de prueba real por Yappy, y confirmé que la orden se creó bien (`201`) con
solo un `console.error` avisando que faltan las columnas — exactamente el
comportamiento defensivo que pedía el documento. Orden de prueba borrada
después; las órdenes reales que había en la base (incluyendo unas nuevas de
"Carolyn McCummings" que aparecieron mientras probaba) no se tocaron.

**Migración 006 corrida y verificada el 24 de agosto.** Antes de darla por
buena confirmé, otra vez, que `crear_orden` (sin `p_manual`) sigue
resolviendo sin ambigüedad — costumbre desde T7. Después probé de punta a
punta en producción real: abrí `www.forasterosdeltango.com` con
`?utm_source=prueba&utm_medium=paid&utm_campaign=verificacion006&utm_content=test-final2`,
completé una compra real por Yappy, y consulté la orden directo en
Supabase — las cuatro etiquetas quedaron guardadas exactas. Orden de prueba
borrada después; las órdenes reales (incluyendo tres de "Carolyn
McCummings" que siguen `pending_review`, esperando que alguien les revise
el comprobante) no se tocaron. **T12 cerrada.**

**Complementa a T11 (Pixel), no lo reemplaza.** El Pixel le sirve a Meta para
optimizar; los UTMs nos sirven a nosotros para saber la verdad.

### T13 — Ajustes de texto pedidos por Nestor el 23 de agosto (hecha el 24) ✅

Estos son los cambios específicos que T5.3 estaba esperando ("Nestor va a
traer cambios específicos"). Ya llegaron. Salen de armar la campaña de Meta,
y cada uno tiene una razón concreta. Los tres se hicieron tal cual estaban
pedidos, sin agregar copy adicional.

**`app/page.tsx` — sección "El grupo":**

- **Quitar** *"Una velada íntima, para 115 personas nada más"*. Nestor aportó
  el dato de mercado: en Panamá el público de música en vivo está acostumbrado
  a salas de 300 (Teatro Amador), 800 (Nacional) y 3000 (Anayansi). Contra
  eso, "115 personas" no se lee como *íntimo* o *exclusivo* — se lee como
  *evento menor*. El aforo chico solo sirve como urgencia al final, con número
  real, y de eso ya se encarga el aviso de `/boletos`.
- **Agregar** que el show tiene **bailarines** y **un cantante invitado**
  (confirmado por Nestor; en singular, un solo cantante). Hoy la página solo
  describe cinco músicos, y los anuncios de la campaña van a prometer un show
  con baile y voces. Si la promesa del anuncio no coincide con lo que la
  persona ve al aterrizar, se rompe justo en el momento de pagar.

**`app/page.tsx` línea ~13** — el `alt` de la foto del hero dice "en el Casco
Antiguo". Cambiarlo. El venue es **Calle Uruguay**, cerca del Casco pero no
dentro, y en Panamá el Casco carga fricción real (filas para entrar, poco
estacionamiento, robos). Es texto que solo leen Google y los lectores de
pantalla, pero no cuesta nada dejarlo correcto.

**`app/boletos/page.tsx` — encabezado, antes del formulario:**

- **Agregar `EVENTO.direccion`** ("Calle Uruguay con C. 49 Este"). El dato ya
  existe en `lib/event.ts` pero no se pinta en ninguna parte de esta página.
  Para un panameño esas dos palabras desactivan la objeción del Casco antes de
  que se forme: *sé dónde queda, hay estacionamiento, no es el Casco*. Es
  información de conversión, y falta justo en la página donde se decide pagar.
- **Mostrar "Tarjeta o Yappy"** arriba, no que se descubra al llegar al paso
  del método de pago. El dominio propio es desconocido y el público de este
  grupo venía comprando por `americantradehotel.com`; ver Yappy temprano es la
  señal de que esto es local y confiable.

**No inventes copy adicional.** Estos tres archivos y nada más; el resto del
texto de la landing ya lo revisó Nestor.

**Hecho el 24 de agosto:**
- Párrafo de "115 personas nada más" quitado; reemplazado por una línea sobre
  bailarines y cantante invitado (`app/page.tsx`).
- `alt` del hero cambiado a `"{grupo}, banda de tango en vivo"` — ya no
  menciona el Casco Antiguo.
- `EVENTO.direccion` y "Tarjeta o Yappy" agregados al encabezado de
  `/boletos`, arriba del formulario.
- Verificado en el navegador (`npx next build` limpio, `eslint` limpio, las
  tres pantallas abiertas y comparado el texto contra lo pedido línea por
  línea).

### T14 — Boletos de cortesía (24 de agosto) ✅ hecha

Nestor pidió corregir dos órdenes reales donde 1 de N boletos fue cortesía
(sin cobrar), y una forma de generar cortesías hacia adelante. Le di mi
recomendación — casilla en el formulario, no pasarme la info cada vez, para
que no dependa de mí estar disponible — y la aceptó.

**Corrección de datos, hecha directo en Supabase:**
- Leopoldo Magallón (`FOR-2D28`, 2 boletos): `total_cents` de 3000 a 1500.
- Carlos Quirós (`FOR-RQ3Q`, 3 boletos): `total_cents` de 4500 a 3000.
- En ambos casos la **cantidad no cambió** — los boletos/QR ya emitidos
  siguen siendo válidos, solo se corrigió cuánto dinero entró de verdad.
  `admin_note` de cada uno explica el ajuste.

**Función nueva — casilla "Es cortesía" en "Generar boletos a mano":**
- `supabase/007_cortesias.sql` — **PENDIENTE de correr**. La tabla `orders`
  tenía `check (total_cents > 0)`; una cortesía cobra $0, así que la
  restricción pasa a `>= 0` (nunca negativo). Es un cambio de constraint, no
  de firma de función — no tiene el problema de T7.
- `lib/orders.ts`: `DatosVentaManual` ganó `cortesia?: boolean`.
  `crearOrdenManual` sigue sin tocar `crear_orden` — cuando `cortesia` es
  `true`, el mismo `update` posterior que ya pone `admin_note` también pone
  `total_cents: 0`.
- `components/admin/GenerarEntrada.tsx`: casilla nueva, sin marcar por
  defecto (la cortesía es la excepción, no la regla).
- Para varios boletos donde solo alguno es cortesía (como los casos de
  arriba), la forma de usarlo es generar **dos órdenes separadas**: una a
  precio normal y otra de $0 — más simple y más claro en los reportes que
  intentar mezclar precios dentro de una sola orden.

**Probado el 24 de agosto, antes de correr la migración 007 (a propósito):**
generación normal (sin cortesía) funcionó bien. Con la casilla marcada,
falló limpio con el error real de Postgres
(`violates check constraint "orders_total_cents_check"`) — nada de pantalla
en blanco ni comportamiento raro. Esto sí dejó una orden a medias (se creó a
precio normal antes de que fallara el segundo `update`): la encontré y
borré. Confirmado que el aforo volvió a 81 y no quedó ninguna orden de
prueba.

**Migración 007 corrida y verificada el mismo día en producción real:**
antes de darla por buena, confirmé (otra vez, costumbre desde T7) que
`crear_orden` seguía resolviendo sin ambigüedad. Después generé un boleto
real en `www.forasterosdeltango.com` con la casilla marcada — quedó con
`total_cents: 0`, `status: paid`, `admin_note: "Cortesía"`. Orden de prueba
borrada después. **T14 cerrada.**

### T15 — Cierre del evento (3 de septiembre) ✅ hecha

El concierto fue el 2 de septiembre. Nestor pidió al día siguiente cerrar la
venta ("que nadie vaya a meterse o pagar por error") pero **dejar todo listo
para reusar la plataforma en un evento futuro** — nada de borrar código ni
tirar la base de datos.

**Números finales** (consultados en Supabase el 3 de septiembre, no de
memoria): **74 boletos vendidos** en 43 órdenes pagadas, **$1,020
recaudados** (`total_cents` ya refleja los `$0` de las cortesías), **45 de
esos 74 boletos escaneados** en la puerta. 13 órdenes `expired` (18 boletos)
y 1 `rejected` — abandonos normales de checkout, no algo que arreglar.

**Cómo se cerró — dos capas, no una sola:**

1. **La real, a nivel de base de datos:** `ticket_types.active = false` en
   la fila "Entrada General". `crear_orden` en Postgres exige
   `where id = p_tipo and active` — con esto, **cualquier** intento de crear
   una orden falla con `tipo_no_encontrado`, venga de la pantalla de compra,
   de la generación manual del admin, o de un `curl` directo a
   `/api/orders` saltándose la interfaz. Probado los tres caminos el mismo
   día; ninguno pudo crear una orden.
2. **La visible, para que no se vea roto:** `app/boletos/page.tsx` ahora
   detecta cuándo no hay ningún tipo de boleto activo y muestra "Gracias por
   acompañarnos — la venta de boletos para este evento ya cerró" en vez del
   formulario. Antes de este cambio, alguien que llegara por un enlace viejo
   iba a ver un formulario que parece funcionar y falla recién al enviarlo
   — mismo resultado seguro, pero peor primera impresión.

**No se tocó:** las credenciales de PayPal (siguen en `live`, dormidas —
regla de la sección 8, Nestor no pidió cambiarlas), el Pixel de Meta, ni
ninguna orden ya existente. El sitio entero sigue arriba y navegable —
landing, `/orden/[id]` para quien quiera volver a ver su QR, `/admin`,
`/validar` — solo `/boletos` dejó de vender.

**Resuelto el 3 de septiembre:** las 3 órdenes `pending_review` sin resolver
— Edwin Jaén (`FOR-QG7T`), Rosana Amarillo (`FOR-WKLV`), John Perryman
(`FOR-MM66`) — eran intentos duplicados, confirmado por Nestor (no supieron
completar Yappy y volvieron a comprar bien, mismo patrón que Carolyn
McCummings y zhoe Reina). Se confirmó que ninguna tenía boletos ya emitidos,
y se borraron directo de la base (no por "rechazar", para no mandarles un
correo confuso meses después del concierto). **No queda ninguna orden
`pending`/`pending_review` en toda la base — la cuenta quedó cerrada del
todo.**

**Cómo reabrir para un evento futuro** — en orden:

1. **`lib/event.ts`**: actualizar `fecha`, `fechaTexto`, `horaTexto`,
   `horaPuertasTexto`, `lugar`, `direccion`, `mapaUrl`, `precioCents`,
   `aforo`, `yappyTelefono`. Es un solo archivo a propósito (ver el
   comentario ahí mismo).
2. **Supabase — nueva fila en `ticket_types`**, no reactivar la vieja: así
   el historial del evento pasado queda intacto y separado.
   ```sql
   insert into ticket_types (name, price_cents, capacity)
   values ('Entrada General', 1500, 115); -- precio y aforo del evento nuevo
   ```
   `crear_orden` ya filtra por `active = true` sin cambios — la fila nueva
   queda activa por default, la vieja se queda en `false` como archivo.
3. **`app/boletos/page.tsx` vuelve a vender solo:** en cuanto exista una fila
   `active = true` en `ticket_types`, `tipoBoletoActivo()` la encuentra y el
   formulario aparece de nuevo — no hace falta tocar ese archivo.
4. Revisar `PAYPAL_WEBHOOK_ID` y las credenciales de PayPal en Vercel: si es
   el mismo dominio y la misma cuenta de PayPal, deberían servir tal cual.
   Si cambia el dominio, hay que registrar un webhook nuevo (ver T2).
   **No cambiar `PAYPAL_ENV` a `sandbox`** solo por estar entre eventos —
   sigue siendo una decisión de Nestor, no algo que hacer por rutina.
5. `TICKET_SECRET` puede quedarse igual — los QR del evento pasado ya no
   importan, y no hay ningún problema en reusarlo para uno nuevo.
6. Revisar textos de la landing (`app/page.tsx`) y del correo
   (`lib/email.ts`) por cualquier mención específica de "Los Forasteros del
   Tango" o "2 de septiembre" que ya no aplique al evento nuevo.
7. Meta Pixel y UTMs (T11/T12) siguen funcionando tal cual — no hace falta
   tocarlos, el `utm_campaign` de la migración solo distingue qué anuncio
   vendió qué, así que un nombre de campaña nuevo ya los separa solo.

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
