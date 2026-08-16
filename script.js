const brief = document.getElementById("brief");
const scriptBox = document.getElementById("script");
const style = document.getElementById("style");
const energy = document.getElementById("energy");
const voiceSelect = document.getElementById("voice");
const rate = document.getElementById("rate");
const pitch = document.getElementById("pitch");
const rateValue = document.getElementById("rateValue");
const pitchValue = document.getElementById("pitchValue");

function buildScript() {
  const text = brief.value.trim();
  if (!text) {
    scriptBox.value = "Escribe primero los datos del evento que quieres anunciar.";
    return;
  }

  const styles = {
    animador: {
      intro: "¡ATENCIÓN, ATENCIÓN, SEÑORES Y SEÑORAS!",
      close: "¡No te lo puedes perder! ¡Te esperamos!"
    },
    fiesta: {
      intro: "¡¡¡PREPÁRATE PARA LA FIESTA!!!",
      close: "¡¡¡QUE EMPIECE LA FIESTA!!!"
    },
    comercial: {
      intro: "Atención a todos nuestros amigos y clientes.",
      close: "Los esperamos. ¡No faltes!"
    },
    orquesta: {
      intro: "¡Señoras y señores, amantes de la buena música!",
      close: "¡Recibamos este gran espectáculo con un fuerte aplauso!"
    }
  };

  const s = styles[style.value];
  let middle = text;

  if (energy.value === "alta") {
    middle = middle
      .replace(/\./g, "!!!")
      .replace(/,/g, "!!!");
  } else if (energy.value === "media") {
    middle = middle.replace(/\./g, "!");
  }

  scriptBox.value =
`${s.intro}

${middle}

${s.close}`;
}

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";
  const spanish = voices.filter(v => v.lang.toLowerCase().startsWith("es"));
  (spanish.length ? spanish : voices).forEach((v, i) => {
    const option = document.createElement("option");
    option.value = v.name;
    option.textContent = `${v.name} — ${v.lang}`;
    voiceSelect.appendChild(option);
  });
}

function speak() {
  speechSynthesis.cancel();
  const text = scriptBox.value.trim();
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.name === voiceSelect.value) || voices.find(v => v.lang.startsWith("es")) || voices[0];
  utterance.lang = utterance.voice?.lang || "es-ES";
  utterance.rate = Number(rate.value);
  utterance.pitch = Number(pitch.value);
  utterance.volume = 1;
  speechSynthesis.speak(utterance);
}

document.getElementById("generateText").addEventListener("click", buildScript);
document.getElementById("speak").addEventListener("click", speak);
document.getElementById("stop").addEventListener("click", () => speechSynthesis.cancel());
document.getElementById("copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(scriptBox.value);
  const btn = document.getElementById("copy");
  btn.textContent = "¡Copiado!";
  setTimeout(() => btn.textContent = "Copiar", 1200);
});
rate.addEventListener("input", () => rateValue.textContent = `${Number(rate.value).toFixed(2)}x`);
pitch.addEventListener("input", () => pitchValue.textContent = Number(pitch.value).toFixed(2));
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();
