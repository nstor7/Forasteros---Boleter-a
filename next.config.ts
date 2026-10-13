import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * La página de cada concierto vive en su propia ruta con la fecha
   * (`/18-octubre`), así que al cambiar de fecha la anterior queda muerta. El
   * enlace de `/13-septiembre` salió en el correo a la lista y en WhatsApp, y
   * esos mensajes no se pueden editar: sin esto, quien los abra hoy ve un 404.
   *
   * Va a la fecha viva y no a la portada porque quien busca "el concierto de
   * los Forasteros" quiere la fecha que se puede comprar, no la biografía.
   *
   * `permanent: false` (307) a propósito: cuando llegue el concierto de
   * noviembre, esta línea se cambia por la nueva, y un 308 ya cacheado en el
   * navegador de alguien seguiría mandándolo a octubre para siempre.
   */
  redirects() {
    return [{ source: "/13-septiembre", destination: "/18-octubre", permanent: false }];
  },
};

export default nextConfig;
