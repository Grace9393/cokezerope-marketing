#!/usr/bin/env python3
"""Compose Gemini and OpenAI Ace screenshots into a labeled comparison."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "src/lib/ai/models.ts"


def read_model_ids() -> tuple[str, str]:
    source = MODELS.read_text(encoding="utf-8")
    gemini = re.search(r"export\s+const\s+MODELS\s*=\s*\{.*?\bagent:\s*['\"]([^'\"]+)", source, re.S)
    openai = re.search(r"export\s+const\s+OPENAI_MODELS\s*=\s*\{.*?\bagent:\s*['\"]([^'\"]+)", source, re.S)
    if not gemini or not openai:
        raise ValueError("Could not find MODELS.agent and OPENAI_MODELS.agent in models.ts")
    return gemini.group(1), openai.group(1)


def title_case_model(model: str, prefix: str = "") -> str:
    # Preserve version punctuation while title-casing ordinary words.
    words = model.split("-")
    if words and words[0].lower() == "gpt":
        version = words[1] if len(words) > 1 else ""
        tail = " ".join(word[:1].upper() + word[1:] for word in words[2:])
        return f"{prefix}GPT-{version}{(' ' + tail) if tail else ''}"
    formatted = " ".join(word.upper() if word.lower() == "gpt" else word[:1].upper() + word[1:] for word in words)
    return f"{prefix}{formatted}"


def font(size: int) -> ImageFont.ImageFont:
    for candidate in (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dir", nargs="?", type=Path, default=Path("docs/compare"))
    args = parser.parse_args()
    directory: Path = args.dir
    left_path = directory / "v2-gemini.png"
    right_path = directory / "v2-openai.png"
    gemini_model, openai_model = read_model_ids()
    labels = (title_case_model(gemini_model), title_case_model(openai_model, "OpenAI "))

    left = Image.open(left_path).convert("RGB")
    right = Image.open(right_path).convert("RGB")
    column_width = 1190
    gutter = 20
    label_height = 58
    left = left.resize((column_width, round(left.height * column_width / left.width)), Image.Resampling.LANCZOS)
    right = right.resize((column_width, round(right.height * column_width / right.width)), Image.Resampling.LANCZOS)
    image_height = max(left.height, right.height)
    canvas = Image.new("RGB", (column_width * 2 + gutter, label_height + image_height), "white")
    draw = ImageDraw.Draw(canvas)
    label_font = font(24)
    draw.text((14, 14), labels[0], fill="#202124", font=label_font)
    draw.text((column_width + gutter + 14, 14), labels[1], fill="#202124", font=label_font)
    canvas.paste(left, (0, label_height))
    canvas.paste(right, (column_width + gutter, label_height))
    output = directory / "gemini-vs-openai.png"
    canvas.save(output)
    print(output)


if __name__ == "__main__":
    main()
