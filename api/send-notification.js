// api/send-notification.js
// Función serverless: se aloja GRATIS en Vercel (plan Hobby, sin tarjeta),
// no en Firebase, así evitamos por completo el plan de pago Blaze que
// piden las Cloud Functions.
//
// El navegador la llama justo después de guardar un mensaje nuevo en
// Firestore (ver notifications.js → notificarPush). Esta función es la
// única parte del proyecto que conoce la REST API Key secreta de
// OneSignal — nunca debe ir en un archivo del frontend, porque cualquiera
// que la vea podría mandar notificaciones falsas a tus usuarios.
//
// CONFIGURACIÓN NECESARIA (panel de Vercel → tu proyecto → Settings →
// Environment Variables), como se explica en el README:
//   ONESIGNAL_APP_ID         → el mismo valor que pusiste en onesignal-config.js
//   ONESIGNAL_REST_API_KEY   → la "REST API Key" del panel de OneSignal
//                               (Settings → Keys & IDs), NO el App ID.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { toUid, titulo, cuerpo, chatId } = req.body || {};
  if (!toUid || !cuerpo) {
    return res.status(400).json({ error: "Faltan datos (toUid y cuerpo son obligatorios)" });
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !restApiKey) {
    console.error("Faltan las variables de entorno ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY en Vercel.");
    return res.status(500).json({ error: "El servidor no está configurado todavía" });
  }

  // URL a la que se abre el chat al tocar la notificación: el mismo
  // dominio desde el que llegó la petición (funciona igual en
  // preview y producción de Vercel, sin tener que escribirlo a mano).
  const origen = req.headers.origin || `https://${req.headers.host}`;

  try {
    const respuesta = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${restApiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        // Le manda el push solo al navegador(es) que hizo OneSignal.login(toUid)
        // en notifications.js — no es un broadcast a todos los usuarios.
        include_aliases: { external_id: [String(toUid)] },
        target_channel: "push",
        headings: { en: titulo || "Tienes un mensaje nuevo" },
        contents: { en: cuerpo },
        url: chatId ? `${origen}/chat.html` : origen,
        data: { chatId: chatId || "" }
      })
    });

    const data = await respuesta.json();
    if (!respuesta.ok) {
      console.error("OneSignal rechazó la notificación:", data);
      return res.status(502).json({ error: "OneSignal rechazó la notificación", detalle: data });
    }
    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error("Error mandando la notificación:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
