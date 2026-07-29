"""Remove excess transparent bounds and align an animal base to 1024px."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--max-width", type=int, default=760)
    parser.add_argument("--max-height", type=int, default=920)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    bounds = image.getbbox()
    if bounds is None:
        raise ValueError("base image is empty")
    part = image.crop(bounds)
    scale = min(args.max_width / part.width, args.max_height / part.height)
    part = part.resize(
        (round(part.width * scale), round(part.height * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    canvas.alpha_composite(part, ((1024 - part.width) // 2, 1024 - part.height - 24))

    output_dir = Path(args.output_dir)
    original_dir = output_dir / "original"
    web_dir = output_dir / "web"
    original_dir.mkdir(parents=True, exist_ok=True)
    web_dir.mkdir(parents=True, exist_ok=True)
    canvas.save(original_dir / "base-v1.png", optimize=True)
    canvas.save(web_dir / "base-v1.webp", "WEBP", quality=92, method=6)


if __name__ == "__main__":
    main()
