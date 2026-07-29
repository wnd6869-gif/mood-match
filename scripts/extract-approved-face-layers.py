"""Extract independent full-canvas face layers from an approved style master."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def luminance(pixel: tuple[int, int, int, int]) -> float:
    red, green, blue, _ = pixel
    return red * 0.299 + green * 0.587 + blue * 0.114


def build_layer(
    source: Image.Image,
    regions: list[tuple[int, int, int, int]],
    predicate,
) -> Image.Image:
    raw = Image.new("L", source.size, 0)
    raw_pixels = raw.load()
    source_pixels = source.load()

    for left, top, right, bottom in regions:
        for y in range(top, bottom):
            for x in range(left, right):
                if predicate(source_pixels[x, y], x, y):
                    raw_pixels[x, y] = 255

    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    result_pixels = result.load()
    alpha_pixels = raw.load()

    for y in range(source.height):
        for x in range(source.width):
            alpha = alpha_pixels[x, y]
            if alpha:
                red, green, blue, _ = source_pixels[x, y]
                result_pixels[x, y] = (red, green, blue, alpha)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    if source.size != (1024, 1024):
        raise ValueError("approved master must be 1024x1024")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    eyes = build_layer(
        source,
        [(405, 378, 468, 458), (556, 378, 619, 458)],
        lambda pixel, _x, _y: (
            luminance(pixel) < 178
            or (
                min(pixel[:3]) > 195
                and max(pixel[:3]) - min(pixel[:3]) < 30
            )
        ),
    )
    eyebrows = build_layer(
        source,
        [(408, 340, 462, 374), (562, 340, 616, 374)],
        lambda pixel, _x, _y: luminance(pixel) < 175,
    )
    mouth = build_layer(
        source,
        [(418, 505, 607, 563)],
        lambda pixel, x, y: (
            luminance(pixel) < 150
            and y >= 507
            and not (470 <= x <= 554 and y < 535)
        ),
    )

    layers = {
        "eyes-default.png": eyes,
        "eyebrows-default.png": eyebrows,
        "mouth-default.png": mouth,
    }
    for filename, layer in layers.items():
        layer.save(output_dir / filename, optimize=True)


if __name__ == "__main__":
    main()
