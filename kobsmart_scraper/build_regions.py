"""Scrape grocery offers for several Danish cities and write one app file per
region, plus an index the web app uses to load only the region nearest the user.

Output:
  public/data/regions/<id>.json   # same shape as offers.json (meta/offers/stores)
  public/data/regions/index.json  # { default, generated_at, regions:[{id,name,lat,lng,offer_count}] }

The app loads exactly one region file at a time (keeps payloads small), so adding
cities does not bloat the page. Falls back to the single data/offers.json when no
index exists. eTilbudsavis is primary; per-region failures are skipped (best effort).
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from .cli import GROCERY_CHAINS
from .etilbudsavis import EtilbudsavisClient
from .normalize import normalize_etilbudsavis

# Denmark's largest urban areas — covers the bulk of the population. Extend freely.
REGIONS = [
    {"id": "koebenhavn", "name": "København", "lat": 55.6761, "lng": 12.5683},
    {"id": "aarhus", "name": "Aarhus", "lat": 56.1567, "lng": 10.2106},
    {"id": "odense", "name": "Odense", "lat": 55.4038, "lng": 10.4024},
    {"id": "aalborg", "name": "Aalborg", "lat": 57.0488, "lng": 9.9217},
    {"id": "esbjerg", "name": "Esbjerg", "lat": 55.4765, "lng": 8.4594},
    {"id": "randers", "name": "Randers", "lat": 56.4607, "lng": 10.0364},
    {"id": "kolding", "name": "Kolding", "lat": 55.4904, "lng": 9.4722},
    {"id": "vejle", "name": "Vejle", "lat": 55.7090, "lng": 9.5357},
    {"id": "horsens", "name": "Horsens", "lat": 55.8607, "lng": 9.8503},
    {"id": "roskilde", "name": "Roskilde", "lat": 55.6415, "lng": 12.0803},
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Build per-region offer files for KøbSmart.")
    parser.add_argument("--radius", type=float, default=8.0, help="Search radius km per city. Default 8.")
    parser.add_argument("--out-dir", default="public/data/regions")
    parser.add_argument("--default", default="aarhus", help="Region id used when GPS is unavailable.")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    scraped_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    client = EtilbudsavisClient()
    index_regions: list[dict] = []

    for region in REGIONS:
        try:
            raw_offers, raw_stores = client.fetch_nearby(
                latitude=region["lat"],
                longitude=region["lng"],
                radius_km=args.radius,
            )
            offers, stores = normalize_etilbudsavis(
                raw_offers,
                raw_stores,
                scraped_at,
                expand_chain_stores=True,
                chains=GROCERY_CHAINS,
            )
        except Exception as exc:  # network/terms/empty — skip this city, keep the rest
            print(f"skip {region['id']}: {exc}")
            continue

        if not offers:
            print(f"skip {region['id']}: no offers returned")
            continue

        payload = {
            "meta": {
                "source": "etilbudsavis",
                "region": region["id"],
                "region_name": region["name"],
                "scraped_at": scraped_at,
                "offer_count": len(offers),
                "store_count": len(stores),
                "offer_chains": dict(Counter(row["chain"] for row in offers).most_common()),
            },
            "offers": offers,
            "stores": stores,
        }
        (out_dir / f"{region['id']}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        index_regions.append(
            {
                "id": region["id"],
                "name": region["name"],
                "lat": region["lat"],
                "lng": region["lng"],
                "offer_count": len(offers),
            }
        )
        print(f"wrote {region['id']}: {len(offers)} offers, {len(stores)} stores")

    if not index_regions:
        raise SystemExit("No regions produced — leaving existing data untouched.")

    default_id = args.default if any(r["id"] == args.default for r in index_regions) else index_regions[0]["id"]
    index = {
        "default": default_id,
        "generated_at": scraped_at,
        "regions": index_regions,
    }
    (out_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    print(f"wrote index.json with {len(index_regions)} regions (default: {default_id})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
