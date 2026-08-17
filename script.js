const $ = id => document.getElementById(id);

const brief = $("brief");
const box = $("script");

// Backend de Animador IA en Render
const BACKEND_URL = "https://animador-ia-backend.onrender.com";

const templates = {
  animador: [
    "¡ATENCIÓN, ATENCIÓN, SEÑORES Y SEÑORAS!",
    "¡No te lo puedes perder! ¡Te esperamos!"
  ],
  fiesta: [
    "¡¡¡PREPÁRATE PARA LA FIESTA!!!",
    "¡¡¡QUE EMPIECE LA FIESTA!!!"
  ],
  comercial: [
    "Atención a todos nuestros amigos y clientes.",
    "Los esperamos. ¡No faltes!"
  ],
  orquesta: [
    "¡Señoras y señores, amantes de la buena música!",
    "¡Recibamos este gran espectáculo con un fuerte aplauso!"
  ]
};

// ===============================
// GENERAR GUION
// ===============================

$("generate").onclick = async () => {

  const t = brief.value.trim();

  if (!t) {
    box.value = "Escribe primero los datos del evento.";
    return;
  }

  const style = $("style").value;
  const energy = $("energy").value;

  // Mostrar estado mientras conecta con Render
  box.value = "🎙️ Preparando el anuncio...";

  try {

    const response = await fetch(
      `${BACKEND_URL}/api/generate-script`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          brief: t,
          style: style,
          energy: energy
        })
      }
    );

    if (!response.ok) {
      throw new Error("Error del servidor");
    }

    const data = await response.json();

    if (data.ok && data.script) {

      box.value = data.script;

    } else {

      throw new Error("El servidor no devolvió un guion");

    }

  } catch (error) {

    console.error(error);

    // Respaldo local
    let s = templates[style] || templates.animador;
    let texto = t;

    if (energy === "Explosiva") {
      texto = texto.replace(/[.,]/g, "!!!");
    } else if (energy === "Media") {
      texto = texto.replace(/\./g, "!");
    }

    box.value =
      s[0] +
      "\n\n" +
      texto +
      "\n\n" +
      s[1];

  }
};


// ===============================
// REPRODUCIR VOZ
// ===============================

$("speak").onclick = () => {

  speechSynthesis.cancel();

  if (!box.value.trim()) return;

  const u = new SpeechSynthesisUtterance(box.value);

  const voices = speechSynthesis.getVoices();

  u.voice =
    voices.find(v =>
      v.lang.toLowerCase().startsWith("es")
    ) || voices[0];

  u.rate = +$("rate").value;
  u.pitch = +$("pitch").value;

  speechSynthesis.speak(u);
};


// ===============================
// DETENER VOZ
// ===============================

$("stop").onclick = () => {
  speechSynthesis.cancel();
};


// ===============================
// COPIAR GUION
// ===============================

$("copy").onclick = async () => {

  await navigator.clipboard.writeText(box.value);

  $("copy").textContent = "¡Copiado!";

  setTimeout(() => {
    $("copy").textContent = "Copiar";
  }, 1200);

};


// ===============================
// VELOCIDAD
// ===============================

$("rate").oninput = () => {

  $("rv").textContent =
    (+$("rate").value).toFixed(2) + "x";

};


// ===============================
// TONO
// ===============================

$("pitch").oninput = () => {

  $("pv").textContent =
    (+$("pitch").value).toFixed(2);

};


// ===============================
// GRABACIÓN DE MUESTRA
// ===============================

let rec;
let ch = [];

$("record").onclick = async () => {

  if (!navigator.mediaDevices?.getUserMedia) {

    $("status").textContent =
      "No compatible con este dispositivo";

    return;
  }

  if (!$("consent").checked) {

    $("status").textContent =
      "Marca la autorización primero";

    return;
  }

  // DETENER GRABACIÓN
  if (rec?.state === "recording") {

    rec.stop();

    $("record").textContent =
      "🎙️ Grabar muestra";

    return;
  }

  try {

    const st =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    ch = [];

    rec = new MediaRecorder(st);

    rec.ondataavailable = e => {
      ch.push(e.data);
    };

    rec.onstop = () => {

      const b =
        new Blob(ch, {
          type: "audio/webm"
        });

      $("preview").src =
        URL.createObjectURL(b);

      $("preview").hidden = false;

      $("status").textContent =
        "Muestra grabada localmente";

      st.getTracks().forEach(track => {
        track.stop();
      });

    };

    rec.start();

    $("record").textContent =
      "⏹️ Detener grabación";

    $("status").textContent =
      "🎙️ Grabando…";

  } catch (e) {

    console.error(e);

    $("status").textContent =
      "No se pudo acceder al micrófono";

  }

};
