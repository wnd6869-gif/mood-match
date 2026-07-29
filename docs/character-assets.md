# Mood Match character assets

The production character is a deterministic composition of versioned 1024×1024 layers. The database stores the `CharacterComposition` JSON and manifest version, not every file path.

## Layer order

`background → background-decoration → outfit-base → face-pattern → eyes → eyebrows → mouth → blush → face-accessory → foreground-effect`

The order is declared in `lib/character/character-types.ts`. Asset paths and animal anchors are declared in `lib/character/character-manifest.ts`.

## MVP assets

- Animals: golden retriever, Russian Blue, otter, red fox, white rabbit, capybara
- Eye/eyebrow expressions: gentle, bright, chic, confident, focused, cozy, curious, delicate
- Mouths: small smile, warm smile, big smile, neutral, playful smirk, shy smile
- Face effects: soft blush, bright blush, freckles, sparkle cheeks
- Outfits: cream knit, coral hoodie, navy shirt, sage cardigan, charcoal jacket, lavender sweater
- Face accessories: round glasses, thin glasses (sunglasses reserved)
- Neck accessories: thin scarf, ribbon tie
- Deprecated head accessories (beret, beanie, hairpin) are retained for audit only and never exposed to users.
- Props: coffee, book, camera, smartphone, flower, music player
- Backgrounds: warm cafe, cozy room, green park, evening sky, quiet library, minimal coral, minimal sage, minimal lavender
- Foreground effects: soft hearts, tiny stars, floating leaves, music notes, warm sparkles

Each generated asset has an alpha PNG under an `original` directory and an optimized WebP under `web`. Source sprite sheets and chroma-key inputs are retained in `public/character-assets/source-sheets` for audit and future regeneration.

## Generation mode and prompt rules

Assets were generated with the built-in ImageGen tool. Transparent layers used a uniform `#00ff00` background followed by the official local chroma-key removal helper with soft matte, despill, and a one-pixel edge contraction. Final production files were normalized with the scripts in `scripts/`.

The shared prompt specified:

- warm, polished Korean mobile-service 2D illustration
- clean warm dark-brown outline and 2–3 cel-shading tones
- gender-neutral, mature-cute styling
- centered front-facing upper body
- no text, logo, watermark, photorealism, or 3D rendering
- modular base layers without eyes, mouth, clothing, accessories, props, or background
- perfectly flat chroma-key background for removable-layer sources

## Rebuilding

Use the bundled Python/Pillow runtime:

1. Run the installed `remove_chroma_key.py` helper against a source sheet.
2. Run `scripts/process-character-sprite-sheet.py` for expressions, outfits, accessories, props, and effects.
3. Run `scripts/process-character-base.py` for animal bases.
4. Inspect the alpha PNG, the six-animal contact sheet, and a full composition preview.
5. Increment `CHARACTER_ASSET_VERSION` before changing an existing visual contract.

## Adding another animal

Create a base with the same blank-face layout, process it to 1024×1024, add its paths and measured anchors to `ANIMAL_MANIFEST`, add keyword mapping in `character-mapper.ts`, and only then mark it ready. The twelve future IDs are reserved in `FUTURE_ANIMALS` and are not exposed in the UI.

## QA

In development, open `/dev/character-lab`. Production returns 404. The lab changes layers immediately, shows invalid-combination warnings, and exports PNG or WebP.

Apply `supabase/character-compositions.sql` before persisting recipes in production.
