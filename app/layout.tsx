import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { CapturarUTM } from "@/components/CapturarUTM";
import MetaPixel from "@/components/MetaPixel";
import { PROXIMO } from "@/lib/proximo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

// Descripción del grupo, no de un concierto: es el texto que se ve al
// compartir la portada, y las fechas concretas ya viven en la página de
// cada evento, que trae su propia metadata.
const descripcion =
  "Quinteto de tango en Panamá. Violín, contrabajo, acordeón, guitarra y voz, con bailarines y cantantes invitados.";

export const metadata: Metadata = {
  // `||` y no `??`: en Vercel la variable puede quedar como cadena vacía (no
  // "sin definir") si se agrega antes de saber la URL final, y `??` no cae al
  // valor por defecto en ese caso — `new URL("")` explota el build.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: `${PROXIMO.grupo} — Tango en vivo en Panamá`,
    template: `%s · ${PROXIMO.grupo}`,
  },
  description: descripcion,
  // La mayoría de la gente va a llegar por un enlace de WhatsApp o Instagram,
  // así que la tarjeta que se ve al compartir importa tanto como la página.
  openGraph: {
    title: `${PROXIMO.grupo} — Tango en vivo en Panamá`,
    description: descripcion,
    type: "website",
    locale: "es_PA",
    images: [{ url: "/fotos/hero-arco.jpg", width: 1200, height: 1800 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROXIMO.grupo} — Tango en vivo en Panamá`,
    description: descripcion,
    images: ["/fotos/hero-arco.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="es">
      <body className={`${inter.variable} ${playfair.variable}`}>
        {children}
        <CapturarUTM />
        {pixelId && <MetaPixel pixelId={pixelId} />}
      </body>
    </html>
  );
}
