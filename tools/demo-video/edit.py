# Builds the 2-minute demo video: cuts the Playwright recording at its markers,
# speeds up waiting time (labelled on screen), adds Gradium narration, Lyria 3.5
# background music and burned-in subtitles.
import json
import os
import re
import subprocess
import sys

FF = open("ffpath.txt").read().strip()
FFMPEG = os.path.join(FF, "ffmpeg.exe")
FFPROBE = os.path.join(FF, "ffprobe.exe")
data = json.load(open("marks.json", encoding="utf-8"))
M = {m["name"]: m["t"] for m in data["marks"]}
RAW = data["videoPath"]
narr = json.load(open("narration.json", encoding="utf-8"))


def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-2000:])
        sys.exit(1)


def dur(path):
    return float(subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip())


V = {k: dur(f"voice/{k}.wav") for k in narr}

# ---- live Gradium read-aloud captured during the recording: keep the first
# sentences (about 12 s) so the clip ends on a sentence boundary.
live = data["tts"][0]
if not os.path.exists(live["file"]) or os.path.getsize(live["file"]) < 1000:
    # Playwright can't always read the streamed audio body: re-synthesise the
    # exact text the app sent, with the same Gradium voice (Emma).
    import urllib.request

    key = os.environ.get("GRADIUM_API_KEY")
    if not key:
        for line in open(os.path.join(os.path.dirname(__file__), "..", "..", ".env"), encoding="utf-8"):
            if line.startswith("GRADIUM_API_KEY="):
                key = line.split("=", 1)[1].strip()
    body = json.dumps({"text": live["text"], "voice_id": "YTpq7expH9539ERJ", "output_format": "wav", "only_audio": True}).encode()
    req = urllib.request.Request("https://api.gradium.ai/api/post/speech/tts", data=body,
                                 headers={"x-api-key": key, "Content-Type": "application/json"})
    raw_path = live["file"].replace(".wav", ".raw.wav")
    open(raw_path, "wb").write(urllib.request.urlopen(req, timeout=60).read())
    run([FFMPEG, "-v", "error", "-y", "-i", raw_path, "-ar", "48000", "-ac", "1", live["file"]])
FULL_D = dur(live["file"])
sents = re.split(r"(?<=[.!?])\s+", live["text"].strip())
keep, chars, total_chars = [], 0, len(live["text"].strip())
for x in sents:
    if keep and FULL_D * (chars + len(x)) / total_chars > 12.5:
        break
    keep.append(x)
    chars += len(x) + 1
BRIEF_TEXT = " ".join(keep)
BRIEF_D = min(FULL_D, FULL_D * chars / total_chars + 0.25)
run([FFMPEG, "-v", "error", "-y", "-i", live["file"], "-t", f"{BRIEF_D:.2f}", "-af",
     f"afade=t=out:st={max(0, BRIEF_D - 0.4):.2f}:d=0.4", "-ar", "48000", "-ac", "1", "voice/brief.wav"])
open("voice/brief.txt", "w", encoding="utf-8").write(BRIEF_TEXT)

# (part name, src start, src end, target seconds, tag, narration key or None)
parts = [
    ("p1", M["v1"] - 0.5, M["ace_open"], V["s1"] + 0.9, "Category view · demo mask: Cola · synthetic data", "s1"),
    ("p2", M["ace_open"], M["agent_done"], V["s2"] + 1.0, "Live agent run · {x} speed", "s2"),
    ("p3", M["agent_done"], M["cite_done"], V["s3"] + 0.8, "Cited brief -> click to the row", "s3"),
    ("p4a", M["v2"], M["scan_start"], V["s4a"] + 0.6, "Demo mask: Cola -> Pika", "s4a"),
    ("p4b", M["scan_start"], M["scan_done"], 4.0, "Live social scan · {x} speed", "s4b"),
    ("p4c", M["scan_done"], M["tour_done"], max(V["s4b"] - 4.0 + 1.5, 12.0), "Pulse · switched live to K-pop", None),
    ("p5", M["tour_done"], M["ace2_done"], V["s5"] + 0.6, "Live agent run · {x} speed", "s5"),
    ("p5b", M["ace2_done"], M["approve"], BRIEF_D + 0.8, "Gradium read-aloud (voice: Emma)", "brief"),
    ("p6", M["approve"], M["end"], V["s6"] + 1.2, "Human approval", "s6"),
]
CARD_D = V["s7"] + 1.5

os.makedirs("parts", exist_ok=True)
timeline = []  # (start, end, tag, narration key)
t = 0.0
files = []
for name, a, b, target, tag, key in parts:
    raw_len = b - a
    factor = raw_len / target
    label = tag.replace("{x}", f"{factor:.0f}×" if factor >= 1.5 else "1×")
    out = f"parts/{name}.mp4"
    run([FFMPEG, "-v", "error", "-y", "-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", RAW,
         "-vf", f"setpts={1 / factor:.5f}*PTS,fps=30,scale=1280:720,format=yuv420p",
         "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", out])
    d = dur(out)
    timeline.append((t, t + d, label, key))
    files.append(out)
    t += d

# end card on a dimmed screenshot of the app
# card background + README screenshot: a frame of Pulse after the live K-pop switch
run([FFMPEG, "-v", "error", "-y", "-ss", f"{M['switch_kpop'] + 4.5:.2f}", "-i", RAW, "-frames:v", "1", "card_bg.png"])
run([FFMPEG, "-v", "error", "-y", "-loop", "1", "-t", f"{CARD_D:.2f}", "-i", "card_bg.png",
     "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=10,eq=brightness=-0.45,fps=30,format=yuv420p",
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "parts/card.mp4"])
timeline.append((t, t + CARD_D, "", "s7"))
files.append("parts/card.mp4")
total = t + CARD_D

with open("parts/list.txt", "w") as f:
    for p in files:
        f.write(f"file '{os.path.basename(p)}'\n")
run([FFMPEG, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "parts/list.txt", "-c", "copy", "video_noaudio.mp4"])


# ---------- subtitles (ASS) ----------
def ts(x):
    h = int(x // 3600)
    m = int(x % 3600 // 60)
    s = x % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def chunks(text, maxlen=62):
    words, out, cur = text.split(), [], ""
    for w in words:
        nxt = (cur + " " + w).strip()
        if len(nxt) > maxlen and cur:
            out.append(cur)
            cur = w
        else:
            cur = nxt
        if re.search(r"[.:!?]$", w) and len(cur) > 25:
            out.append(cur)
            cur = ""
    if cur:
        out.append(cur)
    return out


brief_text = BRIEF_TEXT
events = []
NARR_OFFSET = 0.4
for start, end, tag, key in timeline:
    if tag:
        events.append(("Tag", start + 0.2, end - 0.1, tag))
    if not key:
        continue
    text = brief_text if key == "brief" else narr[key]
    d = BRIEF_D if key == "brief" else V[key]
    cs = chunks(text)
    total_chars = sum(len(c) for c in cs)
    cur = start + NARR_OFFSET
    for c in cs:
        span = d * len(c) / total_chars
        line = ("Ace: “" + c + "”") if key == "brief" else c
        events.append(("Brief" if key == "brief" else "Default", cur, cur + span, line))
        cur += span

card_start = timeline[-1][0]
events.append(("Title", card_start + 0.3, total - 0.2,
               r"CokeZerope Marketing\N{\fs26}Gemini Interactions API · Deep Research · Google Search grounding\NGradium voice · Entire session capture\N\N{\fs24}github.com/Grace9393/cokezerope-marketing\N{\fs20}Built at Tech: Europe Agentic AI Hack Zürich · 10 Oct 2026 · synthetic demo data"))
events.append(("Tag", 0.2, 4.0, "CokeZerope Marketing · Tech: Europe Agentic AI Hack Zürich"))

ass = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,30,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,1,0,0,0,100,100,0,0,3,10,0,2,80,80,34,1
Style: Brief,Arial,27,&H00B0F5FF,&H000000FF,&H00000000,&H90000000,0,1,0,0,100,100,0,0,3,10,0,2,80,80,34,1
Style: Tag,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&HB0C04000,1,0,0,0,100,100,0,0,3,6,0,9,30,30,18,1
Style: Title,Arial,46,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,2,0,5,60,60,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for style, a, b, text in events:
    ass += f"Dialogue: 0,{ts(a)},{ts(b)},{style},,0,0,0,,{text}\n"
open("subs.ass", "w", encoding="utf-8").write(ass)

# ---------- audio: narration + brief voice + Lyria music ----------
inputs, filters, labels = [], [], []
idx = 0
for start, end, tag, key in timeline:
    if not key:
        continue
    inputs += ["-i", f"voice/{key}.wav"]
    delay = int((start + NARR_OFFSET) * 1000)
    filters.append(f"[{idx}:a]aresample=48000,adelay={delay}|{delay},volume=1.0[n{idx}]")
    labels.append(f"[n{idx}]")
    idx += 1
inputs += ["-i", "music.mp3"]
filters.append(f"[{idx}:a]aresample=48000,volume=0.13,afade=t=in:d=1.5,afade=t=out:st={total - 3:.2f}:d=3,atrim=0:{total:.2f}[m]")
labels.append("[m]")
filters.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{total:.2f}[aout]")
run([FFMPEG, "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "audio.m4a"])

# ---------- final mux with burned subtitles ----------
run([FFMPEG, "-v", "error", "-y", "-i", "video_noaudio.mp4", "-i", "audio.m4a", "-vf", "ass=subs.ass",
     "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "copy", "-shortest",
     "cokezerope-marketing-demo.mp4"])
print(f"done: {total:.1f}s")
for start, end, tag, key in timeline:
    print(f"{start:6.1f}-{end:6.1f}  {key or '':6} {tag}".encode("ascii", "replace").decode())
