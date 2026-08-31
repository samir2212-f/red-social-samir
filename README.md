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

## Cómo agregar un administrador

1. En Firebase Console → Authentication, copia el UID del usuario.
2. Pégalo en la lista `ADMINS` dentro de `firebase-config.js`.
