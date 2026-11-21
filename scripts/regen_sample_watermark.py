#!/usr/bin/env python3
"""Regenerate cards/*.jpg SAMPLE watermarks from clean/ (matches compressCardWithWatermark)."""
from __future__ import annotations

import math
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CLEAN = ROOT / "clean"
CARDS = ROOT / "cards"
RATIO = 0.28
MIN_FONT = 16
JPEG_QUALITY = 72


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def watermark(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    font_size = max(MIN_FONT, round(min(w, h) * RATIO))
    font = load_font(font_size)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Match canvas rotate(-PI/6) around center with repeating SAMPLE rows
    angle = -30  # degrees; canvas uses -Math.PI/6
    step_y = font_size * 2.2
    # Draw onto a larger layer so rotation doesn't clip
    pad = int(max(w, h) * 0.75)
    layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    ldraw = ImageDraw.Draw(layer)
    cx, cy = layer.size[0] / 2, layer.size[1] / 2
    fill = (255, 255, 255, int(255 * 0.38))
    stroke = (0, 0, 0, int(255 * 0.14))
    stroke_w = max(1, int(font_size * 0.06))
    y = -h
    while y <= h:
        # stroke then fill, centered
        ldraw.text((cx, cy + y), "SAMPLE", font=font, fill=stroke, anchor="mm", stroke_width=stroke_w, stroke_fill=stroke)
        ldraw.text((cx, cy + y), "SAMPLE", font=font, fill=fill, anchor="mm")
        y += step_y
    rotated = layer.rotate(angle, resample=Image.BICUBIC, expand=False)
    # Crop back to original size from center
    left = (rotated.size[0] - w) // 2
    top = (rotated.size[1] - h) // 2
    cropped = rotated.crop((left, top, left + w, top + h))
    out = Image.alpha_composite(img.convert("RGBA"), cropped).convert("RGB")
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, format="JPEG", quality=JPEG_QUALITY, optimize=True)


def main() -> None:
    files = sorted(p for p in CLEAN.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not files:
        raise SystemExit(f"no images in {CLEAN}")
    print(f"regenerating {len(files)} watermarks (ratio={RATIO})")
    ok = 0
    errors = []
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        futs = {pool.submit(watermark, src, CARDS / (src.stem + ".jpg")): src for src in files}
        for i, fut in enumerate(as_completed(futs), 1):
            src = futs[fut]
            try:
                fut.result()
                ok += 1
            except Exception as e:  # noqa: BLE001
                errors.append((src.name, str(e)))
            if i % 500 == 0 or i == len(files):
                print(f"  {i}/{len(files)}")
    print(f"done: {ok} ok, {len(errors)} errors")
    for name, err in errors[:10]:
        print(f"  ERR {name}: {err}")
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
