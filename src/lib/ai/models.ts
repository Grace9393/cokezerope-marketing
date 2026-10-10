// Gemini model and agent IDs used by Ace (from the Agentic AI Hack Zürich brief).
// Safe to import from client or server — contains no secrets.
export const MODELS = {
  /** Agent planning, tool use and reasoning. */
  agent: "gemini-3.8-flash",
  /** Cheap router and checks. */
  router: "gemini-3.5-flash-lite",
  /** Deep Research managed agent (background). */
  deepResearch: "deep-research-preview-04-2026",
  /** Mandarin (and fallback) text-to-speech. */
  tts: "gemini-3.8-flash-tts",
  /** Mandarin (and fallback) speech-to-text. */
  transcribe: "gemini-3.5-transcribe",
  /** Image understanding is done by the agent model; generation by Nano Banana. */
  image: "gemini-nano-banana-2.1",
} as const;
