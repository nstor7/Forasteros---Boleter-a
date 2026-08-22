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

## 3. Estado verificado al 21 de agosto de 2026 (noche)

Verificado consultando Supabase, Vercel (CLI) y git, no de memoria.

### Funciona
- Landing (`app/page.tsx`), diseño y paleta propios, responsive.
- Base de datos en Supabase con **schema.sql y 002_ordenes.sql corridos**:
  `crear_orden`, `expirar_ordenes_pendientes` y el bucket `comprobantes` los
  tres existen y se probaron con llamadas reales (no solo lectura de
  metadatos).
- `ticket_types` sembrado: Entrada General, $15.00, aforo 115.
- Núcleo de boletos: firma HMAC, generación de QR, códigos cortos.
- Páginas `/boletos` (antes `/comprar` — se renombró porque el banner ya
  apunta ahí), `/orden/[id]`, `/admin`, `/validar` y sus APIs, con
  `npx next build` pasando limpio.
- `/terminos`: política de reembolso, cómo se paga, qué pasa con tus datos y
  contacto. Enlazada desde `/boletos` y el footer de la landing.
- **Flujo Yappy de punta a punta, probado de verdad el 21 de agosto** (orden
  de prueba `FOR-35RJ`, borrada después de confirmar): crear orden → subir
  comprobante → aprobar desde `/admin` (login real con `ADMIN_PASSWORD`) →
  boleto pagado con QR visible en `/orden/[id]` → escaneado en `/validar` con
  el código corto (login real con `SCANNER_PIN`) → **verde "ADELANTE"** la
  primera vez, **rojo "YA ENTRÓ"** la segunda. T1 de la sección 6, cerrada.
- Repo con remoto en GitHub (`git@github.com:nstor7/Forasteros---Boleter-a.git`).
- **Deploy en producción funcionando**: https://forasteros-boleter-a.vercel.app/
  responde 200 con el contenido correcto (`/`, `/boletos`, `/terminos`
  probados con curl; `/comprar` da 404 como debe). El error de
  `metadataBase`/`Invalid URL` y el de `Faltan NEXT_PUBLIC_SUPABASE_URL...`
  (variables de entorno sin cargar en Vercel) ya están resueltos.

### No funciona todavía
- `PAYPAL_*` vacías en `.env.local` local → la opción "Tarjeta" sale
  deshabilitada en `/boletos`. **No verificado si Nestor ya las cargó en
  Vercel** (el build no las necesita para pasar, así que un deploy exitoso no
  lo confirma) — pregúntale antes de asumir cualquier cosa.
- `RESEND_API_KEY` vacía (mismo caso: verificar en Vercel, no asumir) → los
  correos no se envían, solo se registran en consola. Los boletos igual se
  emiten y se ven en `/orden/[id]`.
- Hay 0 órdenes reales en la base (la de prueba se creó y se borró el mismo
  día, ver arriba): nunca se ha probado una compra real de un comprador.

### Nota sobre cambio de computadora
Nestor va a seguir trabajando desde otra Mac. **`.env.local` nunca viajó a
git** (está en `.gitignore` a propósito, nunca se commiteó — confirmado con
`git log --all -- .env.local`) — un `git pull` en la otra máquina **no trae
las llaves**. Si el modelo que retoma ahí encuentra que `npm run dev` o
`npx next build` fallan con "Faltan NEXT_PUBLIC_SUPABASE_URL o
SUPABASE_SECRET_KEY", esa es la causa: falta que Nestor copie `.env.local` a
mano (AirDrop entre sus propias Mac es lo más simple — nunca sugieras subirlo
a ningún sitio). `.env.example` (sí está en git) trae los nombres de todas las
variables sin valores, útil para saber qué copiar.

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
