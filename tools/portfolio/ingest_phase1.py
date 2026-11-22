#!/usr/bin/env python3
"""Phase 1 portfolio ingest: Residential, Institutional, Public & Landscape.

* Reads the supplied image ZIPs (images_part-1.zip, images_part-2.zip) plus the five approved Cloudstone images already in the repo.
* Keeps every CLEAN original byte-for-byte in assets/portfolio-originals/<Category>/<slug>/<slug>-NN.<ext> (never modified).
* Writes branded display derivatives to public/img/portfolio/<slug>-NN-<width>.webp using the SAME logo treatment as
  tools/portfolio/watermark_images.py (right-centre, 7% width, 88% opacity, day/night by luminance).
  Derivatives are never enlarged: widths are 800 plus the image's own native width (and 1400 when native > 1400).
* Generates src/content/portfolioImages.js and src/content/portfolioProjects.js from docs/PORTFOLIO_CATALOG_ENRICHED.json.
Usage:  python3 tools/portfolio/ingest_phase1.py --zip images_part-1.zip --zip images_part-2.zip
"""
from __future__ import annotations
import argparse, json, re, shutil, sys, tempfile, zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import watermark_images as wm  # noqa: E402  (existing branding implementation, reused unchanged)
import part3_copy as p3  # noqa: E402  (Part 3 labels + descriptions)

CATALOG = ROOT / "docs" / "PORTFOLIO_CATALOG_ENRICHED.json"
CATDIR = {"Residential": "Residential", "Institutional": "Institutional", "Public & Landscape": "Public-and-Landscape", "Commercial": "Commercial", "Hospitality": "Hospitality", "Interiors": "Interiors"}
# ZIP folder name -> catalog slug
FOLDERS = {
    "residential/lightweel house": "lightwell-house", "residential/ochre fold residence": "ochre-courtyard-residence",
    "residential/rainline konkan house": "rainline-konkan-house", "residential/shared canopy residences": "shared-canopy-residences",
    "residential/stepwell courtyard house": "stepwell-courtyard-house",
    "institutional/canopy of pages library": "canopy-of-pages-library", "institutional/civic hall study": "civic-hall",
    "institutional/delta commons innovation centre": "delta-commons-innovation-centre", "institutional/healing grove clinic": "healing-grove-clinic",
    "institutional/monsoon learning cloister": "monsoon-learning-cloister", "institutional/riverstone arts terraces": "riverstone-arts-terraces",
    "institutional/saffron court school": "saffron-court-school",
    "public and landscape/garden pavilion study": "garden-pavilion", "public and landscape/junction civic green": "junction-civic-green",
    "public and landscape/margin library garden": "margin-library-garden", "public and landscape/monsoon court": "monsoon-court-civic-plaza",
    "public and landscape/reedlight cultural pavilion": "reedlight-exhibition-pavilion", "public and landscape/sponge belt park": "sponge-belt-ecological-park",
    "public and landscape/tidal commons promenade": "tidal-commons-waterfront",
}
# Short view labels (used for alt text and lightbox captions). Written from a visual review of each supplied image; edit freely.
VIEWS = {
 "lightwell-house": ["Street elevation of the slender urban frontage", "Oblique view along the lane", "Planted lightwell with glass balustrade", "Timber stair and landing within the lightwell", "Terracotta-screened window and timber reveal"],
 "ochre-courtyard-residence": ["Sandstone frontage across the dry garden", "Oblique view of the folded sandstone volumes", "Double-height hall with bridge", "Court with tree and stepped seating", "Screened window in sandstone render"],
 "rainline-konkan-house": ["Verandah elevation above the laterite plinth", "Hillside oblique view of the tiled roof", "Living room opening to the verandah", "Shaded timber verandah toward the sea", "Roof eave, rain chain and laterite wall"],
 "shared-canopy-residences": ["Street elevation of the brick and render wings", "Corner view with screened balconies", "Open gallery with perforated screens", "Shared garden between the wings", "Covered communal pavilion beside the court"],
 "stepwell-courtyard-house": ["Entrance elevation with jaali screens", "Garden-side oblique view", "Stepped water court seen from above", "Living room threshold to the courtyard", "Perforated brick jaali and stone detail"],
 "canopy-of-pages-library": ["Aerial view of the library and roof lantern", "Colonnade arrival to the book court", "Reading hall beneath the lantern", "Roof lantern and planted court from above", "Reading hall with timber tables and shelving"],
 "civic-hall": ["Forecourt and pool approach to the civic hall", "Colonnade beneath the broad roof", "Aerial view of the hall and courtyard", "Hall and upper gallery behind the colonnade", "Roof edge and column detail"],
 "delta-commons-innovation-centre": ["Laboratory wings in the riverine landscape", "Bridge and court between the wings", "Aerial view of the four pinwheel wings", "Shared fabrication laboratory", "Terracotta fins and rain canopy detail"],
 "healing-grove-clinic": ["Garden-facing arrival to the clinic wings", "Veranda and waiting edge", "Aerial view of the clinic in its grove", "Consultation room with garden view", "Roof eave and façade detail"],
 "monsoon-learning-cloister": ["Courtyard approach to the learning cloister", "Veranda passage along the rain channel", "Aerial view of the cloister court", "Breezeway beside the rain garden", "Screen and roof-edge junction"],
 "riverstone-arts-terraces": ["Terrace approach to the arts building", "Foyer threshold opening to the river park", "Gallery with clerestory light", "Stepped terraces toward the water", "Stone wall and timber screen detail"],
 "saffron-court-school": ["Arrival arcade along the school court", "Covered walkway to the courtyard", "Aerial view of the courtyard school", "Classroom walkway under deep eaves", "Jali-brick façade detail"],
 "garden-pavilion": ["Pavilion beyond the stepping-stone path", "Aerial view of the pavilion and pool court", "Timber canopy walkway beside the pond", "Pavilion reflected in the pond", "Timber canopy and planted pond detail"],
 "junction-civic-green": ["Long canopy over the civic path", "Aerial view of the green and civic edge", "Terracotta-screened pavilion", "Shaded path across the green", "Swale and canopy edge detail"],
 "margin-library-garden": ["Library edge and garden path", "Colonnade beside the jaali screen", "Aerial view of the library garden", "Garden path and planted beds", "Screen wall and bench detail"],
 "monsoon-court-civic-plaza": ["Steel canopy over the plaza", "Aerial view of the plaza and canopy", "Under the canopy among planted beds", "Covered walkway beside red screens", "Column base and drainage channel"],
 "reedlight-exhibition-pavilion": ["Pavilion above the wetland", "Aerial view of the pavilion and wetland", "Daylit gallery with screened openings", "Pavilion seen across the reeds", "Boardwalk threshold and façade"],
 "sponge-belt-ecological-park": ["Wetland edge and park path", "Aerial view of the drainage corridor", "Shaded path beside the pond", "Stone weir and planted channel", "Stepping crossing over the swale"],
 "tidal-commons-waterfront": ["Stepped promenade beside the river", "Weathering-steel pergolas along the edge", "Promenade with planted islands in the river", "Walkway and handrail beside the water", "Stone channel and pergola detail"],
}


VIEWS.update(p3.VIEWS3)


def jstr(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


SKIP_EXISTING = True  # derivatives are deterministic; re-run with --force to rebuild all


def derive_widths(native: int) -> list[int]:
    return sorted({w for w in (800, 1400) if w < native} | {native})


def make_derivative(src: Image.Image, width: int, native_w: int, dest: Path, logo_day, logo_night) -> None:
    img = src if width == native_w else src.resize((width, round(src.height * width / src.width)), Image.Resampling.LANCZOS)
    branded, _ = wm.make_overlay(img, logo_day, logo_night)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and SKIP_EXISTING: return
    branded.save(dest, "WEBP", quality=90 if width <= 800 else 95, method=6, exact=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--zip", action="append", required=True, help="supplied image ZIP (repeatable)")
    ap.add_argument("--force", action="store_true", help="rebuild every derivative")
    args = ap.parse_args()
    global SKIP_EXISTING
    SKIP_EXISTING = not args.force
    catalog = {p["slug"]: p for p in json.loads(CATALOG.read_text())["projects"]}
    for slug, r in p3.NEW14.items():   # new supplied projects: same shape as a catalog record
        cat = next(c for f, (c, sl) in p3.FOLDERS3.items() if sl == slug)
        catalog[slug] = dict(slug=slug, title=r["title"], category=cat, typology=r["typology"], summary=r["summary"], designIntent=r["concept"],
                             approach=r["approach"], materials=r["materials"], context=r["context"], location="Conceptual setting — location not specified",
                             programme=r["programme"], environmentalResponse="")
    logo_day = wm.load_official_logo(wm.LOGO_DAY_PATH); logo_night = wm.load_official_logo(wm.LOGO_NIGHT_PATH)

    # ---- gather sources: slug -> [(path, view)] ---------------------------------------------------------------------
    sources: dict[str, list[tuple[Path, str]]] = {}
    tmp = Path(tempfile.mkdtemp())
    for z in args.zip:
        with zipfile.ZipFile(z) as zf: zf.extractall(tmp)
    for folder, slug in FOLDERS.items():
        d = tmp / folder
        files = sorted(d.glob("img-[0-9]*.png"), key=lambda p: int(re.search(r"img-(\d+)", p.name).group(1)))
        if len(files) != 5: raise SystemExit(f"{folder}: expected 5 images, found {len(files)}")
        sources[slug] = [(f, VIEWS[slug][i]) for i, f in enumerate(files)]
    lower = {str(p.relative_to(tmp)).lower(): p for p in tmp.glob("*/*") if p.is_dir()}
    for folder, (cat, slug) in p3.FOLDERS3.items():
        d = lower.get(folder)
        if d is None: raise SystemExit(f"missing Part 3 folder {folder}")
        files = sorted(d.glob("img-[0-9]*.png"), key=lambda p: int(re.search(r"img-(\d+)", p.name).group(1)))
        if len(files) != 5: raise SystemExit(f"{folder}: expected 5 images, found {len(files)}")
        sources[slug] = [(f, VIEWS[slug][i]) for i, f in enumerate(files)]
    cs = catalog["cloudstone-mountain-house"]
    sources["cloudstone-mountain-house"] = [(ROOT / g["sourcePath"], g["view"]) for g in cs["gallery"]]
    for slug, items in sources.items():
        for p, _ in items:
            if not p.exists(): raise SystemExit(f"missing source {p}")

    # ---- derive ------------------------------------------------------------------------------------------------------
    registry: dict[str, dict] = {}
    report = []
    for slug, items in sources.items():
        cat = catalog[slug]["category"]
        for i, (path, view) in enumerate(items, start=1):
            odir = ROOT / "assets" / "portfolio-originals" / CATDIR[cat] / slug
            odir.mkdir(parents=True, exist_ok=True)
            orig = odir / f"{slug}-{i:02d}{path.suffix.lower()}"
            shutil.copy2(path, orig)  # clean original, byte-identical
            with Image.open(path) as im: native = im.convert("RGB"); w, h = native.size
            widths = derive_widths(w)
            for width in widths:
                make_derivative(native, width, w, ROOT / "public" / "img" / "portfolio" / f"{slug}-{i}-{width}.webp", logo_day, logo_night)
            rid = f"portfolio/{slug}-{i}"
            registry[rid] = dict(alt=f"Proposed design visualization of {catalog[slug]['title']}: {view[0].lower() + view[1:]}.", view=view, pos="50% 50%", w=w, h=h, widths=widths)
            report.append((slug, i, w, h, widths))
    # ---- registry module ---------------------------------------------------------------------------------------------
    lines = ["// GENERATED by tools/portfolio/ingest_phase1.py — do not hand-edit counts; alt text / view labels may be refined here.",
             "// Each image: native size (w,h), available derivative widths (never enlarged) and branded WebP files in /public/img/portfolio.",
             "export const PORTFOLIO_IMAGES = {"]
    for rid, m in registry.items():
        lines.append(f"  {jstr(rid)}: {{ alt: {jstr(m['alt'])}, view: {jstr(m['view'])}, pos: {jstr(m['pos'])}, w: {m['w']}, h: {m['h']}, widths: {json.dumps(m['widths'])} }},")
    lines.append("};\n")
    (ROOT / "src" / "content" / "portfolioImages.js").write_text("\n".join(lines), encoding="utf-8")

    # ---- projects module ---------------------------------------------------------------------------------------------
    order = ["Residential", "Institutional", "Public & Landscape", "Commercial", "Hospitality", "Interiors"]
    slugs = sorted(sources, key=lambda s: (order.index(catalog[s]["category"]), list(catalog).index(s)))
    out = ["// GENERATED by tools/portfolio/ingest_phase1.py from docs/PORTFOLIO_CATALOG_ENRICHED.json.",
           "// Proposed design studies — none are completed or commissioned TOP projects. Images: public/img/portfolio (see portfolioImages.js).",
           "export const PHASE1_PROJECTS = ["]
    for s in slugs:
        c = catalog[s]; loc = c["location"].split("·")[-1].strip()
        location = "Unspecified — conceptual" if "not specified" in loc.lower() else loc[0].upper() + loc[1:]
        ids = [f"portfolio/{s}-{i}" for i in range(1, 6)]
        rec = dict(slug=s, published=True, kind="concept", status="proposed", title=c["title"], category=c["category"], typology=c["typology"],
                   location=location, year=None, cover=ids[0], gallery=ids, summary=c["summary"], concept=c["designIntent"],
                   approach=c["approach"], materials=c["materials"], context=c["context"], programme=c.get("programme", []),
                   climate=c.get("environmentalResponse", ""))
        out.append("  " + json.dumps(rec, ensure_ascii=False, indent=2).replace("\n", "\n  ") + ",")
    out.append("];\n")
    (ROOT / "src" / "content" / "portfolioProjects.js").write_text("\n".join(out), encoding="utf-8")
    print(json.dumps(dict(projects=len(sources), images=len(report), derivative_files=sum(len(r[4]) for r in report),
                          sizes=sorted({(r[2], r[3]) for r in report})), indent=1))

if __name__ == "__main__":
    main()
