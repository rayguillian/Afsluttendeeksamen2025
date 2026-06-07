"""REMA 1000 shelf-price scraper.

Unlike the flyer feeds (eTilbudsavis, Salling food-waste), REMA 1000's public
app API exposes the FULL product catalogue with regular shelf prices — not just
this week's discounts. REMA runs uniform national pricing, so one price applies
to every REMA store; the app attaches that price to the nearest REMA store when
building a route.

API: https://api.digital.rema1000.dk/api/v3
  /departments                      → top-level food/non-food categories
  /departments/{id}/products        → paginated products with prices[]

This is a public, unauthenticated JSON API used by the REMA app. Respect it:
modest page sizes, a small delay between requests, and a clear User-Agent.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import requests

from .normalize import ingredient_keywords, normalize_product_name

BASE_URL = "https://api.digital.rema1000.dk/api/v3"
CHAIN = "REMA 1000"

# Food departments only (skip 100 Husholdning, 110 Baby, 120 Personlig pleje).
FOOD_DEPARTMENTS = {10, 20, 30, 40, 50, 60, 70, 80, 90, 130, 140, 160}


class Rema1000Error(RuntimeError):
    pass


@dataclass
class Rema1000Client:
    base_url: str = BASE_URL
    timeout_seconds: float = 20.0
    delay_seconds: float = 0.25
    session: requests.Session = field(default_factory=requests.Session)

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"
        headers = {"User-Agent": "KobSmart/price-compare (educational MVP)", "Accept": "application/json"}
        for attempt in range(4):
            try:
                r = self.session.get(url, headers=headers, params=params, timeout=self.timeout_seconds)
            except requests.RequestException as exc:
                if attempt == 3:
                    raise Rema1000Error(f"Failed to fetch {url}: {exc}") from exc
                time.sleep(1.5 * (attempt + 1))
                continue
            if r.status_code == 429:
                time.sleep(float(r.headers.get("Retry-After", 2)) + 1)
                continue
            if not r.ok:
                raise Rema1000Error(f"REMA API HTTP {r.status_code} for {url}")
            return r.json()
        raise Rema1000Error(f"Exhausted retries for {url}")

    def departments(self) -> list[dict[str, Any]]:
        return self._get("departments").get("data", [])

    def stores(self, *, per_page: int = 100, max_pages: int | None = None):
        page = 1
        while True:
            payload = self._get("stores", {"per_page": per_page, "page": page})
            for store in payload.get("data", []):
                yield store
            pagination = (payload.get("meta") or {}).get("pagination") or {}
            last_page = pagination.get("last_page", page)
            if page >= last_page or (max_pages and page >= max_pages):
                return
            page += 1
            time.sleep(self.delay_seconds)

    def department_products(self, dept_id: int, *, per_page: int = 100, max_pages: int | None = None):
        page = 1
        while True:
            payload = self._get(f"departments/{dept_id}/products", {"per_page": per_page, "page": page})
            for product in payload.get("data", []):
                yield product
            pagination = (payload.get("meta") or {}).get("pagination") or {}
            last_page = pagination.get("last_page", page)
            if page >= last_page or (max_pages and page >= max_pages):
                return
            page += 1
            time.sleep(self.delay_seconds)


def _active_price(prices: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Pick the price the customer pays now (lowest active), and note if it's a campaign."""
    if not prices:
        return None
    # All entries are typically currently active; prefer the lowest numeric price.
    active = [p for p in prices if isinstance(p.get("price"), (int, float))]
    if not active:
        return None
    return min(active, key=lambda p: p["price"])


def fetch_catalog(client: Rema1000Client | None = None, *, max_pages: int | None = None) -> list[dict[str, Any]]:
    """Full REMA food catalogue as normalized product records (chain-level price)."""
    client = client or Rema1000Client()
    food_depts = [d for d in client.departments() if d.get("id") in FOOD_DEPARTMENTS]
    records: list[dict[str, Any]] = []
    seen: set[int] = set()
    for dept in food_depts:
        for product in client.department_products(dept["id"], max_pages=max_pages):
            pid = product.get("id")
            if pid in seen:
                continue
            seen.add(pid)
            price = _active_price(product.get("prices") or [])
            if not price:
                continue
            name = product.get("name") or ""
            underline = product.get("underline") or ""
            full_name = f"{name} {underline}".strip()
            normalized = normalize_product_name(full_name)
            records.append({
                "chain": CHAIN,
                "product_id": pid,
                "product_name": name.title() if name.isupper() else name,
                "underline": underline,
                "normalized_product_name": normalized,
                "ingredient_keywords": ingredient_keywords(normalized),
                "price_dkk": round(float(price["price"]), 2),
                "is_campaign": bool(price.get("is_campaign")),
                "compare_unit": price.get("compare_unit"),
                "compare_unit_price": price.get("compare_unit_price"),
                "department": dept.get("name"),
            })
    return records


def fetch_stores(client: Rema1000Client | None = None, *, max_pages: int | None = None) -> list[dict[str, Any]]:
    """All REMA stores with coordinates, in the KøbSmart store schema.

    REMA prices are national, so the app routes a catalogue price to whichever of
    these stores is nearest the shopper at match time.
    """
    client = client or Rema1000Client()
    stores: list[dict[str, Any]] = []
    for store in client.stores(max_pages=max_pages):
        loc = store.get("location") or {}
        lat, lng = loc.get("latitude"), loc.get("longitude")
        if lat is None or lng is None:
            continue
        stores.append({
            "chain": CHAIN,
            "store_id": str(store.get("id") or ""),
            "store_name": store.get("name") or "",
            "street": store.get("address") or "",
            "zip": str(store.get("postal_code") or ""),
            "city": store.get("city") or "",
            "latitude": round(float(lat), 6),
            "longitude": round(float(lng), 6),
        })
    return stores
