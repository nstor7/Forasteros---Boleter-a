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
