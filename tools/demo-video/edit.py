# Take 3 editor: hook title card, zooms, sped-up waits (labelled), Gradium
# narration + read-aloud, Lyria 3.5 music, burned-in ASS subtitles.
import json
import os
import re
import subprocess
import sys
import urllib.request

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
        print(r.stderr[-2500:])
        sys.exit(1)


def dur(path):
    return float(subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip())


def gradium(text, out):
    key = os.environ.get("GRADIUM_API_KEY")
    if not key:
        for line in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env"), encoding="utf-8"):
            if line.startswith("GRADIUM_API_KEY="):
                key = line.split("=", 1)[1].strip()
    body = json.dumps({"text": text, "voice_id": "YTpq7expH9539ERJ", "output_format": "wav", "only_audio": True}).encode()
    req = urllib.request.Request("https://api.gradium.ai/api/post/speech/tts", data=body, headers={"x-api-key": key, "Content-Type": "application/json"})
    raw = out.replace(".wav", ".raw.wav")
    open(raw, "wb").write(urllib.request.urlopen(req, timeout=60).read())
    run([FFMPEG, "-v", "error", "-y", "-i", raw, "-ar", "48000", "-ac", "1", out])


V = {k: dur(f"voice/{k}.wav") for k in narr}

# live read-aloud: the exact (masked) text the app sent to /api/tts, voiced by Gradium
live_text = data["tts"][0]["text"].strip() if data.get("tts") else ""
sents = re.split(r"(?<=[.!?])\s+", live_text)
keep = []
for x in sents:
    if keep and len(" ".join(keep + [x])) > 210:
        break
    keep.append(x)
BRIEF_TEXT = " ".join(keep)
gradium(BRIEF_TEXT, "voice/brief.wav")
BRIEF_D = dur("voice/brief.wav")

PANEL_ZOOM = "crop=853:480:427:40,scale=1280:720"
IMAGE_ZOOM = "crop=760:428:520:120,scale=1280:720"
TITLE_D = 4.0

# (name, src start, src end, target s, tag, narration key, extra filter)
parts = [
    ("p1", M["v1"] - 0.5, M["ace_open"], V["s1"] + 0.8, "Synthetic demo data · demo mask: Cola", "s1", None),
    ("p2", M["ace_open"], M["agent_done"], V["s2"] + 2.5, "Live agent run · {x} speed", "s2", None),
    ("p3a", M["agent_done"], M["cite"], (V["s3"] + 1.0) * 0.62, "The verdict, cited", "s3", PANEL_ZOOM),
    ("p3b", M["cite"], M["cite_done"], (V["s3"] + 1.0) * 0.38 + 1.0, "Citation -> exact row", None, None),
    ("p4a", M["v2"], M["scan_done"], 6.0, "Live social scan: Coke Zero vs Pepsi Zero vs Sprite Zero · {x} speed", "s4", None),
    ("p4b", M["scan_done"], M["tour_done"], max(V["s4"] - 6.0 + 1.5, 11.0), "Gemini + Google Search grounding", None, None),
    ("p5", M["tour_done"], M["ace2_done"], V["s5"] + 2.0, "Live agent run · {x} speed", "s5", None),
    ("p5b", M["ace2_done"], M["approve"], BRIEF_D + 0.8, "Gradium read-aloud (voice: Emma)", "brief", PANEL_ZOOM),
    ("p6", M["approve"], M["visual_ask"], V["s6"] + 2.0, "Human approval", "s6", None),
    ("p7a", M["visual_ask"], M["visual_approve"], 5.0, "Ace proposes a promo visual · {x} speed", "s7", None),
    ("p7b", M["visual_approve"], M["visual_shown"], 4.5, "Approved -> Nano Banana 2.1 · {x} speed", None, None),
    ("p7c", M["visual_shown"], M["end"], 7.5, "Nano Banana draft visual · generated via the app's /api/image", None, "IMAGE"),
]
CARD_D = V["s8"] + 1.5

os.makedirs("parts3", exist_ok=True)
files, timeline = [], []

# hook title card on a darkened dashboard frame
run([FFMPEG, "-v", "error", "-y", "-ss", f"{M['v1'] + 1:.2f}", "-i", RAW, "-frames:v", "1", "title_bg.png"])
run([FFMPEG, "-v", "error", "-y", "-loop", "1", "-t", f"{TITLE_D}", "-i", "title_bg.png", "-vf",
     "scale=1280:720,boxblur=6,eq=brightness=-0.5,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "parts3/title.mp4"])
files.append("parts3/title.mp4")
timeline.append((0.0, TITLE_D, "", None))
t = TITLE_D

for name, a, b, target, tag, key, extra in parts:
    if b <= a:
        continue
    factor = (b - a) / target
    label = tag.replace("{x}", f"{factor:.0f}×" if factor >= 1.5 else "1×")
    vf = f"setpts={1 / factor:.5f}*PTS,fps=30,scale=1280:720"
    if extra:
        vf += "," + extra
    out = f"parts3/{name}.mp4"
    if extra == "IMAGE":
        # the real Nano Banana output from /api/image for this proposal, slow zoom-in
        n = int(target * 30)
        run([FFMPEG, "-v", "error", "-y", "-i", "promo_test.png", "-vf",
             f"scale=2560:1440,zoompan=z='min(zoom+0.0006,1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s=1280x720:fps=30,format=yuv420p",
             "-frames:v", str(n), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", out])
        d = dur(out)
        files.append(out)
        timeline.append((t, t + d, tag, key))
        t += d
        continue
    run([FFMPEG, "-v", "error", "-y", "-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", RAW, "-vf", vf + ",format=yuv420p",
         "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", out])
    d = dur(out)
    files.append(out)
    timeline.append((t, t + d, label, key))
    t += d

run([FFMPEG, "-v", "error", "-y", "-ss", f"{M['scan_done'] + 3:.2f}", "-i", RAW, "-frames:v", "1", "card_bg.png"])
run([FFMPEG, "-v", "error", "-y", "-loop", "1", "-t", f"{CARD_D:.2f}", "-i", "card_bg.png", "-vf",
     "scale=1280:720,boxblur=10,eq=brightness=-0.45,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "parts3/card.mp4"])
files.append("parts3/card.mp4")
timeline.append((t, t + CARD_D, "", "s8"))
total = t + CARD_D

with open("parts3/list.txt", "w") as f:
    for p in files:
        f.write(f"file '{os.path.basename(p)}'\n")
run([FFMPEG, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "parts3/list.txt", "-c", "copy", "video3_noaudio.mp4"])


def ts(x):
    return f"{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}"


def chunks(text, maxlen=62):
    out, cur = [], ""
    for w in text.split():
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


NARR_OFFSET = 0.35
events = [("Hook", 0.15, TITLE_D - 0.1, r"The dashboard says sales crashed {\c&H6B6BFF&}−55%{\c&HFFFFFF&}.\N{\fs64}It's wrong.")]
for start, end, tag, key in timeline:
    if tag:
        events.append(("Tag", start + 0.15, end - 0.05, tag))
    if not key:
        continue
    text = BRIEF_TEXT if key == "brief" else narr[key]
    d = BRIEF_D if key == "brief" else V[key]
    cs = chunks(text)
    tot = sum(len(c) for c in cs)
    cur = start + NARR_OFFSET
    for c in cs:
        span = d * len(c) / tot
        events.append(("Brief" if key == "brief" else "Default", cur, cur + span, ("Ace: “" + c + "”") if key == "brief" else c))
        cur += span
card_start = timeline[-1][0]
events.append(("Title", card_start + 0.3, total - 0.2,
               r"CokeZerope Marketing\N{\fs26}Ace · an AI marketing analyst that checks, cites, and asks before it acts\N\N{\fs22}Gemini Interactions API · Google Search grounding · Deep Research · Nano Banana · Lyria\NGradium voice · Entire session capture\N\N{\fs24}github.com/Grace9393/cokezerope-marketing\N{\fs20}Built at Tech: Europe Agentic AI Hack Zürich · 10 Oct 2026 · synthetic sales data"))

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
Style: Hook,Arial,54,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,3,0,5,60,60,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for style, a, b, text in events:
    ass += f"Dialogue: 0,{ts(a)},{ts(b)},{style},,0,0,0,,{text}\n"
open("subs3.ass", "w", encoding="utf-8").write(ass)

inputs, filters, labels = [], [], []
idx = 0
for start, end, tag, key in timeline:
    if not key:
        continue
    inputs += ["-i", f"voice/{key}.wav"]
    delay = int((start + NARR_OFFSET) * 1000)
    filters.append(f"[{idx}:a]aresample=48000,adelay={delay}|{delay}[n{idx}]")
    labels.append(f"[n{idx}]")
    idx += 1
inputs += ["-i", "music.mp3"]
filters.append(f"[{idx}:a]aresample=48000,volume=0.14,afade=t=in:d=1.0,afade=t=out:st={total - 3:.2f}:d=3,atrim=0:{total:.2f}[m]")
labels.append("[m]")
filters.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{total:.2f}[aout]")
run([FFMPEG, "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "audio3.m4a"])
run([FFMPEG, "-v", "error", "-y", "-i", "video3_noaudio.mp4", "-i", "audio3.m4a", "-vf", "ass=subs3.ass", "-map", "0:v", "-map", "1:a",
     "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "copy", "-shortest", "cokezerope-marketing-demo-v3.mp4"])
print(f"done: {total:.1f}s")
for start, end, tag, key in timeline:
    print(f"{start:6.1f}-{end:6.1f} {key or '':6} {tag}".encode("ascii", "replace").decode())
