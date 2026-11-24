from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "img" / "share.png"
FONT_UI = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_SERIF = Path(r"C:\Windows\Fonts\georgia.ttf")
FONT_MONO = Path(r"C:\Windows\Fonts\consola.ttf")

BG = "#070a0f"
SURFACE = "#0d131c"
TEXT = "#f3f5f2"
MUTED = "#9aa5b2"
FAINT = "#6f7b8b"
ACCENT = "#d7b46a"
POSITIVE = "#66d7aa"
LINE = "#222b36"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def draw_cairn(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float) -> None:
    def points(values: list[tuple[float, float]]) -> list[tuple[float, float]]:
        return [(x + px * scale, y + py * scale) for px, py in values]

    stones = [
        [(0, 0), (18, -34), (36, 0)],
        [(-18, 5), (50, 5), (61, 38), (-29, 38)],
        [(-14, 45), (54, 45), (68, 80), (-28, 80)],
    ]
    for index, stone in enumerate(stones):
        fill = (215, 180, 106, 44) if index == 2 else None
        draw.polygon(points(stone), outline=ACCENT, fill=fill, width=3)


def main() -> None:
    results = json.loads((ROOT / "assets" / "data" / "results.json").read_text(encoding="utf-8"))
    history_path = ROOT / "assets" / "data" / "performance_history.csv"
    rows = []
    if history_path.exists():
        lines = history_path.read_text(encoding="utf-8").splitlines()
        columns = lines[0].split(",")
        nav_index = columns.index("nav")
        rows = [float(line.split(",")[nav_index]) for line in lines[1:][-72:]]

    image = Image.new("RGB", (1200, 630), BG)
    draw = ImageDraw.Draw(image, "RGBA")

    for x in range(0, 1200, 48):
        draw.line((x, 0, x, 630), fill=(255, 255, 255, 7), width=1)
    for y in range(0, 630, 48):
        draw.line((0, y, 1200, y), fill=(255, 255, 255, 7), width=1)

    draw.ellipse((840, -230, 1330, 260), fill=(91, 118, 156, 36))
    draw.ellipse((-240, 410, 260, 880), fill=(215, 180, 106, 18))

    draw_cairn(draw, 92, 112, 0.98)
    draw.text((160, 82), "Cairn", font=font(FONT_SERIF, 40), fill=TEXT)
    draw.text((161, 128), "ALLOCATION INTELLIGENCE", font=font(FONT_UI, 12), fill=MUTED)

    draw.text((92, 220), "Every allocation", font=font(FONT_SERIF, 58), fill=TEXT)
    draw.text((92, 282), "should leave a trail.", font=font(FONT_SERIF, 58), fill=TEXT)
    draw.text(
        (94, 367),
        "Policy, tactical risk, cost, attribution and evidence — one reproducible decision.",
        font=font(FONT_UI, 18),
        fill=MUTED,
    )

    pills = [
        ("PAPER PORTFOLIO", ACCENT),
        ("HKD", MUTED),
        ("PUBLIC DATA", MUTED),
        ("VERSIONED", POSITIVE),
    ]
    x_pos = 94
    for label, color in pills:
        width = int(draw.textlength(label, font=font(FONT_UI, 11))) + 28
        draw.rounded_rectangle((x_pos, 430, x_pos + width, 460), radius=15, fill=(255, 255, 255, 9), outline=(255, 255, 255, 22))
        draw.text((x_pos + 14, 439), label, font=font(FONT_UI, 11), fill=color)
        x_pos += width + 10

    panel = (740, 94, 1110, 510)
    draw.rounded_rectangle(panel, radius=18, fill=SURFACE, outline=(255, 255, 255, 28), width=1)
    draw.text((772, 126), "L1 TAA / NET NAV", font=font(FONT_UI, 12), fill=FAINT)
    draw.text((772, 152), f'{results["metrics"]["L1 TAA"]["ending_nav"]:.3f}', font=font(FONT_MONO, 42), fill=TEXT)
    draw.text((772, 205), "HKD · UNHEDGED · AFTER COST", font=font(FONT_UI, 10), fill=FAINT)

    if len(rows) >= 2:
        chart_left, chart_top, chart_right, chart_bottom = 772, 252, 1078, 397
        min_nav = min(rows)
        max_nav = max(rows)
        spread = max(0.01, max_nav - min_nav)
        points = []
        for index, value in enumerate(rows):
            x = chart_left + (chart_right - chart_left) * index / (len(rows) - 1)
            y = chart_bottom - (value - min_nav) / spread * (chart_bottom - chart_top)
            points.append((x, y))
        draw.line(points, fill=POSITIVE, width=3, joint="curve")
        draw.ellipse((points[-1][0] - 5, points[-1][1] - 5, points[-1][0] + 5, points[-1][1] + 5), fill=POSITIVE)

    metrics = [
        ("ANNUAL RETURN", f'{results["metrics"]["L1 TAA"]["cagr"] * 100:.2f}%'),
        ("VOLATILITY", f'{results["metrics"]["L1 TAA"]["annual_volatility"] * 100:.2f}%'),
        ("MAX DRAWDOWN", f'{results["metrics"]["L1 TAA"]["max_drawdown"] * 100:.2f}%'),
    ]
    x_pos = 772
    for label, value in metrics:
        draw.text((x_pos, 430), label, font=font(FONT_UI, 9), fill=FAINT)
        draw.text((x_pos, 450), value, font=font(FONT_MONO, 18), fill=TEXT)
        x_pos += 104

    draw.line((92, 580, 1108, 580), fill=(255, 255, 255, 22), width=1)
    draw.text((92, 594), "RESEARCH ONLY · NOT INVESTMENT ADVICE · NO REAL MONEY", font=font(FONT_UI, 10), fill=FAINT)
    draw.text((938, 594), "CAIRN / 01", font=font(FONT_MONO, 10), fill=ACCENT)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
