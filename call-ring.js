// call-ring.js
// ---------------------------------------------------------------------
// Sonido de "timbre" para cuando llega una llamada. Se genera con la Web
// Audio API (dos tonos cortos tipo teléfono clásico, repetidos), así que
// no depende de ningún archivo .mp3/.wav ni de internet.
//
// Importante: esto SOLO suena mientras esta pestaña/ventana del
// navegador está abierta y con la página cargada. No es un push ni corre
// en segundo plano ni con la web cerrada: si el usuario no tiene el
// sitio abierto en el navegador, no hay ningún script corriendo que
// pueda reproducir sonido, así que simplemente no suena nada.
//
// Uso:
//   import { iniciarSonidoLlamada, detenerSonidoLlamada } from "./call-ring.js";
//   iniciarSonidoLlamada();   // al mostrar el aviso de llamada entrante
//   detenerSonidoLlamada();   // al contestar, rechazar, o si la llamada se cancela
// ---------------------------------------------------------------------

let audioCtx = null;
let intervaloId = null;
let sonando = false;

function beep(ctx, frecuencia, inicio, duracion) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frecuencia;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.0001, inicio);
  gain.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(gain).connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion);
}

function tandaDeTimbre(ctx) {
  const ahora = ctx.currentTime;
  // Dos "ring" cortos y un silencio, como un teléfono clásico.
  beep(ctx, 950, ahora, 0.4);
  beep(ctx, 950, ahora + 0.5, 0.4);
}

/**
 * Empieza a sonar el timbre en loop. Si ya está sonando, no hace nada
 * (evita solapar varios intervalos si se llama dos veces seguidas).
 */
export function iniciarSonidoLlamada() {
  if (sonando) return;
  sonando = true;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") {
      // Los navegadores bloquean el audio automático hasta que el
      // usuario interactuó con la página al menos una vez. Si pasa
      // eso, el aviso visual de la llamada sigue funcionando igual,
      // solo que sin sonido hasta la próxima interacción.
      audioCtx.resume().catch(() => {});
    }
    tandaDeTimbre(audioCtx);
    intervaloId = setInterval(() => {
      if (audioCtx) tandaDeTimbre(audioCtx);
    }, 2000);
  } catch (err) {
    console.warn("No se pudo reproducir el sonido de llamada:", err);
    sonando = false;
  }
}

/** Corta el timbre (contestaste, rechazaste, o la llamada se canceló). */
export function detenerSonidoLlamada() {
  sonando = false;
  if (intervaloId) {
    clearInterval(intervaloId);
    intervaloId = null;
  }
}
