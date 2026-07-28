"""Convert a chroma-key sprite sheet into aligned 1024px avatar overlays."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--columns", type=int, required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--names", nargs="+", required=True)
    parser.add_argument("--anchor-x", type=int, default=512)
    parser.add_argument("--anchor-y", type=int, required=True)
    parser.add_argument("--target-width", type=int, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = Image.open(args.input).convert("RGBA")
    expected = args.columns * args.rows
    if len(args.names) != expected:
        raise ValueError(f"expected {expected} names, got {len(args.names)}")

    output_dir = Path(args.output_dir)
    original_dir = output_dir / "original"
    web_dir = output_dir / "web"
    original_dir.mkdir(parents=True, exist_ok=True)
    web_dir.mkdir(parents=True, exist_ok=True)

    cell_width = source.width // args.columns
    cell_height = source.height // args.rows

    for index, name in enumerate(args.names):
        column = index % args.columns
        row = index // args.columns
        cell = source.crop(
            (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        bounds = cell.getbbox()
        if bounds is None:
            raise ValueError(f"{name} cell is empty")
        part = cell.crop(bounds)
        scale = args.target_width / part.width
        part = part.resize(
            (args.target_width, max(1, round(part.height * scale))),
            Image.Resampling.LANCZOS,
        )
        canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        x = round(args.anchor_x - part.width / 2)
        y = round(args.anchor_y - part.height / 2)
        canvas.alpha_composite(part, (x, y))
        canvas.save(original_dir / f"{name}-v1.png", optimize=True)
        canvas.save(
            web_dir / f"{name}-v1.webp",
            "WEBP",
            quality=92,
            method=6,
        )


if __name__ == "__main__":
    main()
