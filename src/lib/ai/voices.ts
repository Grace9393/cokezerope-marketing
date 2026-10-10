// Voice catalogue for read-aloud. en/de/fr use Gradium flagship voices
// (docs.gradium.ai/guides/voices/flagship-voices); zh uses Gemini TTS voices.
export type VoiceLang = "en" | "de" | "fr" | "zh";

export type VoiceOption = { id: string; name: string; provider: "gradium" | "gemini" };

export const DEFAULT_EN_VOICE = "YTpq7expH9539ERJ"; // Emma, en-US

export const VOICES: Record<VoiceLang, VoiceOption[]> = {
  en: [
    { id: DEFAULT_EN_VOICE, name: "Emma", provider: "gradium" },
    { id: "NbpkqMVS3CJeq2j8", name: "Zoey", provider: "gradium" },
    { id: "6MFfc37kq0sBjBjy", name: "Sterling", provider: "gradium" },
    { id: "r2sIQdqqoqgRJuXw", name: "Marcus", provider: "gradium" },
  ],
  de: [
    { id: "MAYVpVTYBzLRqNC7", name: "Resi", provider: "gradium" },
    { id: "p6Uutkyi3j2iNAUu", name: "Annika", provider: "gradium" },
    { id: "20zdyYrQPzKlCwkk", name: "Leon", provider: "gradium" },
  ],
  fr: [
    { id: "YhIHaAfQ0cQPDV9R", name: "Solène", provider: "gradium" },
    { id: "ZeSg853xFACESHHI", name: "Coralie", provider: "gradium" },
    { id: "YKeBw3OV1RgpdhLh", name: "Jules", provider: "gradium" },
  ],
  zh: [
    { id: "Kore", name: "Kore", provider: "gemini" },
    { id: "Puck", name: "Puck", provider: "gemini" },
  ],
};

export function defaultVoice(lang: VoiceLang): string {
  return VOICES[lang][0].id;
}
