"use client";

import { useEffect } from "react";

const CLAVE = "forasteros_utm";
const CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

/**
 * Guarda las etiquetas de campaña que vienen en la URL para poder adjuntarlas
 * a la orden más adelante.
 *
 * Usa `localStorage` y no `sessionStorage` a propósito: mucha gente ve el
 * anuncio, entra a mirar, y vuelve a comprar horas después. `sessionStorage`
 * se borra al cerrar la pestaña y perderíamos esa venta.
 *
 * Si llega con etiquetas nuevas, sobrescribimos: le damos el crédito al
 * último anuncio en el que hizo clic.
 */
export function CapturarUTM() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encontradas: Record<string, string> = {};

    for (const campo of CAMPOS) {
      const valor = params.get(campo);
      if (valor) encontradas[campo] = valor.slice(0, 100);
    }

    if (Object.keys(encontradas).length === 0) return;

    try {
      localStorage.setItem(CLAVE, JSON.stringify(encontradas));
    } catch {
      // Modo privado o almacenamiento lleno. No es motivo para romper nada:
      // perdemos la atribución de esta visita y ya.
    }
  }, []);

  return null;
}

/** Lee lo guardado. Devuelve `{}` si no hay nada o si el guardado se corrompió. */
export function leerUTM(): Record<string, string> {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return {};
    const datos = JSON.parse(crudo);
    return typeof datos === "object" && datos !== null ? datos : {};
  } catch {
    return {};
  }
}
