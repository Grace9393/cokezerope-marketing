# Demo video pipeline

The 107-second demo video is produced from a **real run of the app**. Nothing in it is mocked, and the waiting time is only sped up, with an on-screen label.

1. **`record.cjs`:** Playwright drives the running app at 1280×720:
   - the category view with the **Cola** demo mask
   - Ace's live multi-step run and a citation click
   - Pulse: a live Coke Zero vs Pepsi Zero vs Sprite Zero social scan
   - Ace's marketing brief (Run demo) and an **Approve** click
   - Ace proposes a counter-promo visual; **Nano Banana** only runs after Approve (`promo_test.png`, the `/api/image` output for that proposal, is shown with a slow zoom)

   It records video, logs step markers to `marks.json`, and saves the **real Gradium read-aloud audio** that the app fetched from `/api/tts`.

2. **`narration.json`:** the voice-over text. Each scene is synthesised with **Gradium** TTS (voice Emma, `POST /api/post/speech/tts`).
3. **`music.cjs`:** a 2-minute instrumental background track from **Gemini Lyria 3.5** (`model: "lyria-3.5"`, Interactions API).
4. **`edit.py`:** ffmpeg adds a hook title card, zooms into the verdict and the visual, cuts the recording at the markers, speeds up waiting time (labelled "N× speed"), re-voices the live read-aloud text with Gradium (trimmed at a sentence boundary), mixes the narration over the music, and burns in ASS subtitles.

Requirements: a running dev server (`bun run dev`), Chrome, `playwright-core` (set `PW_CORE_DIR` to its folder), and ffmpeg with libass (path in `ffpath.txt`). The sales data shown is synthetic, and every brand name on screen is masked.
