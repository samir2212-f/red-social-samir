// incoming-call.js
// ---------------------------------------------------------------------
// Aviso de "llamada entrante" que funciona en CUALQUIER página del sitio
// (home, subir reel, ver reels, panel admin...), no solo dentro del chat.
//
// chat.html ya tiene su propio sistema completo de llamadas (incluye
// todo lo de WebRTC). Este archivo NO duplica esa lógica: solo escucha
// si alguien te está llamando y muestra una barra flotante arriba de
// la pantalla, en cualquier página. Si el usuario contesta, lo mandamos
// a chat.html con la llamada indicada; ahí es donde se conecta el audio
// o video (usando exactamente el mismo código que ya tenías probado).
//
// Para usarlo, cada página solo necesita:
//   <script type="module" src="incoming-call.js"></script>
// ---------------------------------------------------------------------

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  collection, query, where, onSnapshot, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

(function () {
  // Si esta página ya trae su propio sistema de llamadas (chat.html),
  // no montamos un segundo aviso encima.
  if (window.__callNotifInit) return;
  window.__callNotifInit = true;

  let bar = null;
  let textEl = null;
  let acceptBtn = null;
  let rejectBtn = null;
  let unsubIncomingCalls = null;

  function crearBarra() {
    bar = document.createElement("div");
    bar.id = "globalIncomingCallBar";
    // Reusa las mismas clases/estilos que ya existen en styles.css
    // para el aviso de llamada entrante de chat.html.
    bar.className = "incoming-call-bar";
    bar.style.display = "none";
    bar.innerHTML =
      '<div class="incoming-call-info"><span id="globalIncomingCallText"></span></div>' +
      '<div class="incoming-call-actions">' +
      '<button type="button" class="call-reject" id="globalRejectCallBtn">Colgar</button>' +
      '<button type="button" class="call-accept" id="globalAcceptCallBtn">Contestar</button>' +
      "</div>";
    document.body.appendChild(bar);

    textEl = bar.querySelector("#globalIncomingCallText");
    acceptBtn = bar.querySelector("#globalAcceptCallBtn");
    rejectBtn = bar.querySelector("#globalRejectCallBtn");
  }

  function ocultarBarra() {
    if (bar) bar.style.display = "none";
  }

  function mostrarBarra(callId, data) {
    if (!bar) crearBarra();

    const tipoTexto = data.type === "video" ? "videollamada" : "llamada";
    textEl.textContent =
      (data.fromName || "Alguien") + " te está haciendo una " + tipoTexto + "...";
    bar.style.display = "flex";

    acceptBtn.onclick = () => {
      ocultarBarra();
      // La llamada se contesta y conecta dentro de chat.html (ahí vive
      // toda la lógica de WebRTC). Le pasamos el id de la llamada por
      // la URL para que la acepte automáticamente al cargar.
      window.location.href = "chat.html?incomingCall=" + encodeURIComponent(callId);
    };

    rejectBtn.onclick = async () => {
      ocultarBarra();
      try {
        await updateDoc(doc(db, "calls", callId), { status: "declined" });
      } catch (err) {
        console.error("Error rechazando llamada (aviso global):", err);
      }
    };
  }

  onAuthStateChanged(auth, (user) => {
    if (unsubIncomingCalls) {
      unsubIncomingCalls();
      unsubIncomingCalls = null;
    }
    if (!user) {
      ocultarBarra();
      return;
    }

    // Mismo filtro que usa chat.html: hace falta el "array-contains"
    // por las reglas de seguridad de Firestore (ver README del proyecto).
    const q = query(
      collection(db, "calls"),
      where("to", "==", user.uid),
      where("participants", "array-contains", user.uid),
      where("status", "==", "calling")
    );

    unsubIncomingCalls = onSnapshot(
      q,
      (snap) => {
        // Si ya estamos en chat.html, ese archivo maneja su propio
        // aviso (con toda la lógica de contestar incluida ahí mismo);
        // aquí solo evitamos mostrar un segundo aviso duplicado.
        if (document.body.classList.contains("page-chat")) return;

        const llamada = snap.docs[0];
        if (llamada) {
          mostrarBarra(llamada.id, llamada.data());
        } else {
          ocultarBarra();
        }
      },
      (err) => console.error("Error escuchando llamadas entrantes (aviso global):", err)
    );
  });
})();
