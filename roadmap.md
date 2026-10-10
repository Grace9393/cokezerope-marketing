# Roadmap

- [x] ~~Reconnect Firecrawl in new workspace~~ → replaced by Gemini-only scraping (URL context + Google Search fallback)
- [x] AI analyst "Ace" (Gemini 3.8 Flash tool loop, Flash-Lite router, dashboard data as tools, cited rows)
- [x] Like-for-like YTD comparisons + partial-month / value-vs-units data-gap flags
- [x] Competitor screenshot input (Gemini image understanding)
- [x] "Deep research" button (Gemini Deep Research, cited report) on competitor card and category drill-down
- [x] "Read aloud" (Gradium TTS for EN/DE/FR, Gemini TTS for 中文) + push-to-talk (Gradium / Gemini transcribe)
- [x] Human approval step: Approve / Edit / Reject for watchlist, export brief, email draft, price-gap alert, promo visual
- [x] Activity log (exportable Markdown)
- [x] Draft promo visual (Nano Banana 2.1), only after Approve
- [x] Run demo button, header badge, mobile layout check (375 px)
- [x] POC v2 `/v2` Marketing Pulse: social listening (Gemini + Google Search) + competitive analysis + Ace marketing mode (EN, Gradium voice)
- [ ] v2: scheduled re-scans and alerting on negative-sentiment spikes (Social Pulse keyword rules)
- [ ] Gemini + Gradium keys stored as Lovable project secrets, server-only (GEMINI_API_KEY, GRADIUM_API_KEY) — set when connecting to Lovable
- [ ] Connect repo to GitHub (Grace9393) and Lovable
- [ ] Persist watchlist / activity server-side (today: browser localStorage)
