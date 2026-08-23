import type { Metadata } from "next";
import Link from "next/link";

import { EVENTO, precio } from "@/lib/event";

export const metadata: Metadata = { title: "Términos y política de reembolso" };

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
      <Link href="/" className="text-sm text-hueso-tenue transition hover:text-oro">
        ← Volver
      </Link>

      <header className="mt-8 mb-10">
        <p className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
          {EVENTO.grupo}
        </p>
        <h1 className="font-display text-4xl text-hueso sm:text-5xl">
          Términos y condiciones
        </h1>
        <div className="filete my-6" />
        <p className="text-hueso-tenue">
          Aplica a la compra de boletos para {EVENTO.fechaTexto}, {EVENTO.lugar},
          Panamá.
        </p>
      </header>

      <div className="space-y-10 text-hueso-tenue">
        <Seccion titulo="Tu boleto">
          <p>
            Cada boleto es un código QR único que te enviamos por correo y que
            también puedes ver en la página de tu orden. No hace falta
            imprimirlo: basta con mostrarlo desde el celular en la puerta.
          </p>
          <p>
            Cada código sirve para una sola entrada. Si compraste varios
            boletos, cada persona necesita mostrar el suyo por separado. Si el
            celular falla, en la puerta pueden buscarte por el código corto de
            tu orden.
          </p>
        </Seccion>

        <Seccion titulo="Política de reembolso">
          <p>
            Los boletos <strong className="text-hueso">no son reembolsables</strong>,
            salvo que el evento se cancele.
          </p>
          <p>
            Si Los Forasteros del Tango cancelan el concierto, te devolvemos el
            100% de lo que pagaste, por el mismo medio con el que pagaste. Te
            avisamos al correo con el que compraste tu boleto.
          </p>
        </Seccion>

        <Seccion titulo="Cómo pagas">
          <p>
            <strong className="text-hueso">Yappy:</strong> envías el pago y subes
            el comprobante desde la página de tu orden. Verificamos manualmente
            y los boletos llegan por correo apenas confirmamos — normalmente el
            mismo día. Tu cupo queda apartado mientras revisamos.
          </p>
          <p>
            <strong className="text-hueso">Tarjeta:</strong> el pago se procesa
            al instante y los boletos llegan de inmediato.
          </p>
        </Seccion>

        <Seccion titulo="Tus datos">
          <p>
            Usamos tu nombre, correo y teléfono para gestionar tu orden y
            enviarte los boletos. Si pagas por Yappy, el comprobante que subes
            se guarda en un almacenamiento privado que solo puede ver la
            organización del evento — nunca es público.
          </p>
          <p>
            Al comprar, la casilla para que te avisemos de futuros conciertos
            de {EVENTO.grupo} viene marcada por defecto — puedes desmarcarla
            antes de completar tu compra. Si en algún momento quieres que
            dejemos de escribirte, respóndenos cualquier correo nuestro
            pidiéndolo.
          </p>
        </Seccion>

        <Seccion titulo="Contacto">
          <p>
            Cualquier duda sobre tu orden, responde al correo donde recibiste
            la confirmación y te contestamos desde ahí.
          </p>
        </Seccion>
      </div>

      <p className="mt-12 border-t border-piedra pt-6 text-center text-xs text-hueso-tenue">
        {EVENTO.grupo} · {EVENTO.fechaTexto} · {precio(EVENTO.precioCents)} por
        persona
      </p>
    </main>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs tracking-[0.3em] text-oro uppercase">
        {titulo}
      </h2>
      <div className="space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}
