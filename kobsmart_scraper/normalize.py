from __future__ import annotations

import json
import re
import unicodedata
from collections.abc import Iterable
from typing import Any


OFFER_COLUMNS = [
    "scraped_at",
    "source",
    "source_offer_id",
    "chain",
    "dealer_id",
    "catalog_id",
    "store_id",
    "store_name",
    "street",
    "zip",
    "city",
    "latitude",
    "longitude",
    "distance_km",
    "product_name",
    "normalized_product_name",
    "ingredient_keywords",
    "ean",
    "quantity_text",
    "price_dkk",
    "original_price_dkk",
    "discount_dkk",
    "discount_percent",
    "currency",
    "stock",
    "stock_unit",
    "valid_from",
    "valid_to",
    "last_updated",
    "image_url",
]

STORE_COLUMNS = [
    "scraped_at",
    "source",
    "chain",
    "dealer_id",
    "store_id",
    "store_name",
    "street",
    "zip",
    "city",
    "country",
    "latitude",
    "longitude",
    "distance_km",
    "hours_json",
]


def normalize_food_waste(payload: Iterable[dict[str, Any]], scraped_at: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Normalize Salling food-waste results into app-friendly offers and stores."""
    offers: list[dict[str, Any]] = []
    stores_by_id: dict[str, dict[str, Any]] = {}

    for entry in payload:
        store = entry.get("store") or {}
        address = store.get("address") or {}
        longitude, latitude = _coordinates(store.get("coordinates"))
        store_id = store.get("id") or ""

        store_record = {
            "scraped_at": scraped_at,
            "source": "salling_food_waste",
            "chain": store.get("brand") or "",
            "dealer_id": "",
            "store_id": store_id,
            "store_name": store.get("name") or "",
            "street": address.get("street") or "",
            "zip": address.get("zip") or "",
            "city": address.get("city") or "",
            "country": address.get("country") or "",
            "latitude": latitude,
            "longitude": longitude,
            "distance_km": store.get("distance_km"),
            "hours_json": json.dumps(store.get("hours") or [], ensure_ascii=False, separators=(",", ":")),
        }
        if store_id:
            stores_by_id[store_id] = store_record

        for clearance in entry.get("clearances") or []:
            offer = clearance.get("offer") or {}
            product = clearance.get("product") or {}
            product_name = product.get("description") or ""
            normalized_name = normalize_product_name(product_name)

            offers.append(
                {
                    "scraped_at": scraped_at,
                    "source": "salling_food_waste",
                    "source_offer_id": _stable_offer_id(
                        "salling_food_waste",
                        store_id,
                        product.get("ean") or offer.get("ean") or "",
                        offer.get("startTime") or "",
                    ),
                    "chain": store_record["chain"],
                    "dealer_id": "",
                    "catalog_id": "",
                    "store_id": store_id,
                    "store_name": store_record["store_name"],
                    "street": store_record["street"],
                    "zip": store_record["zip"],
                    "city": store_record["city"],
                    "latitude": latitude,
                    "longitude": longitude,
                    "distance_km": store_record["distance_km"],
                    "product_name": product_name,
                    "normalized_product_name": normalized_name,
                    "ingredient_keywords": ingredient_keywords(normalized_name),
                    "ean": product.get("ean") or offer.get("ean") or "",
                    "quantity_text": "",
                    "price_dkk": offer.get("newPrice"),
                    "original_price_dkk": offer.get("originalPrice"),
                    "discount_dkk": offer.get("discount"),
                    "discount_percent": offer.get("percentDiscount"),
                    "currency": offer.get("currency") or "",
                    "stock": offer.get("stock"),
                    "stock_unit": offer.get("stockUnit") or "",
                    "valid_from": offer.get("startTime") or "",
                    "valid_to": offer.get("endTime") or "",
                    "last_updated": offer.get("lastUpdate") or "",
                    "image_url": product.get("image") or "",
                }
            )

    offers.sort(key=lambda row: (str(row["chain"]), str(row["store_name"]), str(row["product_name"])))
    stores = sorted(stores_by_id.values(), key=lambda row: (str(row["chain"]), str(row["store_name"])))
    return offers, stores


def normalize_etilbudsavis(
    raw_offers: Iterable[dict[str, Any]],
    raw_stores: Iterable[dict[str, Any]],
    scraped_at: str,
    *,
    expand_chain_stores: bool = False,
    chains: set[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Normalize eTilbudsavis/Tjek offers and stores into the KøbSmart schema."""
    stores, store_lookup, stores_by_dealer = _normalize_etilbudsavis_stores(raw_stores, scraped_at, chains)
    offers: list[dict[str, Any]] = []

    for offer in raw_offers:
        pricing = offer.get("pricing") or {}
        branding = offer.get("branding") or {}
        images = offer.get("images") or {}
        product_name = offer.get("heading") or offer.get("name") or offer.get("description") or ""
        chain = _chain_name(branding.get("name") or _nested_get(offer, "dealer", "name") or "")

        if chains and _chain_key(chain) not in chains:
            continue

        store_id = str(offer.get("store_id") or "")
        dealer_id = str(offer.get("dealer_id") or "")
        candidate_stores: list[dict[str, Any] | None]
        if store_id and store_id in store_lookup:
            candidate_stores = [store_lookup[store_id]]
        elif expand_chain_stores and dealer_id:
            candidate_stores = stores_by_dealer.get(dealer_id) or [None]
        else:
            candidate_stores = [None]

        for store in candidate_stores:
            normalized_name = normalize_product_name(product_name)
            offers.append(
                {
                    "scraped_at": scraped_at,
                    "source": "etilbudsavis",
                    "source_offer_id": offer.get("id") or "",
                    "chain": chain,
                    "dealer_id": dealer_id,
                    "catalog_id": offer.get("catalog_id") or "",
                    "store_id": (store or {}).get("store_id") or store_id,
                    "store_name": (store or {}).get("store_name") or chain,
                    "street": (store or {}).get("street") or "",
                    "zip": (store or {}).get("zip") or "",
                    "city": (store or {}).get("city") or "",
                    "latitude": (store or {}).get("latitude"),
                    "longitude": (store or {}).get("longitude"),
                    "distance_km": (store or {}).get("distance_km"),
                    "product_name": product_name,
                    "normalized_product_name": normalized_name,
                    "ingredient_keywords": ingredient_keywords(normalized_name),
                    "ean": offer.get("ean") or "",
                    "quantity_text": _quantity_text(offer.get("quantity") or {}),
                    "price_dkk": pricing.get("price"),
                    "original_price_dkk": pricing.get("pre_price"),
                    "discount_dkk": _discount(pricing.get("pre_price"), pricing.get("price")),
                    "discount_percent": _discount_percent(pricing.get("pre_price"), pricing.get("price")),
                    "currency": pricing.get("currency") or "DKK",
                    "stock": "",
                    "stock_unit": "",
                    "valid_from": offer.get("run_from") or "",
                    "valid_to": offer.get("run_till") or "",
                    "last_updated": offer.get("updated_at") or offer.get("created_at") or "",
                    "image_url": images.get("view") or images.get("thumb") or "",
                }
            )

    offers.sort(
        key=lambda row: (
            str(row["chain"]),
            str(row["store_name"]),
            str(row["product_name"]),
            str(row["source_offer_id"]),
        )
    )
    return offers, stores


def normalize_product_name(value: str) -> str:
    """Make product names easier to match against recipe ingredients."""
    value = (
        value.replace("æ", "ae")
        .replace("Æ", "Ae")
        .replace("ø", "oe")
        .replace("Ø", "Oe")
        .replace("å", "aa")
        .replace("Å", "Aa")
    )
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = re.sub(r"\b\d+(?:[,.]\d+)?\s*(g|kg|ml|l|stk|pk|cl)\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


# Brand/house-label tokens that leak into REMA names but say nothing about the
# ingredient. Kept small and conservative — only unmistakable own-brands.
KEYWORD_NOISE = {
    "og", "med", "uden", "the", "a", "an", "sf",
    "bavinchi", "loesvaegt", "snurre",
}


def ingredient_keywords(normalized_product_name: str) -> str:
    """Ingredient-matching keywords from a normalized name.

    Drops pure numbers and number+unit tokens (pack sizes like ``250`` or
    ``805`` that survive name normalization), house-brand noise, and short
    fillers — they pollute recipe→product matching without adding signal.
    """
    words = []
    for word in normalized_product_name.split():
        if len(word) <= 2 or word in KEYWORD_NOISE:
            continue
        if re.fullmatch(r"\d+(?:[a-z]+)?", word):  # 250, 805, 290g, 1kg ...
            continue
        words.append(word)
    return ", ".join(words[:8])


def _coordinates(raw_coordinates: Any) -> tuple[float | None, float | None]:
    if not isinstance(raw_coordinates, list | tuple) or len(raw_coordinates) < 2:
        return None, None
    longitude, latitude = raw_coordinates[0], raw_coordinates[1]
    return _float_or_none(longitude), _float_or_none(latitude)


def _float_or_none(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_etilbudsavis_stores(
    raw_stores: Iterable[dict[str, Any]],
    scraped_at: str,
    chains: set[str] | None,
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    stores: list[dict[str, Any]] = []
    store_lookup: dict[str, dict[str, Any]] = {}
    stores_by_dealer: dict[str, list[dict[str, Any]]] = {}

    for store in raw_stores:
        branding = store.get("branding") or {}
        chain = _chain_name(branding.get("name") or store.get("name") or "")
        if chains and _chain_key(chain) not in chains:
            continue
        store_id = str(store.get("id") or "")
        dealer_id = str(store.get("dealer_id") or "")
        latitude = _float_or_none(store.get("latitude") or _nested_get(store, "location", "lat"))
        longitude = _float_or_none(store.get("longitude") or _nested_get(store, "location", "lng"))
        record = {
            "scraped_at": scraped_at,
            "source": "etilbudsavis",
            "chain": chain,
            "dealer_id": dealer_id,
            "store_id": store_id,
            "store_name": store.get("name") or branding.get("name") or chain,
            "street": store.get("street") or "",
            "zip": store.get("zip_code") or store.get("zip") or "",
            "city": store.get("city") or "",
            "country": _country_code(store.get("country")),
            "latitude": latitude,
            "longitude": longitude,
            "distance_km": _meters_to_km(store.get("distance") or store.get("distance_meters")),
            "hours_json": json.dumps(store.get("hours") or store.get("opening_hours") or [], ensure_ascii=False, separators=(",", ":")),
        }
        stores.append(record)
        if store_id:
            store_lookup[store_id] = record
        if dealer_id:
            stores_by_dealer.setdefault(dealer_id, []).append(record)

    stores.sort(key=lambda row: (str(row["chain"]), str(row["store_name"]), str(row["street"])))
    return stores, store_lookup, stores_by_dealer


def _chain_name(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _chain_key(value: Any) -> str:
    return normalize_product_name(str(value))


def _nested_get(value: dict[str, Any], *path: str) -> Any:
    current: Any = value
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _quantity_text(quantity: dict[str, Any]) -> str:
    size = quantity.get("size") or {}
    unit = quantity.get("unit") or {}
    size_from = size.get("from") or size.get("value") or ""
    size_to = size.get("to") or ""
    unit_symbol = unit.get("symbol") or unit.get("name") or ""
    if size_to and size_to != size_from:
        return f"{size_from}-{size_to} {unit_symbol}".strip()
    return f"{size_from} {unit_symbol}".strip()


def _discount(original_price: Any, price: Any) -> float | None:
    original = _float_or_none(original_price)
    current = _float_or_none(price)
    if original is None or current is None:
        return None
    discount = original - current
    if discount <= 0:
        return None
    return round(discount, 2)


def _discount_percent(original_price: Any, price: Any) -> float | None:
    original = _float_or_none(original_price)
    discount = _discount(original_price, price)
    if original is None or original <= 0 or discount is None:
        return None
    return round((discount / original) * 100, 2)


def _meters_to_km(value: Any) -> float | None:
    meters = _float_or_none(value)
    if meters is None:
        return None
    return round(meters / 1000, 3)


def _stable_offer_id(*parts: str) -> str:
    return "::".join(part for part in parts if part)


def _country_code(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("id") or "")
    return str(value or "DK")
