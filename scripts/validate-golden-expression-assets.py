"""Validate approved golden retriever expression layer outputs."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageChops


PROJECT_ROOT = Path(__file__).resolve().parents[1]
APPROVAL_ROOT = (
    PROJECT_ROOT
    / "public"
    / "character-assets"
    / "approval"
    / "golden-retriever-v2"
)
PNG_ROOT = APPROVAL_ROOT / "expressions" / "png"
EXPRESSIONS = ("gentle", "bright", "chic", "confident", "playful")
PARTS = ("eyes", "eyebrows", "mouth")
ANCHOR_BOUNDS = {
    "eyes": (400, 376, 620, 452),
    "eyebrows": (400, 335, 620, 375),
    "mouth": (420, 500, 605, 570),
}
GENTLE_SOURCES = {
    "eyes": APPROVAL_ROOT / "eyes-default.png",
    "eyebrows": APPROVAL_ROOT / "eyebrows-default.png",
    "mouth": APPROVAL_ROOT / "mouth-default.png",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inside(inner: tuple[int, int, int, int], outer: tuple[int, int, int, int]) -> bool:
    return (
        inner[0] >= outer[0]
        and inner[1] >= outer[1]
        and inner[2] <= outer[2]
        and inner[3] <= outer[3]
    )


def main() -> None:
    base = Image.open(APPROVAL_ROOT / "b-animal-base.png").convert("RGBA")
    base_hash = sha256(APPROVAL_ROOT / "b-animal-base.png")
    rows: list[str] = []

    for expression in EXPRESSIONS:
        composite = base.copy()
        bboxes: dict[str, tuple[int, int, int, int]] = {}
        for part in PARTS:
            path = PNG_ROOT / f"{part}-{expression}.png"
            image = Image.open(path)
            if image.mode != "RGBA" or image.size != (1024, 1024):
                raise AssertionError(f"{path.name}: expected 1024x1024 RGBA")
            if image.getpixel((0, 0))[3] or image.getpixel((1023, 1023))[3]:
                raise AssertionError(f"{path.name}: canvas edge is not transparent")

            bbox = image.getchannel("A").getbbox()
            if bbox is None or not inside(bbox, ANCHOR_BOUNDS[part]):
                raise AssertionError(
                    f"{path.name}: bbox {bbox} outside {ANCHOR_BOUNDS[part]}"
                )
            bboxes[part] = bbox

            if expression == "gentle":
                source_hash = sha256(GENTLE_SOURCES[part])
                if sha256(path) != source_hash:
                    raise AssertionError(f"{path.name}: gentle SHA differs from approved")

            composite.alpha_composite(image.convert("RGBA"))
            rows.append(f"{path.name}: bbox={bbox}")

        if not (
            bboxes["eyebrows"][3] < bboxes["eyes"][1]
            and bboxes["eyes"][3] < bboxes["mouth"][1]
        ):
            raise AssertionError(
                f"{expression}: eyebrow, eye, and mouth layers overlap"
            )
        rows.append(f"{expression}: face-layer-separation=passed")

        if sha256(APPROVAL_ROOT / "b-animal-base.png") != base_hash:
            raise AssertionError("approved animal base changed during validation")

        # Removing the face layers must return the exact approved base pixels.
        face_only = ImageChops.difference(
            composite.convert("RGB"),
            base.convert("RGB"),
        )
        if face_only.getbbox() is None:
            raise AssertionError(f"{expression}: face layers produced no visible change")

    print("\n".join(rows))
    print(f"base-sha256={base_hash}")
    print("validation=passed")


if __name__ == "__main__":
    main()
