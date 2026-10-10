import process from "node:process";

// Server-only Gradium voice helpers (en / de / fr). Mandarin goes to Gemini.
const GRADIUM_BASE = "https://api.gradium.ai/api";

function gradiumKey(): string {
  const key = process.env.GRADIUM_API_KEY;
  if (!key) throw new Error("GRADIUM_API_KEY is not configured on the server.");
  return key;
}

export function hasGradium(): boolean {
  return Boolean(process.env.GRADIUM_API_KEY);
}

/** Text → WAV bytes (48 kHz mono) via Gradium REST TTS. */
export async function gradiumTts(text: string, voiceId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${GRADIUM_BASE}/post/speech/tts`, {
    method: "POST",
    headers: { "x-api-key": gradiumKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voiceId, output_format: "wav", only_audio: true }),
  });
  if (!res.ok) {
    // Errors before the stream starts come back as plain text.
    const msg = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Gradium TTS failed (HTTP ${res.status})${msg ? `: ${msg}` : ""}`);
  }
  return res.arrayBuffer();
}

/** WAV bytes → transcript via Gradium REST ASR (NDJSON response). */
export async function gradiumStt(wav: ArrayBuffer, language: string): Promise<string> {
  const cfg = encodeURIComponent(JSON.stringify({ language }));
  const res = await fetch(`${GRADIUM_BASE}/post/speech/asr?json_config=${cfg}`, {
    method: "POST",
    headers: { "x-api-key": gradiumKey(), "Content-Type": "audio/wav" },
    body: wav,
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Gradium STT failed (HTTP ${res.status}): ${body.slice(0, 300)}`);
  const parts: string[] = [];
  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    let msg: { type?: string; text?: string; message?: string };
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.type === "text" && msg.text) parts.push(msg.text);
    if (msg.type === "error") throw new Error(`Gradium STT error: ${msg.message ?? "unknown"}`);
  }
  return parts
    .join(" ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}
