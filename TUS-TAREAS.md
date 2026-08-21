# Tus tareas, Nestor

Lo que solo puedes hacer tú, porque requiere tus credenciales o tu decisión.
Ordenadas por urgencia. **Quedan 12 días** (hoy 21 de agosto, concierto el 2 de
septiembre).

Marca con `[x]` lo que vayas terminando: el modelo que trabaje después lee este
archivo para saber qué ya está listo.

---

## 🔴 Hoy mismo — sin esto no se puede vender nada

### [ ] 1. Correr la migración 002 en Supabase *(5 minutos)*

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

---

### [ ] 2. Guardar el trabajo en git *(2 minutos)*

Hay 16 archivos sin guardar. Si algo se borra, se pierde una sesión entera de
trabajo. Pídeselo al modelo ("commitea lo que hay") o hazlo tú:

```bash
git add -A && git commit -m "Checkout, flujo Yappy, panel de admin y escáner"
```

---

## 🟠 Esta semana — para poder lanzar

### [ ] 3. Crear el repositorio en GitHub *(10 minutos)*

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

### [ ] 4. Conectar Vercel *(10 minutos)*

1. Entra a [vercel.com/new](https://vercel.com/new)
2. Importa el repo `forasteros-boleteria`
3. En **Environment Variables**, copia **todas** las variables de tu
   `.env.local` (ábrelo con `open -a TextEdit .env.local`)
4. Cambia `NEXT_PUBLIC_SITE_URL` por la URL que te dé Vercel
5. Deploy

**Cómo sabes que funcionó:** la landing carga en tu URL `.vercel.app`.

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
| Panel de admin | `/admin` (contraseña en `.env.local`) |
| Escáner de puerta | `/validar` (PIN en `.env.local`) |
| Tus secretos | `.env.local` — nunca se sube a git |
