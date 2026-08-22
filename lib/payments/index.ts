/**
 * Punto único de entrada a las pasarelas de pago. Hoy solo hay PayPal
 * (tarjeta); si algún día se agrega otra, el checkout sigue llamando estas
 * mismas funciones.
 */
export { crearOrdenPaypal, paypalActivo, verificarFirmaWebhook } from "./paypal";
export type { EventoWebhook } from "./paypal";
