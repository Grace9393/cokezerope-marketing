"""Generate the fully synthetic demo sales dataset (src/data/snapshot.json).

Nothing here is derived from real sales data. The brand ("Maison Aurelle"),
its product lines and every number are invented: seeded random noise on top
of a designed seasonality curve and per-line growth stories. The 2026 year is
deliberately incomplete (sales value Jan-May plus a partial June; units run all
year like a forecast), so a naive full-year YoY looks like a crash while the
like-for-like comparison tells the real story. That's the trap Ace catches.

Run:  python tools/synthetic-data/generate.py
"""

import json
import random
from pathlib import Path

random.seed(20261010)
YEARS = [2022, 2023, 2024, 2025, 2026]
# Spring launch peak in March, anniversary-sale (週年慶) peak in Oct/Nov.
SEASON = [0.07, 0.06, 0.10, 0.08, 0.07, 0.05, 0.05, 0.05, 0.09, 0.17, 0.13, 0.08]
JUNE_PARTIAL = 0.09  # June 2026 only partly loaded

# category -> [(product, base 2022 annual value TWD, unit price TWD, growth 2023..2026)]
LINES = {
    "AURUM GOLD": [
        ("Cushion Foundation", 1_700_000, 2450, [0.35, 0.18, -0.12, 2.90]),
        ("A/Gold Skin Glow", 7_200_000, 2950, [0.40, 0.12, -0.06, 0.14]),
        ("Primer", 5_400_000, 2250, [0.55, 0.08, -0.10, -0.08]),
        ("Silk Veil", 4_600_000, 2650, [0.28, 0.04, -0.08, -0.42]),
        ("Compact Foundation", 3_100_000, 2350, [0.18, 0.00, -0.06, 0.02]),
        ("Face Primer", 1_100_000, 1950, [0.35, 0.25, 0.08, 0.68]),
        ("Loose Powder", 1_500_000, 2150, [0.10, -0.02, -0.10, -0.28]),
        ("A/Gold Skin Matte", 1_300_000, 2950, [0.02, -0.12, -0.15, -0.33]),
        ("Miscellaneous Make-up", 600_000, 950, [0.05, 0.05, -0.05, -0.20]),
    ],
    "Stellaria Face": [
        ("Stellaria Pearls", 4_200_000, 2550, [0.10, 0.06, -0.04, -0.08]),
        ("Stellaria Powder", 2_100_000, 2350, [0.08, 0.02, -0.06, -0.12]),
        ("Stellaria Primer", 1_000_000, 2050, [0.15, 0.10, 0.02, 0.05]),
        ("Stellaria Base", 800_000, 2150, [0.05, -0.04, -0.08, -0.15]),
        ("Stellaria Highlighter", 600_000, 1850, [0.30, 0.20, 0.10, 0.22]),
    ],
    "SOLEIL": [
        ("Soleil Bronzer", 2_600_000, 2100, [0.12, 0.05, -0.05, -0.10]),
        ("Soleil Blush", 900_000, 1750, [0.20, 0.15, 0.05, 0.12]),
        ("Soleil Primer", 400_000, 1650, [0.05, 0.00, -0.10, -0.18]),
        ("Soleil Powder", 700_000, 1950, [0.08, 0.02, -0.04, -0.06]),
    ],
    "Lip": [
        ("Rouge A", 3_200_000, 1450, [0.10, 0.05, -0.03, -0.05]),
        ("Rouge A Plus", 150_000, 3200, [0.20, 0.30, 0.15, 0.42]),
        ("Kiss Lab Glow", 1_200_000, 1150, [0.25, 0.10, -0.05, -0.12]),
        ("Kiss Lab Plump", 800_000, 1250, [0.30, 0.15, 0.02, 0.18]),
        ("Kiss Lab Lipstick", 1_000_000, 1150, [0.00, -0.05, -0.10, -0.20]),
        ("Kiss Lab Gloss", 500_000, 1050, [0.05, 0.00, -0.08, -0.15]),
        ("Kiss Lab Matte", 600_000, 1150, [0.10, 0.05, -0.05, -0.10]),
        ("Kiss Lab Satin", 500_000, 1150, [0.02, -0.05, -0.10, -0.25]),
        ("Kiss Lab Shine", 400_000, 1150, [0.40, 0.10, -0.20, -0.86]),
        ("Collector", 300_000, 1350, [0.15, 0.10, 0.05, 0.10]),
    ],
    "EYE": [
        ("Lash Volume Mascara", 1_000_000, 1150, [0.05, 0.00, -0.05, -0.10]),
        ("Brow Liner", 400_000, 950, [0.10, 0.05, 0.00, 0.05]),
        ("Eye Palette", 600_000, 2050, [0.15, -0.05, -0.10, -0.22]),
        ("Eye Liner", 300_000, 950, [0.05, 0.05, 0.02, 0.08]),
        ("Eye Primer", 200_000, 1250, [0.10, 0.10, 0.05, 0.12]),
    ],
    "OTHER": [
        ("Brushes", 300_000, 1350, [0.05, 0.05, 0.00, -0.05]),
        ("Gift Sets", 800_000, 3450, [0.20, 0.10, -0.05, 0.02]),
        ("Sponges & Puffs", 120_000, 450, [0.10, 0.10, 0.05, 0.10]),
        ("Testers & Samples", 90_000, 150, [0.00, 0.00, 0.00, 0.00]),
    ],
}


def noise(sd=0.07):
    return max(0.6, random.gauss(1.0, sd))


def product_metrics(base, price, growth):
    value, qty = {}, {}
    annual = base
    for i, y in enumerate(YEARS):
        if i > 0:
            annual *= 1 + growth[i - 1]
        # 2026 hero lines show some price dilution (deeper promos / bundles)
        p = price * (0.86 if y == 2026 and growth[-1] > 0.5 else 1.0)
        vm, qm = [], []
        for m in range(12):
            v = annual * SEASON[m] * noise()
            q = v / (p * noise(0.03))
            if y == 2026:
                if m == 5:
                    v *= JUNE_PARTIAL  # June partly loaded
                elif m > 5:
                    v = 0.0  # value not loaded yet; units below are the plan
            vm.append(round(v, 0))
            qm.append(round(q, 2))
        value[y], qty[y] = vm, qm
    return value, qty


def pack(value, qty):
    metrics = {"qty": {}, "value": {}, "factor": {}}
    for y in YEARS:
        v, q = value[y], qty[y]
        metrics["value"][str(y)] = {"months": v, "total": round(sum(v), 0)}
        metrics["qty"][str(y)] = {"months": q, "total": round(sum(q), 2)}
        f = [round(v[m] / q[m], 2) if q[m] else None for m in range(12)]
        tq = sum(q)
        metrics["factor"][str(y)] = {"months": f, "total": round(sum(v) / tq, 2) if tq else None}
    return metrics


def add(acc, value, qty):
    for y in YEARS:
        av, aq = acc.setdefault(y, ([0.0] * 12, [0.0] * 12))
        for m in range(12):
            av[m] += value[y][m]
            aq[m] += qty[y][m]


entries = []
grand = {}
for cat, products in LINES.items():
    cat_acc = {}
    rows = []
    for name, base, price, growth in products:
        v, q = product_metrics(base, price, growth)
        add(cat_acc, v, q)
        add(grand, v, q)
        rows.append({"category": cat, "brand": name, "isCategoryTotal": False, "metrics": pack(v, q)})
    cv = {y: [round(x, 0) for x in cat_acc[y][0]] for y in YEARS}
    cq = {y: [round(x, 2) for x in cat_acc[y][1]] for y in YEARS}
    entries.append({"category": cat, "brand": cat, "isCategoryTotal": True, "metrics": pack(cv, cq)})
    entries.extend(rows)

gv = {y: [round(x, 0) for x in grand[y][0]] for y in YEARS}
gq = {y: [round(x, 2) for x in grand[y][1]] for y in YEARS}
entries.insert(0, {"category": "All", "brand": "All Make-up", "isCategoryTotal": True, "metrics": pack(gv, gq)})

out = Path(__file__).resolve().parents[2] / "src" / "data" / "snapshot.json"
out.write_text(json.dumps(entries, ensure_ascii=False), encoding="utf-8")


# ---- print the story the demo relies on ----
def ytd(e, y, n=6):
    return sum(e["metrics"]["value"][str(y)]["months"][:n])


def find(cat, brand=None):
    for e in entries:
        if e["category"] == cat and (e["brand"] == (brand or cat) or (brand is None and e["isCategoryTotal"])):
            return e
    raise KeyError(cat)


hero = find("AURUM GOLD")
fy = hero["metrics"]["value"]
print(f"wrote {out} ({len(entries)} entries)")
print(f"AURUM GOLD full-year 2026 vs 2025: {fy['2026']['total'] / fy['2025']['total'] - 1:+.1%}")
print(f"AURUM GOLD like-for-like Jan-Jun:   {ytd(hero, 2026) / ytd(hero, 2025) - 1:+.1%}")
for b in ["Cushion Foundation", "Silk Veil", "Primer", "Face Primer"]:
    e = find("AURUM GOLD", b)
    print(f"  {b:<20} like-for-like Jan-Jun: {ytd(e, 2026) / ytd(e, 2025) - 1:+.1%}")
allv = entries[0]["metrics"]["value"]
print(f"All make-up full-year 2026 vs 2025: {allv['2026']['total'] / allv['2025']['total'] - 1:+.1%}")
