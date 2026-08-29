// firebase-config.js
// Configuración central de Firebase para toda la aplicación.
// Todas las páginas importan desde aquí en lugar de repetir la configuración,
// así se evita que quede desincronizada entre archivos (esa era una de las causas
// de errores del proyecto original).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAbKtevrs-_LJuuNEh4IKX3o_vvpFddO5k",
  authDomain: "miredsocial-b50ce.firebaseapp.com",
  projectId: "miredsocial-b50ce",
  storageBucket: "miredsocial-b50ce.appspot.com",
  messagingSenderId: "1087784350299",
  appId: "1:1087784350299:web:4c6b960635700994ef457e",
  measurementId: "G-97HJGYQX6B"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// UIDs con permisos de administrador. Para agregar un admin nuevo,
// copia el UID del usuario desde Firebase Console > Authentication
// y agrégalo a esta lista.
export const ADMINS = [
  "ZIcK7apXDpY8fFzCYzLaTLQmWrP2",
  "xsAGAbKpfJWuprMKISAKDXyBZQ32"
];
