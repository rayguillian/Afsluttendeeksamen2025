"""Build the chain-level shelf-price catalogue (public/data/catalog.json).

This is decoupled from the weekly flyer feed (offers.json): flyer offers are
per-store and expire; shelf prices are national and stable, so they live in
their own file with their own cadence. The app loads both and, at match time,
routes each chain-level price to the shopper's nearest store of that chain.

Currently sources REMA 1000 (the one Danish grocer with a fully open catalogue
API exposing real national shelf prices). Other chains can be added the same way.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from .rema1000 import fetch_catalog, fetch_stores


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the chain-level shelf-price catalogue JSON.")
    parser.add_argument("--output", default="public/data/catalog.json")
    parser.add_argument("--max-pages", type=int, default=None, help="Cap pages per department (smoke tests).")
    parser.add_argument("--scraped-at", default=None)
    args = parser.parse_args()

    scraped_at = args.scraped_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    print("Fetching REMA store locations…")
    stores = fetch_stores()
    print(f"  {len(stores)} stores")

    print("Fetching REMA catalogue (national shelf prices)…")
    products = fetch_catalog(max_pages=args.max_pages)
    print(f"  {len(products)} products")

    payload = {
        "meta": {
            "source": "rema1000",
            "scraped_at": scraped_at,
            "product_count": len(products),
            "store_count": len(stores),
            "product_chains": dict(Counter(p["chain"] for p in products).most_common()),
        },
        "products": products,
        "stores": stores,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(products)} products and {len(stores)} stores to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
