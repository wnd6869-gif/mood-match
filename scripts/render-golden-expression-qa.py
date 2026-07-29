"""Render the approved golden retriever expression comparison board."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
APPROVAL_ROOT = (
    PROJECT_ROOT
    / "public"
    / "character-assets"
    / "approval"
    / "golden-retriever-v2"
)
PNG_ROOT = APPROVAL_ROOT / "expressions" / "png"
QA_ROOT = APPROVAL_ROOT / "expressions" / "qa"
EXPRESSIONS = ("gentle", "bright", "chic", "confident", "playful")
TRANSFORMS = {
    "card": {"scale": 1.18, "x": 0, "y": 35},
    "avatar": {"scale": 1.5, "x": 0, "y": 105},
}


def compose(expression: str) -> Image.Image:
    image = Image.open(APPROVAL_ROOT / "b-animal-base.png").convert("RGBA")
    for part in ("eyes", "eyebrows", "mouth"):
        image.alpha_composite(
            Image.open(PNG_ROOT / f"{part}-{expression}.png").convert("RGBA")
        )
    return image


def render_variant(
    source: Image.Image,
    variant: str,
    size: int,
    *,
    circle: bool = False,
) -> Image.Image:
    transform = TRANSFORMS[variant]
    scale = transform["scale"]
    scaled = source.resize(
        (round(1024 * scale), round(1024 * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    canvas.alpha_composite(
        scaled,
        (
            round((1024 - scaled.width) / 2 + transform["x"]),
            round((1024 - scaled.height) / 2 + transform["y"]),
        ),
    )
    background = Image.new("RGBA", (1024, 1024), (255, 248, 230, 255))
    background.alpha_composite(canvas)
    preview = background.resize((size, size), Image.Resampling.LANCZOS)
    if circle:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        output.paste(preview, (0, 0), mask)
        return output
    return preview


def main() -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    board = Image.new("RGB", (1480, 620), (247, 244, 237))
    draw = ImageDraw.Draw(board)
    regular = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 15)
    label_font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 21)
    title_font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 27)

    draw.text(
        (40, 26),
        "Golden Retriever expression comparison",
        font=title_font,
        fill=(28, 28, 28),
    )
    draw.text(
        (40, 66),
        "Same approved base - independent eyes, eyebrows, and mouth layers",
        font=regular,
        fill=(95, 95, 95),
    )

    for index, expression in enumerate(EXPRESSIONS):
        left = 36 + index * 288
        top = 104
        draw.rounded_rectangle(
            (left, top, left + 268, 584),
            radius=24,
            fill=(255, 255, 255),
        )
        text_box = draw.textbbox((0, 0), expression, font=label_font)
        text_width = text_box[2] - text_box[0]
        draw.text(
            (left + (268 - text_width) / 2, top + 18),
            expression,
            font=label_font,
            fill=(30, 30, 30),
        )

        composite = compose(expression)
        card = render_variant(composite, "card", 256)
        square = render_variant(composite, "avatar", 64)
        circle = render_variant(composite, "avatar", 64, circle=True)
        board.paste(card.convert("RGB"), (left + 6, top + 58))
        board.paste(square.convert("RGB"), (left + 50, top + 350))
        board.paste(circle, (left + 154, top + 350), circle)
        draw.text(
            (left + 44, top + 424),
            "64 square",
            font=regular,
            fill=(100, 100, 100),
        )
        draw.text(
            (left + 150, top + 424),
            "64 circle",
            font=regular,
            fill=(100, 100, 100),
        )

    output = QA_ROOT / "golden-expression-comparison.png"
    board.save(output, optimize=True)
    print(output)


if __name__ == "__main__":
    main()
