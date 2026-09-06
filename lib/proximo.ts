/**
 * Datos del concierto del 13 de septiembre en The Club.
 *
 * Es un evento distinto a los de `lib/event.ts`: aquí **no vendemos nosotros**
 * — el hotel cobra en su propia página (checkout de BAC Credomatic). Nuestro
 * sitio solo informa, manda el clic medido hacia allá (`/ir/hotel`) y recoge
 * el correo de quien no puede ir.
 *
 * Igual que `lib/event.ts`: cambiar un dato es tocar este archivo y nada más.
 * Un campo vacío ("") significa "no lo sabemos" y la página no lo muestra.
 */

type DatosEvento = {
  grupo: string;
  titulo: string;
  fechaTexto: string;
  horaTexto: string;
  horaPuertasTexto: string;
  lugar: string;
  direccion: string;
  mapaUrl: string;
  precioTexto: string;
  incluye: string;
  urlCobro: string;
  formacion: string;
};

// Tipado explícito y sin `as const`: los campos se comparan con "" para saber
// cuáles están sin llenar, y `as const` los volvería literales imposibles de
// comparar.
export const PROXIMO: DatosEvento = {
  grupo: "Los Forasteros del Tango",
  titulo: "Un viaje a Buenos Aires", // como lo nombra el afiche del hotel

  fechaTexto: "Domingo 13 de septiembre",
  horaTexto: "6:00 PM",
  horaPuertasTexto: "",

  lugar: "The Club — American Trade Hotel",
  direccion: "Boulevard 1, Plaza Herrera, Casco Viejo",
  mapaUrl:
    "https://www.google.com/maps/search/?api=1&query=American+Trade+Hotel%2C+Plaza+Herrera%2C+Panam%C3%A1",

  // El afiche dice "COVER", no "entrada": en un club el cobro es de entrada y
  // el consumo va aparte. Decirlo como cover evita el reclamo en la puerta.
  precioTexto: "Cover $16.05",
  incluye: "El consumo va aparte.",

  /**
   * Página de cobro del hotel. Es uno de los checkouts que ellos mismos
   * publican en americantradehotel.com/the-club, confirmado contra esa página.
   * Mientras esté vacía, nuestra página muestra "entradas pronto" en vez de un
   * botón que no lleva a nada.
   */
  urlCobro:
    "https://checkout.baccredomatic.com/ODY2MTM2YTE0NjI5YTAwYWU0NWYuM2ExNzg4MjA5ODI4",

  /** Quién toca esa noche. El afiche manda: aquí no hay guitarra ni bailarines. */
  formacion:
    "Samuel Barrios (piano), Carlos Quirós (contrabajo), Nestor Ibarra (violín), Arlene Magallón (acordeón), y las voces de José David Ordóñez y Alejandra Ordóñez.",
};

/** Si ya se puede mandar gente a comprar. */
export function ventaAbierta(): boolean {
  return PROXIMO.urlCobro !== "";
}
