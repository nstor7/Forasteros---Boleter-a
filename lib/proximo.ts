/**
 * Datos del concierto del 18 de octubre en The Club.
 *
 * Es un evento distinto a los de `lib/event.ts`: aquí **no vendemos nosotros**
 * — el hotel cobra en su propia página. Nuestro sitio solo informa, manda el
 * clic medido hacia allá (`/ir/hotel`) y recoge el correo de quien no puede ir.
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
  titulo: "Aires de Tradición y Vanguardia",

  fechaTexto: "Domingo 18 de octubre",

  /**
   * Las puertas abren una hora antes de la música. En septiembre el afiche
   * daba una sola hora y la gente llegaba justo a esa; decir las dos por
   * separado evita que entren cuando ya empezó el primer tango.
   */
  horaTexto: "7:00 PM",
  horaPuertasTexto: "6:00 PM",

  lugar: "The Club — American Trade Hotel",
  direccion: "Boulevard 1, Plaza Herrera, Casco Viejo",
  mapaUrl:
    "https://www.google.com/maps/search/?api=1&query=American+Trade+Hotel%2C+Plaza+Herrera%2C+Panam%C3%A1",

  /**
   * El afiche del hotel dice "COVER", no "entrada": en un club el cobro es de
   * entrada y el consumo va aparte. Decirlo como cover evita el reclamo en la
   * puerta.
   *
   * $16.05 es el precio que cobra el checkout del hotel, no un cálculo
   * nuestro: son $15 más el 7% de ITBMS.
   */
  precioTexto: "Cover $16.05",
  incluye: "",

  /**
   * Página de cobro del hotel para ESTA fecha.
   *
   * Verificado contra el propio checkout antes de ponerlo aquí: el comercio es
   * "AMERICAN TRADE HOTEL CC", el monto son USD 16.05 y no está expirado. Vale
   * la pena repetir esa comprobación cada vez que cambie la fecha — el hotel
   * publica un botón distinto por concierto y todos se ven iguales desde
   * afuera.
   *
   * Ojo: el checkout nombra el show "DE GARDEL A PIAZZOLLA", que no es el
   * título que usamos aquí. Si el hotel no lo corrige, quien haga clic ve un
   * nombre distinto al de la página.
   */
  urlCobro:
    "https://checkout.baccredomatic.com/NGE0OTNjMTU2MmM2Nzc4NWI5MDYwMS4xNzkwNzExMTA5",

  /** Quién toca esa noche. Confirmar si cambia respecto a septiembre. */
  formacion:
    "Samuel Barrios (piano), Carlos Quirós (contrabajo), Nestor Ibarra (violín), Arlene Magallón (acordeón), y las voces de José David Ordóñez y Alejandra Ordóñez.",
};

/** Si ya se puede mandar gente a comprar. */
export function ventaAbierta(): boolean {
  return PROXIMO.urlCobro !== "";
}

/**
 * `fechaTexto` arranca con el día de la semana en mayúscula porque casi
 * siempre se muestra suelto, como un título. Metido en una frase —"tocamos el
 * Domingo 18"— esa mayúscula se lee como un error de tipeo, así que aquí baja.
 */
export function fechaEnFrase(): string {
  const t = PROXIMO.fechaTexto;
  return t ? t[0].toLowerCase() + t.slice(1) : "";
}
