// api/cleanup-old-media.js
//
// Limpieza automática de medios viejos, para que Supabase (fotos/reels) y
// Cloudinary (audios) nunca lleguen a llenarse. Corre sola todos los días
// (ver "crons" en vercel.json) y también se puede disparar a mano desde el
// panel admin ("Ejecutar limpieza ahora", en la pestaña Ajustes).
//
// QUÉ BORRA (todo lo más viejo que DAYS_TO_KEEP_MEDIA días):
//   1. Imágenes y audios del chat privado (colección "privateChat"):
//      se borra el archivo real (Supabase / Cloudinary) y el mensaje se
//      convierte en un aviso tipo "Imagen eliminada (más de 30 días)",
//      en vez de desaparecer sin dejar rastro en la conversación.
//   2. Imágenes de los posts del feed general (colección "chat"): se
//      borra el archivo y se limpia el campo imageUrl del post (el texto
//      del post, si tenía, se conserva).
//   3. Reels (bucket "Samir", carpeta "reels/"): no tienen documento en
//      Firestore, así que se listan directo desde Supabase Storage y se
//      borran los archivos viejos por su fecha de subida.
//
// NO TOCA texto de mensajes/posts, usuarios, ni el registro de llamadas:
// eso pesa prácticamente nada, el problema real de espacio es el video/
// audio/imágenes.
//
// ------------------------------------------------------------------
// CONFIGURACIÓN NECESARIA (Vercel → tu proyecto → Settings →
// Environment Variables). Ver el README para el paso a paso de dónde
// sacar cada valor:
//
//   FIREBASE_SERVICE_ACCOUNT_KEY  → JSON de la cuenta de servicio de
//                                    Firebase, pegado como texto (una
//                                    sola línea). Permite borrar/editar
//                                    en Firestore desde el servidor sin
//                                    depender de que haya un navegador
//                                    abierto con sesión de admin.
//   SUPABASE_URL                  → mismo valor que ya usan los HTML
//                                    (https://xxxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY     → la "service_role" key de Supabase
//                                    (Settings → API). NUNCA la clave
//                                    "anon" que ya está en el frontend:
//                                    esta sí puede borrar aunque las
//                                    políticas del bucket no lo permitan
//                                    para usuarios normales.
//   CLOUDINARY_API_KEY            → panel de Cloudinary → Dashboard
//   CLOUDINARY_API_SECRET         → igual, NUNCA debe ir en el frontend
//   CLOUDINARY_CLOUD_NAME         → "dbgpvwprb" (opcional, ya trae ese
//                                    valor por defecto si no la pones)
//   ADMIN_UIDS                    → mismos UIDs que la lista ADMINS de
//                                    firebase-config.js, separados por
//                                    coma. Sirve para validar el botón
//                                    manual del panel admin.
//   CRON_SECRET                   → cualquier texto largo al azar. Es lo
//                                    que usa Vercel Cron para autenticar
//                                    su propia llamada automática diaria
//                                    (Vercel la manda solo si esta
//                                    variable existe).
//   DAYS_TO_KEEP_MEDIA            → opcional, por defecto 30. Cuántos
//                                    días se conservan las fotos/audios/
//                                    reels antes de borrarlos.
// ------------------------------------------------------------------

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import crypto from "crypto";

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  return initializeApp({ credential: cert(serviceAccount) });
}

// Saca la ruta interna del bucket a partir de una URL pública de Supabase,
// por ejemplo de:
//   https://xxxx.supabase.co/storage/v1/object/public/Chat/169..._foto.png
// devuelve "169..._foto.png"
function extraerPathSupabase(url, bucket) {
  if (!url) return null;
  const marcador = `/object/public/${bucket}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marcador.length));
}

async function borrarObjetoSupabase(bucket, path) {
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  // 200/404 (ya no existía) los tratamos como éxito; cualquier otra cosa
  // es un problema real (clave mal puesta, bucket sin permisos, etc.)
  return res.ok || res.status === 404;
}

async function listarSupabase(bucket, prefix) {
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/list/${bucket}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "created_at", order: "asc" } })
  });
  if (!res.ok) throw new Error(`Error listando Supabase (${bucket}/${prefix}): ${res.status}`);
  return res.json();
}

// Cloudinary sirve los audios como recurso "video" (ver chat.html), y
// borrar requiere una petición FIRMADA con el API secret — por eso no se
// puede hacer desde el navegador, solo desde aquí.
function extraerPublicIdCloudinary(url) {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^./]+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match ? match[1] : null;
}

async function borrarAudioCloudinary(publicId) {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dbgpvwprb";
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature
  });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/destroy`, {
    method: "POST",
    body
  });
  const data = await res.json();
  return data.result === "ok" || data.result === "not found";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Dos formas válidas de llamar a esta función:
  //  1) Vercel Cron, todos los días, mandando el header que arma solo con
  //     la variable de entorno CRON_SECRET (no la escribe nadie a mano).
  //  2) El botón "Ejecutar limpieza ahora" del panel admin, mandando el
  //     idToken de la sesión de Firebase de quien tocó el botón.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || "";
  const esLlamadaDeCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  const app = getAdminApp();

  if (!esLlamadaDeCron) {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(401).json({ error: "No autorizado" });
    try {
      const decoded = await getAuth(app).verifyIdToken(idToken);
      const adminUids = (process.env.ADMIN_UIDS || "").split(",").map(s => s.trim()).filter(Boolean);
      if (!adminUids.includes(decoded.uid)) {
        return res.status(403).json({ error: "No tienes permisos de administrador" });
      }
    } catch (err) {
      return res.status(401).json({ error: "Token inválido" });
    }
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Faltan variables de entorno por configurar en Vercel (ver README)." });
  }

  const dias = parseInt(process.env.DAYS_TO_KEEP_MEDIA || "30", 10);
  const cutoffMs = Date.now() - dias * 24 * 60 * 60 * 1000;

  const db = getFirestore(app);
  const resumen = { imagenesPrivadas: 0, audios: 0, imagenesPost: 0, reels: 0, errores: [] };

  try {
    // 1) Chat privado: imágenes y audios
    const privSnap = await db.collection("privateChat").get();
    for (const docSnap of privSnap.docs) {
      const m = docSnap.data();
      const ts = m.timestamp ? m.timestamp.toMillis() : 0;
      if (!ts || ts > cutoffMs) continue;

      if (m.type === "image" && m.imageUrl) {
        const path = extraerPathSupabase(m.imageUrl, "Chat");
        const ok = path ? await borrarObjetoSupabase("Chat", path) : false;
        if (!ok) resumen.errores.push(`No se pudo borrar la imagen del mensaje ${docSnap.id}`);
        await docSnap.ref.update({
          imageUrl: null,
          type: "expired",
          content: `📷 Imagen eliminada (más de ${dias} días)`
        });
        resumen.imagenesPrivadas++;
      } else if (m.type === "audio" && m.audioUrl) {
        const publicId = extraerPublicIdCloudinary(m.audioUrl);
        const ok = publicId ? await borrarAudioCloudinary(publicId) : false;
        if (!ok) resumen.errores.push(`No se pudo borrar el audio del mensaje ${docSnap.id}`);
        await docSnap.ref.update({
          audioUrl: null,
          type: "expired",
          content: `🎤 Audio eliminado (más de ${dias} días)`
        });
        resumen.audios++;
      }
    }

    // 2) Feed general: imágenes de los posts
    const chatSnap = await db.collection("chat").get();
    for (const docSnap of chatSnap.docs) {
      const p = docSnap.data();
      const ts = p.timestamp ? p.timestamp.toMillis() : 0;
      if (!ts || ts > cutoffMs || !p.imageUrl) continue;

      const path = extraerPathSupabase(p.imageUrl, "Chat");
      const ok = path ? await borrarObjetoSupabase("Chat", path) : false;
      if (!ok) resumen.errores.push(`No se pudo borrar la imagen del post ${docSnap.id}`);
      await docSnap.ref.update({ imageUrl: null });
      resumen.imagenesPost++;
    }

    // 3) Reels viejos (sin documento en Firestore, se listan del storage)
    const archivos = await listarSupabase("Samir", "reels");
    for (const archivo of archivos) {
      const creado = archivo.created_at ? new Date(archivo.created_at).getTime() : 0;
      if (creado && creado < cutoffMs) {
        const ok = await borrarObjetoSupabase("Samir", `reels/${archivo.name}`);
        if (ok) resumen.reels++;
        else resumen.errores.push(`No se pudo borrar el reel ${archivo.name}`);
      }
    }

    return res.status(200).json({ ok: true, diasDeRetencion: dias, resumen });
  } catch (err) {
    console.error("Error en la limpieza automática:", err);
    return res.status(500).json({ error: "Error interno", detalle: err.message });
  }
}
