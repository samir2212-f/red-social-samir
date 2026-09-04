// OneSignalSDKWorker.js
// Este archivo tiene que existir en la RAÍZ del dominio publicado
// (no en una subcarpeta) para que las notificaciones en segundo plano
// funcionen — es el reemplazo de firebase-messaging-sw.js.
// No hay que tocarlo ni editarlo, solo dejarlo tal cual junto a
// index.html cuando subas el proyecto.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
