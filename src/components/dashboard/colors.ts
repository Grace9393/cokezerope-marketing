export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.55 0.18 320)",
  "oklch(0.65 0.16 140)",
  "oklch(0.6 0.2 25)",
];

export const colorAt = (i: number) => CHART_COLORS[i % CHART_COLORS.length];
