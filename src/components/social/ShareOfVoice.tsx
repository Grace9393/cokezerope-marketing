import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BrandStats } from "@/lib/social/types";
import { SENTIMENT_STYLE } from "./SocialBits";

const short = (b: string) => (b.length > 26 ? b.slice(0, 25) + "…" : b);

/** Mentions per brand, stacked by sentiment (share of voice + tone). */
export function ShareOfVoice({ stats }: { stats: BrandStats[] }) {
  const data = stats.map((s) => ({ ...s, name: short(s.brand) }));
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {(["positive", "neutral", "negative"] as const).map((k) => (
            <Bar
              key={k}
              dataKey={k}
              stackId="s"
              name={SENTIMENT_STYLE[k].label}
              fill={SENTIMENT_STYLE[k].fill}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
