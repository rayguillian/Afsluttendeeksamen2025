from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from .etilbudsavis import EtilbudsavisClient
from .normalize import OFFER_COLUMNS, STORE_COLUMNS, normalize_etilbudsavis, normalize_food_waste, normalize_product_name
from .salling import SallingClient
from .sample_data import SAMPLE_FOOD_WASTE
from .xlsx import write_workbook


GROCERY_CHAIN_NAMES = [
    "365discount",
    "Bilka",
    "Brugsen",
    "Coop",
    "Coop365",
    "Dagli'Brugsen",
    "føtex",
    "LET-KØB",
    "Lidl",
    "Løvbjerg",
    "MENY",
    "Min Købmand",
    "Netto",
    "REMA 1000",
    "SPAR",
    "SuperBrugsen",
    "Wolt Market",
]

GROCERY_CHAINS = {normalize_product_name(chain) for chain in GROCERY_CHAIN_NAMES}


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch Danish grocery product data for the KøbSmart POC.")
    parser.add_argument(
        "--source",
        choices=["salling", "etilbudsavis"],
        default="salling",
        help="Data source. Default: salling.",
    )
    parser.add_argument("--zip", dest="zip_code", help="Danish postal code, e.g. 8000.")
    parser.add_argument("--lat", type=float, help="Latitude for nearby store search.")
    parser.add_argument("--lon", type=float, help="Longitude for nearby store search.")
    parser.add_argument("--radius", type=float, default=5, help="Radius in km when using --lat/--lon. Default: 5.")
    parser.add_argument("--output", default="data/kobsmart_offers.xlsx", help="Output XLSX path.")
    parser.add_argument("--raw-json-output", help="Optional path for the raw API response.")
    parser.add_argument("--token", help="Salling Group bearer token. Defaults to SALLING_GROUP_TOKEN.")
    parser.add_argument("--sample", action="store_true", help="Use bundled sample data instead of calling the API.")
    parser.add_argument(
        "--expand-chain-stores",
        action="store_true",
        help="For eTilbudsavis chain-wide offers, duplicate offer rows onto matching nearby stores.",
    )
    parser.add_argument(
        "--chain",
        action="append",
        dest="chains",
        help="Only include a chain. Can be repeated, e.g. --chain Netto --chain 'REMA 1000'.",
    )
    parser.add_argument(
        "--grocery-only",
        action="store_true",
        help="For eTilbudsavis, keep common Danish grocery chains and drop unrelated retailers.",
    )
    args = parser.parse_args()

    scraped_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    raw_payload: object

    if args.sample:
        if args.source != "salling":
            parser.error("--sample currently uses the bundled Salling-like fixture. Use --source salling.")
        raw_payload = SAMPLE_FOOD_WASTE
        offers, stores = normalize_food_waste(SAMPLE_FOOD_WASTE, scraped_at)
    elif args.source == "salling":
        offers, stores, raw_payload = _fetch_salling(args, scraped_at)
    else:
        offers, stores, raw_payload = _fetch_etilbudsavis(args, scraped_at, parser)

    write_workbook(
        args.output,
        {
            "offers": (OFFER_COLUMNS, offers),
            "stores": (STORE_COLUMNS, stores),
        },
    )

    if args.raw_json_output:
        raw_path = Path(args.raw_json_output)
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(json.dumps(raw_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {len(offers)} offers and {len(stores)} stores to {args.output}")
    return 0


def _fetch_salling(args: argparse.Namespace, scraped_at: str) -> tuple[list[dict], list[dict], object]:
    token = args.token or os.environ.get("SALLING_GROUP_TOKEN")
    if not token:
        raise SystemExit("Missing Salling Group token. Set SALLING_GROUP_TOKEN, pass --token, or use --sample.")
    client = SallingClient(token=token)
    payload = client.fetch_food_waste(
        zip_code=args.zip_code,
        latitude=args.lat,
        longitude=args.lon,
        radius_km=args.radius,
    )
    offers, stores = normalize_food_waste(payload, scraped_at)
    return offers, stores, payload


def _fetch_etilbudsavis(
    args: argparse.Namespace,
    scraped_at: str,
    parser: argparse.ArgumentParser,
) -> tuple[list[dict], list[dict], object]:
    if args.lat is None or args.lon is None:
        parser.error("--source etilbudsavis requires --lat and --lon.")
    client = EtilbudsavisClient()
    raw_offers, raw_stores = client.fetch_nearby(
        latitude=args.lat,
        longitude=args.lon,
        radius_km=args.radius,
    )
    chain_filter = _chain_filter(args)
    offers, stores = normalize_etilbudsavis(
        raw_offers,
        raw_stores,
        scraped_at,
        expand_chain_stores=args.expand_chain_stores,
        chains=chain_filter,
    )
    return offers, stores, {"offers": raw_offers, "stores": raw_stores}


def _chain_filter(args: argparse.Namespace) -> set[str] | None:
    if args.chains:
        return {normalize_product_name(chain) for chain in args.chains}
    if args.grocery_only:
        return GROCERY_CHAINS
    return None


if __name__ == "__main__":
    raise SystemExit(main())
