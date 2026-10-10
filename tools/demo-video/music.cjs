const { createRequire } = require("module");
const path = require("path");
const req = createRequire(path.resolve(__dirname, "../../package.json"));
const { GoogleGenAI } = req("@google/genai");
const fs = require("fs");
(async () => {
  const t0 = Date.now();
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const it = await client.interactions.create({
    model: "lyria-3.5",
    input:
      "A 2-minute instrumental background track for a tech product demo video. No vocals, no lyrics. Calm, modern and optimistic: soft electronic pulse, warm piano chords, light percussion, steady 100 BPM, gentle build in the middle, clean ending. Must sit quietly under a voice-over.",
  });
  const a = it.output_audio;
  if (!a) {
    console.log("no audio", it.status, JSON.stringify(it).slice(0, 500));
    return;
  }
  fs.writeFileSync("music.mp3", Buffer.from(a.data, "base64"));
  console.log(
    "music ok",
    a.mime_type,
    Math.round((a.data.length * 0.75) / 1024),
    "KB",
    Date.now() - t0,
    "ms",
  );
})().catch((e) => console.log("ERR", e.message));
