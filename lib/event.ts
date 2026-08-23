/**
 * Datos del evento. Todo lo que se muestra al público sale de aquí,
 * así que cambiar una fecha o un precio es tocar un solo archivo.
 */

export const EVENTO = {
  grupo: "Los Forasteros del Tango",
  titulo: "Noche de Tango",
  fecha: new Date("2026-09-02T20:00:00-05:00"),
  fechaTexto: "Miércoles 2 de septiembre",
  horaTexto: "8:00 PM",
  // Puertas abren una hora antes del concierto, para que la gente no espere
  // parada afuera — se muestra en letra chica junto a horaTexto.
  horaPuertasTexto: "7:00 PM",
  lugar: "Rock and Folk",
  direccion: "Calle Uruguay con C. 49 Este, Panamá",
  mapaUrl: "https://plus.codes/87F2XFRW+93V",
  precioCents: 1500,
  aforo: 115,
  yappyTelefono: "6643-3692",
  maxPorOrden: 10,
} as const;

/** 1500 -> "$15.00" */
export function precio(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
