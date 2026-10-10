import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseWorkbook, type Entry } from "@/lib/dashboard-data";
import { useI18n } from "@/lib/i18n";

export function Uploader({ onData }: { onData: (e: Entry[]) => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handle = async (file: File) => {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const entries = parseWorkbook(buf);
      onData(entries);
      toast.success(t("upload.loaded", { name: file.name }), {
        description: t("upload.parsed", { n: entries.length }),
      });
    } catch (err) {
      toast.error(t("upload.failed"), {
        description: err instanceof Error ? err.message : t("upload.unexpected"),
      });
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
        }}
      />
      <Button variant="outline" size="sm" disabled={loading} onClick={() => ref.current?.click()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {t("upload.button")}
      </Button>
    </>
  );
}
