from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from .cli import GROCERY_CHAINS
from .normalize import normalize_etilbudsavis, normalize_food_waste


def main() -> int:
    parser = argparse.ArgumentParser(description="Build static app JSON from a raw scraper capture.")
    parser.add_argument(
        "--source",
        choices=["etilbudsavis", "salling"],
        default="etilbudsavis",
        help="Shape of the raw capture. etilbudsavis = {offers, stores}; salling = food-waste list.",
    )
    parser.add_argument("--raw", default="data/raw/etilbudsavis_grocery_aarhus.json")
    parser.add_argument("--output", default="public/data/offers.json")
    parser.add_argument("--scraped-at", default=None)
    parser.add_argument("--include-all-chains", action="store_true")
    args = parser.parse_args()

    raw_path = Path(args.raw)
    output_path = Path(args.output)
    payload = json.loads(raw_path.read_text(encoding="utf-8"))
    scraped_at = args.scraped_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    if args.source == "salling":
        # Salling raw is the food-waste list; normalize into the same offer schema.
        offers, stores = normalize_food_waste(payload, scraped_at)
    else:
        offers, stores = normalize_etilbudsavis(
            payload["offers"],
            payload["stores"],
            scraped_at,
            expand_chain_stores=True,
            chains=None if args.include_all_chains else GROCERY_CHAINS,
        )

    app_payload = {
        "meta": {
            "source": args.source,
            "scraped_at": scraped_at,
            "offer_count": len(offers),
            "store_count": len(stores),
            "offer_chains": dict(Counter(row["chain"] for row in offers).most_common()),
            "store_chains": dict(Counter(row["chain"] for row in stores).most_common()),
        },
        "offers": offers,
        "stores": stores,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(app_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(offers)} offers and {len(stores)} stores to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
