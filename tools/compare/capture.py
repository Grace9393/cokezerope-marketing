#!/usr/bin/env python3
"""Capture Ace's v2 and dashboard flows for one configured provider."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


QUESTION = "Why did AURUM GOLD move vs last year?"
COVERAGE_TERMS = re.compile(
    r"like[- ]for[- ]like|same months|partial[- ]year|coverage|\bYTD\b", re.IGNORECASE
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--provider", required=True, choices=("gemini", "openai"))
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--out", type=Path, default=Path("docs/compare"))
    parser.add_argument("--timeout", type=float, default=150, help="Timeout in seconds")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    report: dict[str, Any] = {"provider": args.provider, "base_url": args.base_url, "assertions": []}
    console_errors: list[str] = []
    page_errors: list[str] = []

    def record(name: str, passed: bool, reason: str) -> None:
        report["assertions"].append({"name": name, "status": "pass" if passed else "fail", "reason": reason})

    def check_flow(page: Any, flow: str, screenshot: Path, started: float) -> None:
        """Record brief, citations, proposal and toast checks on the current Ace run."""
        try:
            page.get_by_text("Findings", exact=True).last.wait_for(
                state="visible", timeout=max(1, int(args.timeout * 1000 - (time.monotonic() - started) * 1000))
            )
        except PlaywrightTimeoutError:
            pass

        # RunView prints the final brief headline as a bold paragraph. A done
        # run also removes the visible "Ace is working…" row.
        working = page.get_by_text("Ace is working…", exact=True)
        try:
            working.wait_for(state="hidden", timeout=max(1, int(args.timeout * 1000 - (time.monotonic() - started) * 1000)))
        except PlaywrightTimeoutError:
            pass

        findings_heading = page.get_by_text("Findings", exact=True).last
        has_findings = False
        headline = False
        cited = False
        try:
            findings_heading.wait_for(state="visible", timeout=1000)
            list_locator = findings_heading.locator("xpath=following-sibling::ul[1]")
            items = list_locator.locator(":scope > li")
            has_findings = items.count() > 0
            brief_card = findings_heading.locator("xpath=../..")
            headline = bool(brief_card.locator("p.font-semibold").count())
            # Citation chips are buttons in each finding; URLs from rendered
            # web evidence also count as citations.
            cited = list_locator.locator("button").count() > 0 or list_locator.get_by_role("link").count() > 0
        except Exception:
            pass
        record(f"{flow}: brief headline and finding", headline and has_findings,
               "Rendered brief headline and at least one finding" if headline and has_findings else "Brief headline or findings were not rendered")
        record(f"{flow}: cited findings", cited,
               "Finding contains an evidence chip or link" if cited else "No evidence chip or link was found in the findings")

        if flow == "v2":
            cards = page.locator("div.rounded-lg.border.p-3.text-sm")
            proposal_ok = False
            for i in range(cards.count()):
                card = cards.nth(i)
                if all(card.get_by_role("button", name=label, exact=True).count() for label in ("Approve", "Edit", "Reject")):
                    proposal_ok = True
                    break
            record("v2: proposal actions", proposal_ok,
                   "Proposal card has Approve, Edit and Reject" if proposal_ok else "No proposal card with all three actions")

        errors_visible = page.locator("[data-sonner-toast][data-type='error']").count() > 0
        record(f"{flow}: no error toast", not errors_visible,
               "No visible Sonner error toast" if not errors_visible else "An error toast is visible")
        try:
            page.screenshot(path=str(screenshot), full_page=True)
            report.setdefault("screenshots", []).append(str(screenshot))
        except Exception as exc:
            record(f"{flow}: screenshot saved", False, f"Screenshot failed: {exc}")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        # Pulse route forces English. Its mask selector offers Cola directly.
        start = time.monotonic()
        try:
            page.goto(f"{args.base_url.rstrip('/')}/v2", wait_until="networkidle", timeout=int(args.timeout * 1000))
            mask = page.get_by_role("combobox", name="Demo mask: replace brand names")
            if mask.count():
                mask.click()
                page.get_by_role("option", name=re.compile(r"Cola")).click()
            page.get_by_role("button", name="Run demo", exact=True).click()
            check_flow(page, "v2", args.out / f"v2-{args.provider}.png", start)
        except Exception as exc:
            record("v2: flow completed", False, f"Flow did not complete: {exc}")
            try:
                page.screenshot(path=str(args.out / f"v2-{args.provider}.png"), full_page=True)
                report.setdefault("screenshots", []).append(str(args.out / f"v2-{args.provider}.png"))
            except Exception:
                pass

        # Preserve the mask preference. Dashboard language is local-storage
        # controlled, so choose English through the app's language toggle.
        start = time.monotonic()
        try:
            page.goto(f"{args.base_url.rstrip('/')}/", wait_until="networkidle", timeout=int(args.timeout * 1000))
            # The i18n toggle displays "EN" while the page is in Chinese and
            # "中文" while it is already English.
            lang_button = page.get_by_role("button", name="EN", exact=True)
            if lang_button.count():
                lang_button.click()
            page.get_by_role("button", name="Ask Ace", exact=True).click()
            question_input = page.get_by_placeholder(re.compile(r"Ask about sales moves", re.IGNORECASE))
            question_input.fill(QUESTION)
            page.get_by_role("button", name="Ask", exact=True).click()
            # Completion is the brief appearing and the running indicator
            # disappearing; both reflect useAce's final stream status.
            try:
                page.get_by_text("Findings", exact=True).last.wait_for(
                    state="visible", timeout=int(args.timeout * 1000)
                )
            except PlaywrightTimeoutError:
                pass
            try:
                page.get_by_text("Ace is working…", exact=True).wait_for(state="hidden", timeout=1000)
            except PlaywrightTimeoutError:
                pass
            check_flow(page, "index", args.out / f"index-{args.provider}.png", start)
            findings_heading = page.get_by_text("Findings", exact=True).last
            brief_text = findings_heading.locator("xpath=../..").inner_text() if findings_heading.count() else ""
            body_text = brief_text
            coverage = bool(COVERAGE_TERMS.search(body_text))
            record("index: like-for-like or coverage context", coverage,
                   "Brief mentions comparable months, partial-year coverage or YTD" if coverage else "No like-for-like or coverage term appeared in the page text")
        except Exception as exc:
            record("index: flow completed", False, f"Flow did not complete: {exc}")
            try:
                page.screenshot(path=str(args.out / f"index-{args.provider}.png"), full_page=True)
                report.setdefault("screenshots", []).append(str(args.out / f"index-{args.provider}.png"))
            except Exception:
                pass

        record("browser: no console errors", not console_errors,
               "No console errors" if not console_errors else f"{len(console_errors)} console error(s); first: {console_errors[0][:300]}")
        record("browser: no page errors", not page_errors,
               "No uncaught page errors" if not page_errors else f"{len(page_errors)} page error(s); first: {page_errors[0][:300]}")
        report["console_errors"] = console_errors
        report["page_errors"] = page_errors
        browser.close()

    rendered = json.dumps(report, indent=2, ensure_ascii=False)
    print(rendered)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered + "\n", encoding="utf-8")
    return 1 if any(item["status"] == "fail" for item in report["assertions"]) else 0


if __name__ == "__main__":
    sys.exit(main())
