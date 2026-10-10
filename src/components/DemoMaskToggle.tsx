import { Drama } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MASK_THEMES, useDemoMask, type MaskTheme } from "@/lib/demo-mask";

/** Header switch for the demo mask (Real names / Cola / Pika / K-pop). */
export function DemoMaskToggle() {
  const { theme, setTheme } = useDemoMask();
  const on = theme !== "off";
  return (
    <Select value={theme} onValueChange={(v) => setTheme(v as MaskTheme)}>
      <SelectTrigger
        className={cn(
          "h-8 w-[132px] gap-1 text-xs",
          on && "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-800",
        )}
        aria-label="Demo mask: replace brand names"
        title="Demo mask: replace every brand and product name on screen"
      >
        <Drama className="h-3.5 w-3.5 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MASK_THEMES.map((m) => (
          <SelectItem key={m.id} value={m.id} className="text-xs">
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
