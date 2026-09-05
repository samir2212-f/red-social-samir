// onesignal-config.js
// Configuración de OneSignal: el servicio (100% gratis, sin tarjeta) que
// ahora manda las notificaciones push, en vez de Firebase Cloud Messaging
// + Cloud Functions (eso requería el plan de pago Blaze).
//
// Cómo conseguir tu ONESIGNAL_APP_ID:
// 1. Crea una cuenta gratis en https://onesignal.com
// 2. "New App/Website" → ponle un nombre (ej. "Red Social Samir") →
//    elige la plataforma "Web Push"
// 3. Configúralo como "Typical Site". Te va a pedir la URL del sitio:
//    pon la URL donde vas a publicar la app en Vercel (paso 3 del README).
//    Si todavía no la tienes, puedes editar esto después desde
//    Settings → Platforms en el panel de OneSignal.
// 4. Al terminar, copia el "OneSignal App ID" (un código con guiones,
//    tipo 8f4a2b1c-....) y pégalo abajo, reemplazando el texto de ejemplo.
export const ONESIGNAL_APP_ID = "405f1d3f-6156-4cbf-9855-834da691bc01";
