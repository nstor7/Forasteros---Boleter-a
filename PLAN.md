# Plataforma de Boletería — Los Forasteros del Tango

**Evento:** Los Forasteros del Tango — Rock and Folk
**Fecha:** 2 de septiembre, 7:00 PM
**Lugar:** Rock and Folk — Calle Uruguay con C. 49 Este, Panamá (Plus Code `XFRW+93V`)
**Precio:** $15.00 USD · **Aforo:** 115 personas · **Recaudación máxima:** $1,725
**Yappy:** 66433692
**Hoy:** 18 de agosto → **15 días de margen**
**Objetivo:** landing page que venda boletos con tarjeta y con Yappy, y entregue un QR único por boleto.

---

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Boletos | Un solo tipo, **$15.00**, aforo **115** (la BD igual soporta varios tipos por si acaso) |
| Yappy | Cuenta **personal** → flujo manual: cliente sube comprobante, admin aprueba, sale el email con el QR |
| Tarjeta | **PayPal** como opción A, detrás de una capa `lib/payments/` para poder cambiar de pasarela sin tocar el checkout |
| Validación en puerta | Escáner con la cámara del celular, protegido con PIN |
| Hosting | Vercel |
| Control de versiones | GitHub, repo propio dentro de esta carpeta |

### Por qué PayPal y no Stripe
Stripe **no acepta negocios domiciliados en Panamá**, así que no es opción. PayPal se activa en horas, acepta tarjetas de clientes que no tienen cuenta PayPal (guest checkout), y su webhook de confirmación es confiable. Comisión aproximada 4.4% + $0.30 por transacción — más cara que una pasarela local, pero con 15 días de margen la velocidad de activación pesa más que el 1–2% de diferencia. Alternativas locales (Paguelofácil, Cuanto, Tilopay) tienen mejor comisión pero un trámite de afiliación que puede comerse una semana. Por eso el código aísla la pasarela: si Paguelofácil se aprueba antes del evento, se cambia sin reescribir el checkout.

### Por qué el flujo Yappy es manual
El Botón de Pago Yappy (confirmación automática por webhook) requiere **Yappy Comercial de Banco General**. Con Yappy personal no hay API: el pago llega a tu teléfono y no existe forma programática de saber que entró. Por eso el flujo es: el cliente paga → sube foto del comprobante → tú apruebas desde `/admin` → el sistema genera el QR y lo envía por email. Es el único camino honesto con cuenta personal.

> **Vale la pena tramitar Yappy Comercial en paralelo.** Si sale antes del 2 de septiembre, se activa el pago automático y los QR de Yappy salen al instante igual que los de tarjeta. El código va a quedar preparado para ese cambio.

---

## 2. Stack

| Capa | Herramienta | Nota |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | React, pero con backend integrado — se necesitan rutas de servidor para webhooks, generar QR y firmar tokens. Un React puro con Vite no puede hacerlo. |
| Estilos | Tailwind CSS | |
| Base de datos | **Supabase** (Postgres) | Plan gratis suficiente. Incluye Storage para las fotos de comprobantes. |
| Archivos | Supabase Storage | Bucket privado para comprobantes de Yappy |
| Pagos tarjeta | PayPal Orders v2 + webhook | |
| Email | **Resend** si tienes dominio propio; si no, **Brevo** (300 emails/día gratis, permite remitente Gmail verificado) | Resend exige dominio verificado para enviar a terceros |
| QR | `qrcode` (generación) + `html5-qrcode` (lectura en el escáner) | |
| Deploy | Vercel | conectado a GitHub, deploy automático en cada push |

---

## 3. Flujos

### 3.1 Compra con tarjeta (QR inmediato)
```
Landing → "Comprar" → formulario (nombre, email, cantidad)
   → crea Order en BD con estado 'pending'
   → PayPal Buttons renderiza el checkout
   → cliente paga
   → webhook PAYMENT.CAPTURE.COMPLETED de PayPal llega a /api/webhooks/paypal
   → verifica firma del webhook, marca Order 'paid'
   → genera N tickets con código único firmado
   → envía email con los QR adjuntos
   → el cliente además ve los QR en pantalla en /orden/[id]
```

### 3.2 Compra con Yappy (QR tras aprobación)
```
Landing → "Pagar con Yappy" → formulario (nombre, email, cantidad, teléfono)
   → crea Order 'pending_review'
   → pantalla con tu número/QR de Yappy y el monto exacto a transferir
   → cliente sube foto del comprobante → Supabase Storage
   → email automático: "Recibimos tu comprobante, te enviaremos los boletos al confirmar"
   → tú entras a /admin, ves el comprobante, verificas contra tu app de Yappy
   → botón Aprobar → genera tickets → email con los QR
   → botón Rechazar → email explicando el motivo
```

### 3.3 Validación en la puerta
```
/validar (PIN) → cámara escanea el QR
   → POST /api/validate con el código
   → verifica firma HMAC + busca en BD
   → si válido y sin usar: marca used_at, muestra ✅ VERDE con nombre del comprador
   → si ya usado: 🔴 ROJO "YA UTILIZADO — escaneado a las HH:MM"
   → si no existe o firma inválida: 🔴 ROJO "BOLETO INVÁLIDO"
```

---

## 4. Modelo de datos (Supabase / Postgres)

```sql
-- Tipos de boleto (arranca con una sola fila)
create table ticket_types (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,              -- 'Entrada General'
  price_cents  integer not null,           -- ej. 2500 = $25.00
  capacity     integer not null,           -- aforo total
  active       boolean not null default true,
  created_at   timestamptz default now()
);

-- Una orden = una compra (puede incluir varios boletos)
create table orders (
  id              uuid primary key default gen_random_uuid(),
  short_code      text unique not null,     -- 'FOR-A7K2' para referencia humana
  buyer_name      text not null,
  buyer_email     text not null,
  buyer_phone     text,
  ticket_type_id  uuid references ticket_types(id),
  quantity        integer not null check (quantity > 0),
  total_cents     integer not null,
  payment_method  text not null,            -- 'card' | 'yappy'
  status          text not null,            -- 'pending' | 'pending_review' | 'paid' | 'rejected' | 'expired'
  paypal_order_id text,
  proof_url       text,                     -- comprobante Yappy en Storage
  admin_note      text,
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);

-- Un ticket = una entrada individual con su QR
create table tickets (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  code        text unique not null,         -- payload del QR: '<uuid>.<hmac>'
  used_at     timestamptz,
  used_by     text,                         -- quién lo escaneó
  created_at  timestamptz default now()
);

create index on orders (status);
create index on tickets (code);
```

**Aforo:** `SELECT sum(quantity) FROM orders WHERE status IN ('paid','pending_review')` contra `capacity`. Las órdenes `pending` (tarjeta sin completar) expiran a los 20 minutos vía chequeo perezoso, para no bloquear inventario.

**Seguridad del QR:** el código es `uuid.hmac_sha256(uuid, TICKET_SECRET)` truncado. Así un QR falsificado se detecta sin siquiera consultar la BD, y la BD confirma que no se haya usado antes. RLS activo en Supabase; todo el acceso a datos pasa por el servidor con la `service_role` key, nunca desde el navegador.

---

## 5. Estructura de archivos

```
forasteros-boleteria/
├── app/
│   ├── page.tsx                    # Landing: hero, info del evento, precio, CTA
│   ├── comprar/page.tsx            # Formulario + elección de método de pago
│   ├── orden/[id]/page.tsx         # Estado de la orden + QR en pantalla si está pagada
│   ├── admin/
│   │   ├── page.tsx                # Login por contraseña
│   │   └── ordenes/page.tsx        # Lista, ver comprobante, aprobar/rechazar
│   ├── validar/page.tsx            # Escáner de QR con PIN
│   └── api/
│       ├── orders/route.ts             # POST crear orden
│       ├── paypal/create/route.ts      # POST crear orden de PayPal
│       ├── webhooks/paypal/route.ts    # POST webhook (verifica firma)
│       ├── yappy/proof/route.ts        # POST subir comprobante
│       ├── admin/review/route.ts       # POST aprobar/rechazar
│       └── validate/route.ts           # POST validar QR
├── lib/
│   ├── db.ts                       # cliente Supabase (server-only)
│   ├── payments/
│   │   ├── index.ts                # interfaz común de pasarela
│   │   └── paypal.ts               # implementación PayPal
│   ├── tickets.ts                  # generar código, firmar/verificar HMAC, generar QR
│   ├── email.ts                    # plantillas y envío
│   └── auth.ts                     # sesión de admin por cookie firmada
├── components/                     # UI reutilizable
├── supabase/schema.sql             # el SQL de arriba
├── .env.example
├── .env.local                      # NO se sube a git
└── README.md
```

---

## 6. Variables de entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=          # secreto, solo servidor

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_ENV=sandbox                  # → 'live' al lanzar

# Email
RESEND_API_KEY=                     # o BREVO_API_KEY
EMAIL_FROM="Los Forasteros del Tango <boletos@tudominio.com>"

# Seguridad
TICKET_SECRET=                      # cadena aleatoria larga, firma los QR
ADMIN_PASSWORD=                     # panel de admin
SCANNER_PIN=                        # escáner de puerta
SESSION_SECRET=                     # firma de cookies

# Evento
NEXT_PUBLIC_SITE_URL=https://forasteros-boleteria.vercel.app
YAPPY_PHONE=                        # tu número para recibir pagos
```

Todas se cargan también en Vercel (Settings → Environment Variables) antes del primer deploy con pagos reales.

---

## 7. Cuentas y trámites — esto lo haces tú, no yo

Estas tareas requieren tus credenciales y no las puedo hacer por ti:

- [ ] Crear cuenta **PayPal Business** y sacar Client ID / Secret (sandbox y live)
- [ ] Crear proyecto en **Supabase** y copiar URL + service role key
- [ ] Crear cuenta en **Resend** (con dominio) o **Brevo** (sin dominio) y sacar la API key
- [ ] Instalar GitHub CLI para automatizar el repo: `brew install gh && gh auth login` — o crear el repo a mano en github.com
- [ ] Conectar el repo a **Vercel** desde vercel.com/new (primera vez, manual)
- [ ] *(Opcional pero recomendado)* Iniciar el trámite de **Yappy Comercial** en Banco General
- [ ] *(Opcional)* Comprar un dominio, ej. `forasterosdeltango.com` — mejora la confianza al vender y habilita Resend

---

## 8. Datos del evento

### Confirmados

```
Grupo:      Los Forasteros del Tango
Fecha:      2 de septiembre, 7:00 PM
Lugar:      Rock and Folk
Dirección:  Calle Uruguay con C. 49 Este, Panamá
Plus Code:  XFRW+93V  →  https://plus.codes/87F2XFRW+93V
Precio:     $15.00 USD
Aforo:      115 boletos
Yappy:      66433692
```

Formación: violín, contrabajo, acordeón, guitarra y voz. Las fotos disponibles muestran al grupo en el Casco Antiguo — sirven perfecto para el hero de la landing.

### Fotos — acción tuya

No puedo escribir al disco las imágenes que compartes en el chat. **Guarda los archivos originales en `public/fotos/`** con estos nombres, para que el código los referencie sin ambigüedad:

| Archivo | Foto | Uso sugerido |
|---|---|---|
| `hero-arco.jpg` | Los 4 frente al arco, violín + contrabajo + acordeón | Hero principal — es la más vertical y con mejor luz dorada |
| `grupo-parque.jpg` | Los 5 en el parque con el árbol al atardecer | Sección "quiénes somos" — es la única con la formación completa |
| `puerta-colonial.jpg` | Los 4 frente al portón de madera | Fondo de sección o galería |

Nota: la foto del parque tiene **cinco** integrantes y las otras dos tienen cuatro. Si la formación que toca el 2 de septiembre es una específica, conviene elegir la foto que la refleje para no confundir al público.

### Pendientes menores

- Email remitente de los boletos (¿usamos `nstor777@gmail.com` o creas uno tipo `boletos@…`?)
- Texto corto de presentación del grupo (2–3 frases para la landing)
- ¿Hay preventa con precio distinto o fecha límite?
- ¿Repertorio o artistas invitados que valga la pena anunciar?

### Nota sobre comisiones

A $15 el boleto, PayPal se lleva ~$0.96 por transacción de un solo boleto (4.4% + $0.30) — un **6.4% efectivo**, porque la tarifa fija pesa mucho en montos bajos. Dos maneras de suavizarlo:

- **Empujar la compra múltiple.** Dos boletos en una sola orden pagan $1.62 en vez de $1.92, y cuatro pagan $2.94 en vez de $3.84. Un mensaje tipo "ven acompañado" en la landing ayuda.
- **Yappy no tiene comisión.** Ponerlo como primera opción visual conviene económicamente, aunque el QR tarde en llegar. Si vendieras los 115 boletos todos por tarjeta individual, las comisiones serían ~$110; todo por Yappy, $0.

Si se vende bien, la afiliación a una pasarela local (2–3%) se paga sola en el siguiente evento.

---

## 9. Fases de ejecución

Cada fase es un bloque de trabajo que se le puede entregar a un modelo más barato con el contexto de este documento. El orden importa: cada fase deja algo verificable.

### Fase 0 — Andamiaje y control de versiones *(~30 min)*
1. `npx create-next-app@latest` con TypeScript, Tailwind, App Router, dentro de esta carpeta
2. `git init` **dentro de la carpeta del proyecto** (ojo: `Documents/Github/.git` existe por error; el repo propio lo anula)
3. `.gitignore` que incluya `.env*.local`, `.DS_Store`, `.next`
4. Commit inicial, crear repo `forasteros-boleteria` en GitHub, push
5. Importar en Vercel → deploy de prueba con la landing vacía
6. **Verificable:** la URL de Vercel carga

### Fase 1 — Landing page *(~3 h)*
1. Hero con `hero-arco.jpg`, nombre del grupo, "2 de septiembre · 7:00 PM · Rock and Folk"
2. Sección de info: precio $15, dirección con enlace a Google Maps (`https://plus.codes/87F2XFRW+93V`), foto del grupo
3. Contador de boletos disponibles (lee de la BD, sobre 115)
4. CTA a `/comprar`
5. Responsive — la mayoría va a comprar desde el celular
6. **Verificable:** se ve bien en móvil y desktop

### Fase 2 — Base de datos y núcleo de boletos *(~3 h)*
1. Proyecto Supabase, correr `supabase/schema.sql`, RLS activo, y sembrar el tipo de boleto:
   ```sql
   insert into ticket_types (name, price_cents, capacity)
   values ('Entrada General', 1500, 115);
   ```
2. `lib/db.ts`, `lib/tickets.ts` (generar código, firmar HMAC, verificar, renderizar QR PNG)
3. Test manual: generar un ticket y verificar su firma
4. **Verificable:** un script genera un QR válido y detecta uno falsificado

### Fase 3 — Checkout con tarjeta *(~5 h)*
1. `/comprar` con formulario y validación
2. `POST /api/orders` crea la orden y chequea aforo
3. PayPal Buttons en el cliente + `/api/paypal/create` en servidor
4. `/api/webhooks/paypal` con **verificación de firma** (sin esto, cualquiera puede falsificar un pago)
5. Al confirmar: generar tickets + email + mostrar QR en `/orden/[id]`
6. Probar de punta a punta en **sandbox**
7. **Verificable:** compra sandbox completa que termina en email con QR

### Fase 4 — Flujo Yappy *(~4 h)*
1. Pantalla de instrucciones con monto exacto y número de Yappy
2. Subida de comprobante a Supabase Storage (validar tipo y tamaño de archivo)
3. Email de "comprobante recibido"
4. `/admin` con login por contraseña + lista de órdenes pendientes
5. Aprobar / rechazar → genera tickets y dispara email
6. **Verificable:** orden Yappy simulada, aprobada desde admin, email con QR recibido

### Fase 5 — Escáner de puerta *(~3 h)*
1. `/validar` protegido con PIN, cámara con `html5-qrcode`
2. `POST /api/validate` verifica firma, existencia y `used_at`
3. Pantallas grandes verde/rojo, con sonido — se usa de noche y con prisa
4. Modo búsqueda manual por `short_code` como respaldo si falla la cámara
5. **Verificable:** un QR real escanea verde la primera vez y rojo la segunda

### Fase 6 — Lanzamiento *(~2 h)*
1. PayPal de sandbox a **live**, webhook apuntando a la URL de producción
2. Todas las env vars cargadas en Vercel
3. Compra real de prueba con tu propia tarjeta (monto bajo) y reembolso
4. Revisar textos, ortografía, metadatos para compartir en WhatsApp/Instagram (Open Graph)
5. Página de términos: política de reembolso, qué pasa si se cancela el evento
6. **Verificable:** compra real de punta a punta

**Total estimado: 20–22 horas de desarrollo.** Con 15 días de margen hay holgura, pero las Fases 0–3 conviene tenerlas listas en los primeros 5 días para empezar a vender mientras se pulen las demás.

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Webhook de PayPal sin verificar firma | Obligatorio verificar. Es la diferencia entre cobrar y regalar boletos. |
| Sobreventa por condición de carrera | Chequeo de aforo dentro de una transacción; margen de seguridad de 2–3 boletos |
| Email cae en spam | Dominio verificado (SPF/DKIM). Además el QR siempre se muestra en pantalla y en `/orden/[id]`, así que el email no es el único canal. |
| Cliente sube comprobante falso | Verificación manual contra tu app de Yappy antes de aprobar — por eso el flujo es manual |
| Sin internet en la puerta | El escáner necesita conexión. Respaldo: exportar CSV de boletos válidos la tarde del evento |
| QR compartido / duplicado | `used_at` bloquea el segundo escaneo del mismo código |
| PayPal retiene fondos de cuenta nueva | Activar la cuenta con anticipación; no depender del dinero antes del evento |

---

## 11. Nota sobre la carpeta

El nombre actual, `Forasteros - Boletería`, tiene espacios y tilde. Funciona, pero complica comandos de terminal y URLs. **Recomiendo renombrar la carpeta local a `forasteros-boleteria`** antes de la Fase 0. El repo de GitHub y el proyecto de Vercel usarán ese nombre de todas formas.
