#!/usr/bin/env python3
"""
Fetches active product listings from fg-collect-core and writes Hugo data files.

Run before `hugo build` in CI. Set API_BASE to the core API (e.g.
https://api.futuregadgetlabs.com/api/v1). If unset, the script exits 0 and
the placeholder YAML files in data/products/ are used instead.

Usage:
    API_BASE=https://api.futuregadgetlabs.com/api/v1 python3 scripts/fetch-products.py
"""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

API_BASE = os.environ.get("API_BASE", "").rstrip("/")
DATA_DIR = Path(__file__).parent.parent / "data" / "products"
GAMES = ["pokemon", "magic", "weiss"]
PLACEHOLDER_IMG_SEALED = "/img/placeholder-sealed.svg"
PLACEHOLDER_IMG_SINGLE = "/img/placeholder-single.svg"
PLACEHOLDER_IMG_GRADED = "/img/placeholder-graded.svg"


def fetch_listings(game: str, listing_type: str) -> list[dict]:
    url = f"{API_BASE}/listings?game={game}&type={listing_type}&limit=200"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
            return data.get("items") or []
    except urllib.error.URLError as e:
        print(f"WARNING: could not fetch {game}/{listing_type}: {e}", file=sys.stderr)
        return []


def cents_to_price(cents: int) -> str:
    return f"{cents / 100:.2f}"


def yaml_str(val) -> str:
    if val is None:
        return "~"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    # Escape strings that need quoting
    s = str(val)
    if any(c in s for c in (':', '#', '[', ']', '{', '}', ',', '&', '*', '?', '|', '-', '<', '>', '=', '!', '%', '@', '`', '"', "'", '\n')):
        return json.dumps(s)
    if s in ("true", "false", "null", "~", "yes", "no", "on", "off"):
        return json.dumps(s)
    return s


def sealed_to_yaml(item: dict) -> str:
    details = item.get("details") or {}
    lines = [
        f"  - id: {yaml_str(item['id'])}",
        f"    name: {yaml_str(item['name'])}",
        f"    set: {yaml_str(item.get('set_name') or '')}",
        f"    price: {cents_to_price(item['price_cents'])}",
        f"    stock: {item['stock']}",
        f"    image: {yaml_str(item.get('image_url') or PLACEHOLDER_IMG_SEALED)}",
    ]
    if product_type := details.get("product_type"):
        lines.append(f"    product_type: {yaml_str(product_type)}")
    if language := details.get("language"):
        lines.append(f"    language: {yaml_str(language)}")
    return "\n".join(lines)


def graded_to_yaml(item: dict) -> str:
    details = item.get("details") or {}
    lines = [
        f"  - id: {yaml_str(item['id'])}",
        f"    name: {yaml_str(item['name'])}",
        f"    set: {yaml_str(item.get('set_name') or '')}",
        f"    price: {cents_to_price(item['price_cents'])}",
        f"    stock: {item['stock']}",
        f"    image: {yaml_str(item.get('image_url') or PLACEHOLDER_IMG_GRADED)}",
        f"    grading_company: {yaml_str(details.get('grading_company') or '')}",
        f"    grade: {yaml_str(details.get('grade', ''))}",
    ]
    if cert := details.get("cert_number"):
        lines.append(f"    cert_number: {yaml_str(cert)}")
    return "\n".join(lines)


def single_to_yaml(item: dict) -> str:
    details = item.get("details") or {}
    lines = [
        f"  - id: {yaml_str(item['id'])}",
        f"    name: {yaml_str(item['name'])}",
        f"    set: {yaml_str(item.get('set_name') or '')}",
        f"    price: {cents_to_price(item['price_cents'])}",
        f"    stock: {item['stock']}",
        f"    image: {yaml_str(item.get('image_url') or PLACEHOLDER_IMG_SINGLE)}",
        f"    condition: {yaml_str(details.get('condition') or 'NM')}",
        f"    language: {yaml_str(details.get('language') or 'EN')}",
        f"    foil: {yaml_str(details.get('foil', False))}",
    ]
    if number := details.get("number"):
        lines.insert(3, f"    number: {yaml_str(number)}")
    return "\n".join(lines)


def write_game(game: str) -> None:
    sealed = fetch_listings(game, "sealed")
    singles = fetch_listings(game, "single")
    graded = fetch_listings(game, "graded")

    sealed_yaml = "\n".join(sealed_to_yaml(i) for i in sealed) if sealed else "  []"
    singles_yaml = "\n".join(single_to_yaml(i) for i in singles) if singles else "  []"
    graded_yaml = "\n".join(graded_to_yaml(i) for i in graded) if graded else "  []"

    content = f"""\
# Generated at build time by scripts/fetch-products.py — do not edit manually.
sealed:
{sealed_yaml}
singles:
{singles_yaml}
graded:
{graded_yaml}
"""
    out = DATA_DIR / f"{game}.yaml"
    out.write_text(content, encoding="utf-8")
    print(f"  {game}: {len(sealed)} sealed, {len(singles)} singles, {len(graded)} graded -> {out}")


def main() -> None:
    if not API_BASE:
        print("fetch-products: API_BASE not set — using placeholder data")
        sys.exit(0)

    print(f"fetch-products: fetching from {API_BASE}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for game in GAMES:
        write_game(game)
    print("fetch-products: done")


if __name__ == "__main__":
    main()
