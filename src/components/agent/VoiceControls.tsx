import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Loader2, Volume2, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { VOICES, defaultVoice, type VoiceLang } from "@/lib/ai/voices";

/* ---------- voice preferences ---------- */

export function useVoicePrefs(uiLang: "en" | "zh") {
  const [lang, setLangState] = useState<VoiceLang>(uiLang);
  const [voiceId, setVoiceId] = useState<string>(defaultVoice(uiLang));
  const touched = useRef(false);
  // Follow the UI language until the user picks a voice language explicitly.
  useEffect(() => {
    if (!touched.current) {
      setLangState(uiLang);
      setVoiceId(defaultVoice(uiLang));
    }
  }, [uiLang]);
  const setLang = (l: VoiceLang) => {
    touched.current = true;
    setLangState(l);
    setVoiceId(defaultVoice(l));
  };
  return { lang, setLang, voiceId, setVoiceId };
}
export type VoicePrefs = ReturnType<typeof useVoicePrefs>;

const LANG_LABEL: Record<VoiceLang, string> = { en: "EN", de: "DE", fr: "FR", zh: "中文" };

export function VoiceBar({ prefs }: { prefs: VoicePrefs }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <Select value={prefs.lang} onValueChange={(v) => prefs.setLang(v as VoiceLang)}>
        <SelectTrigger className="h-7 w-[72px] text-xs" aria-label={t("voice.lang")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LANG_LABEL) as VoiceLang[]).map((l) => (
            <SelectItem key={l} value={l} className="text-xs">
              {LANG_LABEL[l]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={prefs.voiceId} onValueChange={prefs.setVoiceId}>
        <SelectTrigger className="h-7 w-[110px] text-xs" aria-label={t("voice.voice")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VOICES[prefs.lang].map((v) => (
            <SelectItem key={v.id} value={v.id} className="text-xs">
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="ml-auto">{t("voice.credit")}</span>
    </div>
  );
}

/* ---------- push-to-talk → 24 kHz 16-bit mono WAV ---------- */

const SAMPLE_RATE = 24000;

function encodeWav(chunks: Float32Array[], rate: number): Blob {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new ArrayBuffer(44 + length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) =>
    [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, "RIFF");
  v.setUint32(4, 36 + length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, length * 2, true);
  let o = 44;
  for (const c of chunks)
    for (let i = 0; i < c.length; i++, o += 2) {
      const s = Math.max(-1, Math.min(1, c[i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  return new Blob([buf], { type: "audio/wav" });
}

/** Linear resample when the browser ignores the requested AudioContext rate. */
function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, input.length - 1);
    out[i] = input[i0] + (input[i1] - input[i0]) * (x - i0);
  }
  return out;
}

export function MicButton({
  lang,
  vocabulary,
  onTranscript,
  disabled,
}: {
  lang: VoiceLang;
  vocabulary: string[];
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const rec = useRef<{
    ctx: AudioContext;
    stream: MediaStream;
    node: ScriptProcessorNode;
    chunks: Float32Array[];
  } | null>(null);

  const start = async () => {
    if (state !== "idle" || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const src = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      src.connect(node);
      node.connect(ctx.destination);
      rec.current = { ctx, stream, node, chunks };
      setState("recording");
    } catch {
      toast.error(t("voice.micDenied"));
    }
  };

  const stop = async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    r.node.disconnect();
    r.stream.getTracks().forEach((tr) => tr.stop());
    const rate = r.ctx.sampleRate;
    await r.ctx.close();
    const merged = new Float32Array(r.chunks.reduce((n, c) => n + c.length, 0));
    let o = 0;
    for (const c of r.chunks) {
      merged.set(c, o);
      o += c.length;
    }
    if (merged.length < rate * 0.4) {
      setState("idle");
      return;
    }
    const wav = encodeWav([resample(merged, rate, SAMPLE_RATE)], SAMPLE_RATE);
    setState("transcribing");
    try {
      const vocab = encodeURIComponent(vocabulary.slice(0, 60).join(","));
      const res = await fetch(`/api/stt?lang=${lang}&vocab=${vocab}`, {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wav,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      if (j.text) onTranscript(j.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setState("idle");
    }
  };

  const label =
    state === "recording"
      ? t("voice.listening")
      : state === "transcribing"
        ? t("voice.transcribing")
        : t("voice.mic");
  return (
    <Button
      type="button"
      size="icon"
      variant={state === "recording" ? "destructive" : "outline"}
      className={cn("h-8 w-8 touch-none select-none", state === "recording" && "animate-pulse")}
      title={label}
      aria-label={label}
      disabled={disabled || state === "transcribing"}
      onPointerDown={(e) => {
        e.preventDefault();
        void start();
      }}
      onPointerUp={() => void stop()}
      onPointerLeave={() => state === "recording" && void stop()}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) void start();
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") void stop();
      }}
    >
      {state === "transcribing" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}

/* ---------- read aloud ---------- */

let currentAudio: HTMLAudioElement | null = null;
const autoPlayed = new Set<number>();

export async function playSummary(
  text: string,
  sourceLang: "en" | "zh",
  prefs: { lang: VoiceLang; voiceId: string },
) {
  currentAudio?.pause();
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang: prefs.lang, sourceLang, voiceId: prefs.voiceId }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
  return audio;
}

export function ReadAloudButton({
  text,
  sourceLang,
  prefs,
  autoPlayNonce,
}: {
  text: string;
  sourceLang: "en" | "zh";
  prefs: VoicePrefs;
  /** Bump to start playback programmatically (demo mode). */
  autoPlayNonce?: number;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = async () => {
    if (!text) return;
    setState("loading");
    try {
      const a = await playSummary(text, sourceLang, prefs);
      audioRef.current = a;
      setState("playing");
      a.addEventListener("ended", () => setState("idle"));
      a.addEventListener("pause", () => setState("idle"));
    } catch (e) {
      setState("idle");
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    // Auto-play once per demo nonce (survives StrictMode double effects / remounts).
    if (autoPlayNonce && !autoPlayed.has(autoPlayNonce)) {
      autoPlayed.add(autoPlayNonce);
      void play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayNonce]);

  const stop = () => {
    audioRef.current?.pause();
    setState("idle");
  };

  return state === "playing" ? (
    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={stop}>
      <Square className="mr-1 h-3 w-3" /> {t("voice.stop")}
    </Button>
  ) : (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      onClick={play}
      disabled={state === "loading" || !text}
    >
      {state === "loading" ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <Volume2 className="mr-1 h-3 w-3" />
      )}
      {t("voice.readAloud")} · {prefs.lang.toUpperCase()}
    </Button>
  );
}
