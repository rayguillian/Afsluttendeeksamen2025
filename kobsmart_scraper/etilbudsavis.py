from __future__ import annotations

import time
from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt
from typing import Any

import requests


class EtilbudsavisApiError(RuntimeError):
    """Raised when the eTilbudsavis/Tjek endpoint cannot be fetched."""


@dataclass(frozen=True)
class EtilbudsavisClient:
    base_url: str = "https://api.etilbudsavis.dk"
    timeout_seconds: int = 20
    page_limit: int = 100
    max_pages: int = 10
    sleep_seconds: float = 0.5

    def fetch_nearby(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_km: float = 10,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        radius_meters = int(radius_km * 1000)
        params = {
            "r_lat": latitude,
            "r_lng": longitude,
            "r_radius": radius_meters,
        }
        offers = self._fetch_paginated("/v2/offers", params)
        stores = self._fetch_paginated("/v2/stores", params)
        stores = [_with_distance(store, latitude, longitude) for store in stores]
        return offers, stores

    def _fetch_paginated(self, path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for page_index in range(self.max_pages):
            page_params = dict(params)
            page_params["offset"] = page_index * self.page_limit
            page_params["limit"] = self.page_limit
            data = self._request_json(path, page_params)
            if not isinstance(data, list):
                raise EtilbudsavisApiError(f"Unexpected response shape for {path}: expected a list.")
            rows.extend(data)
            if len(data) < self.page_limit:
                break
            time.sleep(self.sleep_seconds)
        return rows

    def _request_json(self, path: str, params: dict[str, Any]) -> Any:
        url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"
        headers = {
            "Accept": "application/json",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        }
        try:
            response = requests.get(url, params=params, headers=headers, timeout=self.timeout_seconds)
        except requests.RequestException as exc:
            raise EtilbudsavisApiError(f"Failed to fetch {url}: {exc}") from exc

        if response.status_code != 200:
            raise EtilbudsavisApiError(f"eTilbudsavis returned HTTP {response.status_code}: {response.text[:300]}")

        try:
            return response.json()
        except ValueError as exc:
            raise EtilbudsavisApiError(f"eTilbudsavis returned invalid JSON from {url}.") from exc


def _with_distance(store: dict[str, Any], latitude: float, longitude: float) -> dict[str, Any]:
    store_copy = dict(store)
    store_latitude = _float_or_none(store.get("latitude"))
    store_longitude = _float_or_none(store.get("longitude"))
    if store_latitude is not None and store_longitude is not None:
        store_copy["distance_meters"] = round(_haversine_km(latitude, longitude, store_latitude, store_longitude) * 1000)
    return store_copy


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0088
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(radians, [lat1, lon1, lat2, lon2])
    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    return 2 * radius_km * asin(sqrt(a))


def _float_or_none(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
