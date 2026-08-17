import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Animador IA Backend",
    version: "1.0.0"
  });
});

app.post("/api/generate-script", (req, res) => {
  const { brief, style = "animador", energy = "media" } = req.body || {};

  if (!brief || !brief.trim()) {
    return res.status(400).json({
      ok: false,
      error: "Falta el texto del anuncio."
    });
  }

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

  const selected = templates[style] || templates.animador;

  let middle = String(brief).trim();

  if (energy === "alta" || energy === "explosiva") {
    middle = middle.replace(/[.,]/g, "!!!");
  } else if (energy === "media") {
    middle = middle.replace(/\./g, "!");
  }

  const script = `${selected[0]}

${middle}

${selected[1]}`;

  res.json({
    ok: true,
    script,
    engine: "template-v1"
  });
});

app.post("/api/voice/generate", (req, res) => {
  res.status(501).json({
    ok: false,
    error: "Motor de voz IA todavía no conectado.",
    nextStep: "Conectar un proveedor TTS/voice-cloning mediante variables de entorno seguras."
  });
});

app.listen(PORT, () => {
  console.log(
    `Animador IA Backend escuchando en http://localhost:${PORT}`
  );
});
