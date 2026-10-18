"""Generate the Spireflow app icon (build/icon.ico + build/icon.png).

Draws the brand waveform mark on a dark rounded square. Dev-only tool:
    server/.venv/Scripts/python.exe tools/make_icon.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "build"

DARK = (23, 20, 15, 255)
CREAM = (244, 239, 229, 255)

BARS = [0.34, 0.56, 0.84, 0.5, 0.3]


def render(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=DARK)

    bar_w = size * 0.078
    gap = size * 0.062
    total = len(BARS) * bar_w + (len(BARS) - 1) * gap
    x = (size - total) / 2
    max_h = size * 0.56

    for frac in BARS:
        h = max_h * frac
        y0 = (size - h) / 2
        draw.rounded_rectangle(
            [x, y0, x + bar_w, y0 + h],
            radius=bar_w / 2,
            fill=CREAM,
        )
        x += bar_w + gap

    return img


def render_template(size: int) -> Image.Image:
    """macOS menu-bar template: monochrome bars on a transparent background.

    Template images are tinted by the OS (black in light mode, white in dark
    mode), so only the alpha channel matters.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = size * 0.16
    bar_w = size * 0.09
    gap = size * 0.06
    total = len(BARS) * bar_w + (len(BARS) - 1) * gap
    x = (size - total) / 2
    max_h = size - pad * 2

    for frac in BARS:
        h = max_h * frac
        y0 = (size - h) / 2
        draw.rounded_rectangle(
            [x, y0, x + bar_w, y0 + h],
            radius=bar_w / 2,
            fill=(0, 0, 0, 255),
        )
        x += bar_w + gap

    return img


def main() -> None:
    OUT.mkdir(exist_ok=True)
    base = render(256)
    base.save(
        OUT / "icon.ico",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    render(512).save(OUT / "icon.png")
    # System-tray assets (shipped via electron-builder `files`).
    render(32).save(OUT / "tray.png")
    render_template(16).save(OUT / "trayTemplate.png")
    render_template(32).save(OUT / "trayTemplate@2x.png")
    print(f"wrote app + tray icons to {OUT}")


if __name__ == "__main__":
    main()
