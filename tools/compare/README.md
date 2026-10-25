# Ace provider comparison

Start the dev server once with `AI_PROVIDER=openai`, then again with `AI_PROVIDER=gemini` (the default). Set it in `.env`: in dev, a shell variable is not picked up.

```powershell
# .env: AI_PROVIDER=openai
node node_modules/vite/bin/vite.js dev --port 8080
# Stop the server, change .env to AI_PROVIDER=gemini, then:
node node_modules/vite/bin/vite.js dev --port 8080
```

Both providers need paid API access for a full run: OpenAI API credit (ChatGPT plan credits do not apply), and a Gemini project with billing (the free tier returns 429 for this agent's model and Google Search grounding).

For each server run, capture its UI flows, then compose the v2 screenshots:

```powershell
python tools/compare/capture.py --provider openai
python tools/compare/capture.py --provider gemini
python tools/compare/compose.py
```

The provider keys come from the git-ignored `.env` when the dev server starts. These scripts never read `.env` or inspect environment variables; `--provider` only names the output files and report.
