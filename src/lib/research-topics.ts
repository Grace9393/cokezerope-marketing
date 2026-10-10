// Deep Research topics: market-level questions for each demo category, so the
// research never names a specific brand as "ours".
const TOPICS: Record<string, string> = {
  "AURUM GOLD": "Luxury foundation and cushion foundation",
  "Stellaria Face": "Luxury face powder and highlighter",
  SOLEIL: "Bronzer and blush",
  Lip: "Luxury lipstick and lip gloss",
  EYE: "Mascara and eye make-up",
  OTHER: "Make-up tools and gift sets",
};

export function researchTopic(category: string): string {
  return TOPICS[category] ?? `${category} make-up`;
}
