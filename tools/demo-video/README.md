# Demo video pipeline

The 2-minute demo video is produced from a **real run of the app**. Nothing in it is mocked, and the waiting time is only sped up, with an on-screen label.

1. **`record.cjs`:** Playwright drives the running app at 1280×720:
   - the category view with the **Cola** demo mask
   - Ace's live multi-step run and a citation click
   - Pulse: the mask switched to **Pika** on camera, then a live social scan
   - the mask switched to **K-pop** live, then Ace's marketing brief and an **Approve** click

   It records video, logs step markers to `marks.json`, and saves the **real Gradium read-aloud audio** that the app fetched from `/api/tts`.

2. **`narration.json`:** the voice-over text. Each scene is synthesised with **Gradium** TTS (voice Emma, `POST /api/post/speech/tts`).
3. **`music.cjs`:** a 2-minute instrumental background track from **Gemini Lyria 3.5** (`model: "lyria-3.5"`, Interactions API).
4. **`edit.py`:** ffmpeg cuts the recording at the markers, speeds up waiting time (labelled "N× speed"), trims the live read-aloud at a sentence boundary, mixes the narration over the music, and burns in ASS subtitles.

Requirements: a running dev server (`bun run dev`), Chrome, `playwright-core` (set `PW_CORE_DIR` to its folder), and ffmpeg with libass (path in `ffpath.txt`). The sales data shown is synthetic, and every brand name on screen is masked.
