# Tus tareas, Nestor

Lo que solo puedes hacer tú, porque requiere tus credenciales o tu decisión.
Ordenadas por urgencia. **Quedan 12 días** (hoy 21 de agosto, concierto el 2 de
septiembre).

Marca con `[x]` lo que vayas terminando: el modelo que trabaje después lee este
archivo para saber qué ya está listo.

**Si sigues esto desde otra computadora:** `.env.local` no viaja con
`git pull` (está en `.gitignore` a propósito). Cópialo a mano desde tu otra
Mac (AirDrop es lo más simple) antes de correr `npm install` / `npm run dev`,
o `next build` va a fallar con "Faltan NEXT_PUBLIC_SUPABASE_URL...".

---

## 🔴 Hoy mismo

### [ ] -2. Correr la migración 007 en Supabase *(5 minutos)*

Habilita la casilla "Es cortesía" en "Generar boletos a mano" — hasta que
corras esto, si la marcas va a fallar (limpio, sin romper el resto del
panel, pero falla).

1. Copia el archivo al portapapeles (esto va en la Terminal, no en Supabase):
   ```bash
   cat "supabase/007_cortesias.sql" | pbcopy
   ```
2. Entra a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
   → **New query**
3. Pega (ahí sí, en el SQL Editor) y dale **Run**
4. Deberías ver "Success".

**Cómo sabes que funcionó:** en `/admin`, abre "Generar boletos a mano",
marca "Es cortesía", llena un boleto de prueba y dale enviar — debe
generarse con `$0.00` en vez de dar un error.

---

### [x] -1. Correr la migración 006 en Supabase *(5 minutos)* — hecho, verificado el 24 de agosto

Guarda de qué video/anuncio de la campaña de Meta vino cada venta (UTMs).
Sin esto la campaña sigue funcionando y se sigue vendiendo con normalidad —
solo no sabremos qué video vendió qué hasta que corras esto.

1. Copia el archivo al portapapeles (esto va en la Terminal, no en Supabase):
   ```bash
   cat "supabase/006_utm_tracking.sql" | pbcopy
   ```
2. Entra a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
   → **New query**
3. Pega (ahí sí, en el SQL Editor) y dale **Run**
4. Deberías ver "Success".

**Cómo sabes que funcionó:** abre
`https://www.forasterosdeltango.com/?utm_source=prueba&utm_content=test-manual`,
completa una compra de prueba, y en el SQL Editor corre
`select buyer_name, utm_source, utm_content from orders order by created_at desc limit 1;`
— debe traer los valores de prueba en vez de `null`.

---

### [x] 0. Correr la migración 005 en Supabase *(2 minutos, URGENTE — ya la corriste)*

Esta arregló un incidente real: desde la migración 003, **nadie podía
comprar boletos** (Yappy ni Tarjeta daban error). Ya está corrida y
verificada en producción — la dejo aquí solo para que quede en el registro.
Detalle completo en `HANDOFF.md`, sección T7.

---

### [x] 0.5 Correr la migración 004 en Supabase *(5 minutos)* — hecho, verificado el 22 de agosto

Guarda si cada comprador quiere que le avises de futuros conciertos. Probado
en producción real: una orden con la casilla marcada y otra desmarcada,
ambas quedaron guardadas correctamente (`true`/`false`) y se borraron
después de confirmar.

---

### [x] 1. Correr la migración 003 en Supabase *(5 minutos)* — hecho, verificado el 22 de agosto

Habilita el nuevo botón "Generar boletos a mano" en `/admin` — para venderle
a amigos/familiares en efectivo o por Yappy a otra persona del grupo, sin
pasar por PayPal. Sin esto el botón da error.

1. Copia el archivo al portapapeles (esto va en la Terminal, no en Supabase):
   ```bash
   cat "supabase/003_ordenes_manuales.sql" | pbcopy
   ```
2. Entra a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
   → **New query**
3. Pega (ahí sí, en el SQL Editor) y dale **Run**
4. Deberías ver "Success".

**Cómo sabes que funcionó:** en `/admin`, abre "Generar boletos a mano",
llena un boleto de prueba y dale enviar — debe crear la orden y mandarte el
correo, en vez de dar un error de "no se encontró la función".

---

## 🟠 Ya hecho, para referencia

### [x] 1. Correr la migración 002 en Supabase *(5 minutos)* — hecho, verificado el 21 de agosto

Es el tapón de todo. Sin esto, cualquier persona que intente comprar recibe un
error.

1. Copia el archivo al portapapeles:
   ```bash
   cat "supabase/002_ordenes.sql" | pbcopy
   ```
2. Entra a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
   → **New query**
3. Pega y dale **Run**
4. Deberías ver "Success". Si sale error, cópialo y pásaselo al modelo.

**Cómo sabes que funcionó:** en el SQL Editor corre
`select * from storage.buckets;` y debe aparecer una fila `comprobantes`.

*(El archivo creció un poco desde la última vez: ahora también agrega una
función para marcar como "expiradas" las órdenes de tarjeta abandonadas. Sigue
siendo un solo paso — copiar, pegar, Run.)*

---

### [x] 2. Guardar el trabajo en git *(2 minutos)* — hecho

Hay 16 archivos sin guardar. Si algo se borra, se pierde una sesión entera de
trabajo. Pídeselo al modelo ("commitea lo que hay") o hazlo tú:

```bash
git add -A && git commit -m "Checkout, flujo Yappy, panel de admin y escáner"
```

---

## 🟠 Esta semana — para poder lanzar

### [x] 3. Crear el repositorio en GitHub *(10 minutos)* — hecho (`nstor7/Forasteros---Boleter-a`)

Hoy el proyecto solo existe en tu Mac y no tiene copia remota.

1. Instala la herramienta de GitHub:
   ```bash
   brew install gh
   ```
2. Conecta tu cuenta:
   ```bash
   gh auth login
   ```
3. Crea el repo y súbelo:
   ```bash
   gh repo create forasteros-boleteria --private --source=. --push
   ```

Déjalo **privado**: el repo no tiene secretos, pero tampoco hace falta que sea
público.

---

### [x] 4. Conectar Vercel *(10 minutos)* — hecho y verificado

Deploy en producción funcionando: https://forasteros-boleter-a.vercel.app/
(`/`, `/boletos` y `/terminos` responden 200). Dos errores de build en el
camino, ambos resueltos: `metadataBase`/`Invalid URL` (código arreglado) y
variables de entorno de Supabase sin cargar en Vercel (Nestor las agregó).

**Pendiente de confirmar:** si además cargaste `PAYPAL_*` y `RESEND_API_KEY`
en Vercel (el build no los necesita para pasar, así que un deploy exitoso no
lo prueba). Si no los pusiste, sigue el paso 3 original de esta tarea con
esos dos grupos de variables cuando tengas las llaves.

---

### [ ] 5. Activar el envío de correos *(15 minutos)*

Sin esto los boletos se emiten pero no llegan por email. Dos caminos:

**Si vas a comprar dominio** (recomendado, ver tarea 8):
[resend.com](https://resend.com) → crear cuenta → verificar el dominio →
copiar la API key en `RESEND_API_KEY`.

**Si no quieres dominio ahora:**
[brevo.com](https://brevo.com) → 300 correos gratis al día → permite remitente
Gmail verificado. Avísale al modelo para que ajuste `lib/email.ts`, que hoy
está escrito para Resend.

En cualquiera de los dos casos, ajusta también `EMAIL_FROM`.

---

### [ ] 6. Cuenta de PayPal Business *(1 hora + espera de aprobación)*

Es lo que más puede demorar, así que empiézalo pronto aunque lo demás no esté.

1. [paypal.com/business](https://www.paypal.com/business) → crear cuenta
   Business
2. [developer.paypal.com](https://developer.paypal.com) → **Apps &
   Credentials** → **Create App**
3. Empieza en **Sandbox** y copia a `.env.local`:
   - `PAYPAL_CLIENT_ID` y `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (el mismo valor)
   - `PAYPAL_CLIENT_SECRET`
4. El `PAYPAL_WEBHOOK_ID` sale después, cuando el modelo cree el webhook.

**Ojo:** PayPal a veces retiene los fondos de cuentas nuevas. No cuentes con
ese dinero antes del concierto.

---

## 🟡 Cuando puedas — mejora las cosas pero no bloquea

### [ ] 7. Yappy Comercial en Banco General

Si te lo aprueban antes del 2 de septiembre, los boletos pagados por Yappy
salen **al instante** en vez de esperar tu aprobación manual. El código ya está
preparado para ese cambio. Vale la pena solo por dejar de revisar comprobantes
a mano la semana del concierto.

### [ ] 8. Comprar un dominio

Algo como `forasterosdeltango.com`. Dos beneficios: la gente confía más al
poner su tarjeta en un dominio propio que en un `.vercel.app`, y habilita
Resend para los correos.

### [ ] 9. Datos que faltan para terminar la página

- **Texto de presentación del grupo** (2–3 frases). Hoy hay un texto genérico
  que escribí yo; el tuyo va a ser mejor.
- **Correo remitente** de los boletos: ¿`nstor777@gmail.com` o uno nuevo?
- **¿Hay preventa** con precio distinto o fecha límite?
- **¿Invitados o repertorio** que quieras anunciar?
- **¿Política de reembolso?** Ahora mismo la página dice "no reembolsable salvo
  cancelación del evento". Si no estás de acuerdo, dilo.

---

## 🟢 Los últimos días — antes de abrir la venta

### [ ] 10. Prueba real de punta a punta

Compra un boleto con tu propia tarjeta, confirma que te llega el correo,
escanea el QR en `/validar`, y reembólsate desde PayPal.

### [ ] 11. Pasar PayPal a `live`

Cambiar `PAYPAL_ENV` a `live`, poner las llaves de producción, y apuntar el
webhook a la URL de Vercel. **Solo cuando la prueba de arriba haya pasado.**

### [ ] 12. Guardar el respaldo de la puerta

La tarde del evento, exporta la lista de boletos válidos a CSV. Si el internet
falla en Rock and Folk, esa lista es tu plan B.

---

## Referencia rápida

| Cosa | Dónde |
|---|---|
| Plan completo del proyecto | `PLAN.md` |
| Instrucciones para el modelo | `HANDOFF.md` |
| Sitio en producción | https://forasteros-boleter-a.vercel.app/ |
| Panel de admin | `/admin` (contraseña en `.env.local`) |
| Escáner de puerta | `/validar` (PIN en `.env.local`) |
| Tus secretos | `.env.local` — nunca se sube a git |
