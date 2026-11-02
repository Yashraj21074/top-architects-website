#!/usr/bin/env python3
"""Create branded responsive derivatives from clean project-image originals.

The source image is never modified. Each responsive derivative receives one
proportional, 88%-opacity copy of the supplied official TOP lockup. The supplied
day or night logo PNG is selected by median luminance beneath the logo position;
logo RGB values, proportions, and typography are not altered. No panel or added
halo is used. Each source produces 800, 1400, and 2400 px WebP files.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG = ROOT / "docs" / "PORTFOLIO_CATALOG_DRAFT.json"
LOGO_DAY_PATH = ROOT / "public" / "logo" / "top-logo-trim.png"
LOGO_NIGHT_PATH = ROOT / "public" / "logo" / "top-logo-trim-night.png"
WIDTHS = (800, 1400, 2400)
LOGO_WIDTH_FRACTION = 0.07
RIGHT_INSET_FRACTION = 0.028
LOGO_OPACITY = 0.88
LUMINANCE_THRESHOLD = 132


def local_luminance(image: Image.Image, box: tuple[int, int, int, int]) -> float:
    """Return the median grayscale value in the fixed watermark area."""
    sample = image.crop(box).convert("RGB").convert("L")
    histogram = sample.resize((24, 24), Image.Resampling.BILINEAR).histogram()
    midpoint = (sum(histogram) - 1) // 2
    cumulative = 0
    for value, count in enumerate(histogram):
        cumulative += count
        if cumulative > midpoint:
            return float(value)
    return 0.0


def make_overlay(
    image: Image.Image,
    logo_day: Image.Image,
    logo_night: Image.Image,
) -> tuple[Image.Image, dict]:
    base = image.convert("RGBA")
    width, height = base.size
    logo_width = max(1, round(width * LOGO_WIDTH_FRACTION))
    logo_height = max(1, round(logo_day.height * logo_width / logo_day.width))
    x = width - logo_width - round(width * RIGHT_INSET_FRACTION)
    y = round((height - logo_height) / 2)
    x = max(0, min(x, width - logo_width))
    y = max(0, min(y, height - logo_height))

    luma = local_luminance(base, (x, y, x + logo_width, y + logo_height))
    variant_name = "day" if luma >= LUMINANCE_THRESHOLD else "night"
    official_logo = logo_day if variant_name == "day" else logo_night
    logo = official_logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)

    # Keep the official asset's RGB, aspect ratio, and typography exactly as supplied.
    alpha = logo.getchannel("A")
    logo.putalpha(alpha.point(lambda value: round(value * LOGO_OPACITY)))
    base.alpha_composite(logo, (x, y))
    return base.convert("RGB"), {
        "position": "right-centre",
        "logo_width_fraction": LOGO_WIDTH_FRACTION,
        "right_inset_fraction": RIGHT_INSET_FRACTION,
        "opacity": LOGO_OPACITY,
        "sample_luminance": round(luma, 1),
        "official_logo_variant": variant_name,
        "luminance_threshold": LUMINANCE_THRESHOLD,
    }


def make_variant(
    source: Path,
    destination: Path,
    width: int,
    logo_day: Image.Image,
    logo_night: Image.Image,
) -> dict:
    with Image.open(source) as opened:
        original = opened.convert("RGB")
    source_size = original.size
    target_height = round(source_size[1] * width / source_size[0])
    resized = original.resize((width, target_height), Image.Resampling.LANCZOS)
    branded, watermark = make_overlay(resized, logo_day, logo_night)
    destination.parent.mkdir(parents=True, exist_ok=True)
    branded.save(destination, "WEBP", quality=89, method=6, exact=True)
    return {
        "source": str(source.relative_to(ROOT)),
        "output": str(destination.relative_to(ROOT)),
        "width": width,
        "height": target_height,
        "source_dimensions": list(source_size),
        "watermark": watermark,
    }


def canonical_source(record: dict) -> Path:
    source = ROOT / record["sourcePath"]
    canonical = ROOT / "assets" / "generated-originals" / "projects" / f"{record['assetKey']}.jpg"
    if not source.exists():
        raise FileNotFoundError(f"Missing clean original: {source}")
    if source.resolve() != canonical.resolve() and not canonical.exists():
        canonical.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, canonical)
    return canonical if canonical.exists() else source


def load_official_logo(path: Path) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(f"Official logo asset not found: {path}")
    with Image.open(path) as image_file:
        image = image_file.convert("RGBA")
    if image.getchannel("A").getextrema() == (255, 255):
        raise ValueError(f"Official logo has no transparent area; refusing to create a background panel: {path}")
    return image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--category", help="Process exactly one complete portfolio category.")
    parser.add_argument("--manifest", type=Path, help="Write a JSON manifest of generated variants.")
    parser.add_argument("--single-source", type=Path, help="Process one source image for a visual check.")
    parser.add_argument("--single-key", help="Descriptive asset key for --single-source.")
    args = parser.parse_args()

    logo_day = load_official_logo(LOGO_DAY_PATH)
    logo_night = load_official_logo(LOGO_NIGHT_PATH)
    if logo_day.size != logo_night.size:
        raise ValueError("Official day and night logo assets must share the same dimensions.")

    jobs: list[tuple[str, Path]] = []
    if args.single_source:
        if not args.single_key:
            parser.error("--single-key is required with --single-source")
        source = args.single_source if args.single_source.is_absolute() else ROOT / args.single_source
        if not source.exists():
            raise FileNotFoundError(f"Missing clean original: {source}")
        jobs.append((args.single_key, source))
    else:
        catalog_path = args.catalog if args.catalog.is_absolute() else ROOT / args.catalog
        catalog = json.loads(catalog_path.read_text())
        projects = catalog["projects"]
        if args.category:
            projects = [project for project in projects if project["category"] == args.category]
            if len(projects) != 7:
                raise ValueError(f"Expected exactly seven projects in {args.category}; found {len(projects)}.")
        for project in projects:
            if len(project["gallery"]) != 5:
                raise ValueError(f"{project['slug']} has {len(project['gallery'])} gallery records, not five.")
            for record in project["gallery"]:
                jobs.append((record["assetKey"], canonical_source(record)))
        expected_count = len(projects) * 5
        if len(jobs) != expected_count:
            raise ValueError(f"Expected {expected_count} gallery images, found {len(jobs)}.")

    report = []
    for asset_key, source in jobs:
        if not source.exists():
            raise FileNotFoundError(f"Missing source image for {asset_key}: {source}")
        for width in WIDTHS:
            destination = ROOT / "public" / "img" / "projects" / f"{asset_key}-{width}.webp"
            report.append(make_variant(source, destination, width, logo_day, logo_night))

    manifest_path = args.manifest
    if manifest_path:
        if not manifest_path.is_absolute():
            manifest_path = ROOT / manifest_path
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(report, indent=2) + "\n")

    print(json.dumps({"processed_source_images": len(jobs), "responsive_variants": len(report), "widths": WIDTHS, "outputs": report}, indent=2))


if __name__ == "__main__":
    main()
