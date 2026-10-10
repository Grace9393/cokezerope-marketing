# Submission checklist: {Tech: Europe} Agentic AI Hack Zürich, 10 Oct 2026

Deadline: submit by **19:00 CEST** (the dashboard shows 19:10). Competition opt-in closes 19:45. Live demos at 21:00.

| #   | Hard requirement                                            | Status | Evidence                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Project created at the hackathon (boilerplate allowed)      | ✅     | Built on 10 Oct 2026. The public history starts today, and the private build timeline is in `docs/BUILD_LOG.md`. The boilerplate dashboard shell is disclosed in the README. The demo data is synthetic.                                          |
| 2   | At least 2 partner technologies                             | ✅ (3) | **Gemini:** Interactions API agent loop, Google Search grounding, URL context, Deep Research managed agent, TTS/STT, Nano Banana, Lyria. **Gradium:** TTS and ASR. **Entire:** CLI enabled in the repo (`.entire/`), repo onboarded on entire.io. |
| 3   | Team of 5 max                                               | ✅     | Solo (team CokeZer0pe), captain checked in                                                                                                                                                                                                        |
| 4   | Public GitHub repo with full source                         | ✅     | https://github.com/Grace9393/cokezerope-marketing                                                                                                                                                                                                 |
| 5   | README with setup, APIs, frameworks, tools, technical depth | ✅     | `README.md`, `docs/TECHNICAL.md`                                                                                                                                                                                                                  |
| 6   | 2-minute video demo                                         | ☐      | YouTube URL: `<add after upload>`. Description: `docs/YOUTUBE_DESCRIPTION.md`                                                                                                                                                                     |

Before submitting:

- [x] No secrets in the public history (`git log -p | grep -E "AIza|gsk_"` is empty)
- [x] Fresh clone → `bun install` → `cp .env.example .env` → add keys → `bun run dev` works
- [x] Demo video recorded on synthetic data with the demo mask on (≤ 2:00)
- [ ] Upload the video to YouTube, paste the description, and add the link to `README.md` and this file
- [ ] Submit the repo URL and video URL on the hackathon dashboard before 19:00
- [ ] Opt in to the competition before 19:45
