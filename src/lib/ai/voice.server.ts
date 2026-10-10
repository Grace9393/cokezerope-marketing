import { getGemini } from "./gemini.server";
import { MODELS } from "./models";
import { gradiumStt, gradiumTts } from "./gradium.server";
import { DEFAULT_EN_VOICE, VOICES, type VoiceLang } from "./voices";

// Voice routing: Gradium for en / de / fr, Gemini for Mandarin (Gradium has no zh).

const LANG_NAMES: Record<VoiceLang, string> = {
  en: "English",
  de: "German",
  fr: "French",
  zh: "Traditional Chinese (Taiwan Mandarin)",
};

export const BASE_VOCABULARY = [
  "AURUM GOLD",
  "Stellaria",
  "SOLEIL",
  "Rouge A",
  "Kiss Lab",
  "M.A.C",
  "Laura Mercier",
  "Dior",
  "Cushion Foundation",
  "momo",
  "Sephora",
  "Watsons",
  "屈臣氏",
  "Ace",
];

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(data: string): Uint8Array {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Rewrite a spoken summary into the voice language (no-op when it already matches). */
export async function rewriteForVoice(
  text: string,
  from: VoiceLang | undefined,
  to: VoiceLang,
): Promise<string> {
  if (!from || from === to) return text;
  const it = (await getGemini().interactions.create({
    model: MODELS.router,
    input:
      `Rewrite this spoken business summary in ${LANG_NAMES[to]} for text-to-speech. Keep every number and product name. ` +
      `Plain spoken sentences only, no symbols or lists, under 60 seconds. Return only the rewritten text.\n\n${text}`,
  } as never)) as unknown as { output_text?: string };
  return (it.output_text ?? text).trim();
}

export async function synthesize(
  text: string,
  lang: VoiceLang,
  voiceId?: string,
): Promise<Uint8Array> {
  if (lang === "zh") {
    const voice = voiceId && VOICES.zh.some((v) => v.id === voiceId) ? voiceId : VOICES.zh[0].id;
    const it = (await getGemini().interactions.create({
      model: MODELS.tts,
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text,
              annotations: [
                { type: "speech_metadata", style: "clear, calm Taiwan Mandarin business briefing" },
              ],
            },
          ],
        },
      ],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice }] },
    } as never)) as unknown as { output_audio?: { data: string } | null };
    if (!it.output_audio?.data) throw new Error("Gemini TTS returned no audio.");
    return fromB64(it.output_audio.data);
  }
  const allowed = VOICES[lang].some((v) => v.id === voiceId);
  const voice =
    allowed && voiceId ? voiceId : lang === "en" ? DEFAULT_EN_VOICE : VOICES[lang][0].id;
  return new Uint8Array(await gradiumTts(text, voice));
}

/** Fix brand names and (for zh) convert to Traditional Chinese. */
async function normalizeTranscript(
  raw: string,
  lang: VoiceLang,
  vocabulary: string[],
): Promise<string> {
  if (!raw.trim()) return raw;
  const it = (await getGemini().interactions.create({
    model: MODELS.router,
    input:
      `This is a speech transcript from a make-up category manager. Fix misheard brand or product names using this list: ` +
      `${vocabulary.join(", ")}. ${lang === "zh" ? "Convert to Traditional Chinese as used in Taiwan. " : ""}` +
      `Do not add, remove or answer anything. Return only the corrected transcript.\n\n${raw}`,
  } as never)) as unknown as { output_text?: string };
  return (it.output_text ?? raw).trim();
}

export async function transcribe(
  wav: ArrayBuffer,
  lang: VoiceLang,
  vocabulary: string[],
): Promise<string> {
  const vocab = [...new Set([...BASE_VOCABULARY, ...vocabulary])].slice(0, 100);
  let raw: string;
  if (lang === "zh") {
    const it = (await getGemini().interactions.create({
      model: MODELS.transcribe,
      input: [{ type: "audio", data: b64(wav), mime_type: "audio/wav" }],
      generation_config: {
        transcription_config: {
          language_codes: ["cmn-Hans-CN"],
          custom_vocabulary: vocab,
          mode: "smart",
        },
      },
    } as never)) as unknown as { output_text?: string };
    raw = it.output_text ?? "";
  } else {
    raw = await gradiumStt(wav, lang);
  }
  try {
    return await normalizeTranscript(raw, lang, vocab);
  } catch {
    return raw;
  }
}
