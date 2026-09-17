// notifications.js
// Pide permiso de notificaciones al usuario y vincula este navegador con
// su uid de Firebase dentro de OneSignal (OneSignal.login), para que
// después podamos mandarle un push dirigido específicamente a él sin
// depender de Cloud Functions de pago (ver api/send-notification.js).
//
// Se importa desde home.html y chat.html, igual que antes. El SDK de
// OneSignal se carga con un <script> en el <head> de esas páginas.

import { ONESIGNAL_APP_ID } from "./onesignal-config.js";

window.OneSignalDeferred = window.OneSignalDeferred || [];
let yaInicializado = false;

/**
 * Inicializa OneSignal (solo la primera vez que se llama en la página),
 * pide permiso de notificaciones y asocia el dispositivo actual con el
 * uid de Firebase del usuario. El navegador va a preguntar el permiso
 * automáticamente, igual que hacía antes con Firebase.
 */
export function activarNotificaciones(uid) {
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      if (!yaInicializado) {
        await OneSignal.init({ appId: ONESIGNAL_APP_ID });
        yaInicializado = true;
      }

      // Vincula este navegador con el uid de Firebase. Es lo que permite
      // que api/send-notification.js le mande el push a la persona
      // correcta usando "include_aliases: { external_id: [uid] }".
      await OneSignal.login(uid);

      if (OneSignal.Notifications.permission !== true) {
        await OneSignal.Notifications.requestPermission();
      }
    } catch (err) {
      // No interrumpimos el uso normal de la app si esto falla
      // (por ejemplo si el usuario bloqueó las notificaciones o está
      // en un navegador sin soporte).
      console.warn("No se pudo activar las notificaciones push:", err);
    }
  });
}

/**
 * Le pide a nuestra función serverless (alojada gratis en Vercel) que
 * mande el push a través de OneSignal. Se llama justo después de guardar
 * el mensaje/audio/llamada en Firestore. Es "fire-and-forget": no se
 * espera su resultado, así que si falla (por ejemplo sin conexión a
 * Vercel) el chat sigue funcionando normal, la otra persona solo no
 * recibe el aviso push (igual lo va a ver al abrir el chat).
 */
export function notificarPush({ toUid, titulo, cuerpo, chatId }) {
  if (!toUid || !cuerpo) return;
  fetch("/api/send-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toUid, titulo, cuerpo, chatId })
  }).catch((err) => {
    console.warn("No se pudo mandar la notificación push:", err);
  });
}
