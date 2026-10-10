import { useMemo } from "react";

// Text-mode word cloud (ported from Social Pulse: size 12 + ratio·30 px,
// opacity 0.55–1, cycling palette). Topics come from real scanned mentions.
const PALETTE = [
  "#b45309",
  "#0f766e",
  "#7c3aed",
  "#be123c",
  "#1d4ed8",
  "#15803d",
  "#c2410c",
  "#4338ca",
];

export function WordCloud({
  words,
  onPick,
  active,
}: {
  words: { term: string; count: number }[];
  onPick?: (term: string) => void;
  active?: string | null;
}) {
  const items = useMemo(() => {
    const top = words.slice(0, 45);
    const max = Math.max(1, ...top.map((w) => w.count));
    const min = Math.min(max, ...top.map((w) => w.count));
    // interleave big and small words so the cloud looks balanced
    const sorted = [...top].sort((a, b) => b.count - a.count);
    const mixed: typeof sorted = [];
    while (sorted.length) {
      mixed.push(sorted.shift()!);
      if (sorted.length) mixed.push(sorted.pop()!);
    }
    return mixed.map((w, i) => {
      const ratio = max === min ? 0.5 : (w.count - min) / (max - min);
      return {
        ...w,
        size: 12 + ratio * 30,
        opacity: 0.55 + ratio * 0.45,
        color: PALETTE[i % PALETTE.length],
      };
    });
  }, [words]);

  if (!items.length) return <p className="text-sm text-muted-foreground">No topics yet.</p>;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2">
      {items.map((w) => (
        <button
          key={w.term}
          onClick={() => onPick?.(w.term)}
          title={`${w.term} · ${w.count} mention${w.count > 1 ? "s" : ""}`}
          className="leading-tight transition-transform hover:scale-110"
          style={{
            fontSize: w.size,
            opacity: active && active !== w.term ? 0.25 : w.opacity,
            color: w.color,
            fontWeight: w.size > 28 ? 700 : 500,
          }}
        >
          {w.term}
        </button>
      ))}
    </div>
  );
}
