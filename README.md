# Samir Social

Red social sencilla hecha con HTML/CSS/JS puro (sin frameworks), usando:
- **Firebase** (Auth + Firestore) para cuentas, feed, panel admin y chat privado.
- **Supabase Storage** para alojar imágenes de los posts y los videos (reels).

## Estructura

| Archivo | Función |
|---|---|
| `index.html` | Login / registro |
| `home.html` | Feed principal, usuarios en línea, notificaciones de chat |
| `chat.html` | Chat privado entre usuarios |
| `reels.html` | Subir un reel (video) |
| `feed.html` | Ver los reels estilo TikTok |
| `paneladm.html` | Panel de administración (solo UIDs en `ADMINS`) |
| `firebase-config.js` | Configuración única de Firebase, compartida por todas las páginas |
| `onesignal-config.js` | Configuración de OneSignal (notificaciones push) |
| `notifications.js` | Pide el permiso de notificaciones y avisa cuando llega un mensaje/audio/llamada |
| `OneSignalSDKWorker.js` | Service worker que OneSignal necesita en la raíz del sitio |
| `api/send-notification.js` | Función serverless (Vercel) que manda el push real, con la clave secreta |

## Cómo probarlo

No necesita build ni servidor especial. Basta con abrir `index.html` con
un servidor local (por ejemplo la extensión "Live Server" de VS Code, o
`python3 -m http.server`). **No lo abras con doble clic (`file://...`)**,
porque los módulos de JavaScript (`type="module"`) no cargan bien así.

## Errores que tenía el proyecto y qué se corrigió

1. **El chat privado no aparecía en las notificaciones ni en el panel admin.**
   Este era el bug principal. `chat.html` guardaba los mensajes en
   `chats/{id}/mensajes` (una subcolección por pareja de usuarios), pero
   `home.html` (el contador del sobrecito 💌) y `paneladm.html` (la pestaña
   de moderación) leían de una colección totalmente distinta llamada
   `privateChat`. Como nunca se escribía ahí, el contador siempre marcaba 0
   y el panel admin nunca mostraba mensajes privados. Ahora los tres
   archivos usan la misma colección `privateChat` con el mismo formato.

2. **El panel admin no verificaba quién entraba.** Cualquiera que
   adivinara la URL `paneladm.html` podía borrar usuarios, posts y
   mensajes. Ahora se valida que haya sesión iniciada y que el UID esté en
   la lista `ADMINS` (definida en `firebase-config.js`); si no, te
   redirige.

3. **Los reels no se veían en `feed.html`.** `reels.html` sube los videos
   dentro de la carpeta `reels/` del bucket, pero `feed.html` listaba la
   raíz del bucket (`""`), así que nunca encontraba los archivos. Ahora
   `feed.html` lista la carpeta `reels/` correctamente.

4. **`home.html` cargaba un CSS que no existía** (`estile2.css`), lo cual
   generaba un error 404 en la consola (no rompía la página porque todo el
   estilo real estaba en un `<style>` inline, pero ensuciaba la consola).
   Se quitó esa referencia.

5. **La configuración de Firebase estaba repetida y ligeramente distinta
   en cada archivo** (algunos con `appId` diferente). Se centralizó en
   `firebase-config.js`, así que si algún día cambias de proyecto de
   Firebase, solo editas un archivo.

6. **Se eliminaron `main.js` y `style.css`**, que eran una versión vieja
   e incompleta del login/feed (con `TU_API_KEY` sin configurar) que no
   estaba enlazada desde ningún HTML. Quedaban ahí sueltos sin usarse.

7. Textos y títulos informales del prototipo original (por ejemplo el
   `<title>` de `index.html`) se cambiaron por textos neutros para que se
   vea presentable si lo muestras a alguien más.

## Firebase, Supabase y la "desactivación después de un mes"

Aquí hay dos servicios distintos y conviene no mezclarlos:

**Firebase (plan Spark, el gratuito) no caduca por tiempo.** No existe un
"mes de prueba" que se acabe. Lo que sí existe es esto: el plan Spark
tiene **límites de uso mensuales** (lecturas/escrituras de Firestore,
verificaciones de teléfono, etc.). Si te pasas de esos límites en un mes,
Firebase apaga esa función hasta que empieza el siguiente mes, en el que
se reactiva sola sin que tengas que hacer nada. Con el tráfico de un
proyecto de práctica es muy difícil llegar a ese límite.

Lo que **sí se desactiva por inactividad es tu proyecto de Supabase**
(donde subes las imágenes y los videos): en el plan gratuito, Supabase
pausa el proyecto automáticamente si pasa **una semana sin actividad**, no
un mes. Cuando eso pasa, las imágenes/videos dejan de cargar hasta que
entras al panel de Supabase y le das a "Restore/Restaurar" (tu base de
datos y archivos no se borran, solo se pausan). Si quieres evitar que se
pause, la forma más simple es entrar al proyecto en supabase.com de vez en
cuando, o programar un "ping" automático (por ejemplo con GitHub Actions)
que haga una consulta pequeña cada pocos días.

En resumen: si algo dejó de funcionar después de un tiempo sin usar el
proyecto, lo más probable es que sea Supabase pausado por inactividad, no
Firebase. Revisa el dashboard de Supabase primero.

## Notificaciones push (OneSignal, 100% gratis, sin tarjeta)

El chat manda un aviso push cuando llega un mensaje, un audio o una
llamada perdida — incluso con el navegador cerrado en Android y
escritorio (en iOS, solo si la app está "instalada" como PWA desde
Safari; ver nota más abajo).

Se usa **OneSignal** en vez de Firebase Cloud Messaging + Cloud Functions,
porque las Cloud Functions solo funcionan en el plan de pago Blaze de
Firebase (aunque casi seguro te saliera en $0, requiere tener una tarjeta
cargada). Con OneSignal + una función serverless en Vercel, todo queda en
planes gratuitos de verdad, sin necesidad de tarjeta.

### Paso 1 — Crear la app en OneSignal
1. Cuenta gratis en https://onesignal.com
2. "New App/Website" → nombre → plataforma **Web Push** → "Typical Site".
3. Copia el **OneSignal App ID** y pégalo en `onesignal-config.js`
   (`ONESIGNAL_APP_ID`).
4. En el panel de OneSignal, ve a **Settings → Keys & IDs** y copia
   también la **REST API Key** (la vas a necesitar en el paso 3; NO se
   pega en ningún archivo del proyecto, solo en Vercel).

### Paso 2 — Subir el proyecto a Vercel
1. Cuenta gratis en https://vercel.com (puedes entrar con GitHub).
2. Sube esta carpeta a un repositorio de GitHub, o instala `vercel` CLI
   (`npm i -g vercel`) y desde la carpeta del proyecto corre `vercel`.
3. Importa el repo en Vercel ("Add New… → Project") y dale "Deploy".
   No hace falta configurar nada especial: detecta los `.html` sueltos
   como sitio estático y `api/send-notification.js` como función
   serverless automáticamente.

### Paso 3 — Conectar las dos cosas
En Vercel → tu proyecto → **Settings → Environment Variables**, agrega:

| Nombre | Valor |
|---|---|
| `ONESIGNAL_APP_ID` | el mismo App ID del paso 1 |
| `ONESIGNAL_REST_API_KEY` | la REST API Key del paso 1 |

Después de agregarlas, vuelve a la pestaña **Deployments** y dale
"Redeploy" (las variables de entorno nuevas no aplican hasta el próximo
deploy).

### Notas
- Android y escritorio (Chrome, Edge, Firefox) reciben el push directo en
  el navegador, con o sin la pestaña abierta.
- **iOS solo soporta esto si la app se "instala"** (Safari → compartir →
  "Agregar a inicio"). Con Safari normal en pestaña, iOS no entrega push
  web todavía.
- Sigue usando Firebase (Auth + Firestore) exactamente igual que antes;
  lo único que cambió es quién manda el push.

## Cómo agregar un administrador

1. En Firebase Console → Authentication, copia el UID del usuario.
2. Pégalo en la lista `ADMINS` dentro de `firebase-config.js`.
