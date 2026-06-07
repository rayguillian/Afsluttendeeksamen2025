from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import requests


class SallingApiError(RuntimeError):
    """Raised when the Salling Group API cannot be fetched."""


@dataclass(frozen=True)
class SallingClient:
    token: str
    base_url: str = "https://api.sallinggroup.com"
    timeout_seconds: int = 20
    max_retries: int = 4

    def fetch_food_waste(
        self,
        *,
        zip_code: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_km: float = 5,
    ) -> list[dict[str, Any]]:
        """Fetch discounted nearby products from Salling Group."""
        params: dict[str, str | float] = {}
        if zip_code:
            params["zip"] = zip_code
        elif latitude is not None and longitude is not None:
            params["geo"] = f"{latitude},{longitude}"
            params["radius"] = radius_km
        else:
            raise ValueError("Provide either zip_code or latitude plus longitude.")

        data = self._request_json("/v1/food-waste/", params=params)
        if not isinstance(data, list):
            raise SallingApiError("Unexpected food-waste response shape: expected a list.")
        return data

    def fetch_stores(self, *, max_pages: int = 20, per_page: int = 500) -> list[dict[str, Any]]:
        """Fetch stores from Salling Group's Stores API.

        The food-waste endpoint already includes store coordinates for matched offers.
        This method is useful later if the map needs all nearby Salling stores, including
        stores with no active discounted products.
        """
        stores: list[dict[str, Any]] = []
        for page in range(1, max_pages + 1):
            data = self._request_json("/v2/stores", params={"page": page, "per_page": per_page})
            if not isinstance(data, list):
                raise SallingApiError("Unexpected stores response shape: expected a list.")
            stores.extend(data)
            if len(data) < per_page:
                break
        return stores

    def _request_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "User-Agent": "kobsmart-poc/0.1 (+local proof of concept)",
        }
        last_error: Exception | None = None

        for attempt in range(self.max_retries + 1):
            try:
                response = requests.get(url, headers=headers, params=params, timeout=self.timeout_seconds)
            except requests.RequestException as exc:
                last_error = exc
                self._sleep_before_retry(attempt, None)
                continue

            if response.status_code == 401:
                raise SallingApiError("Salling Group API rejected the token with HTTP 401.")
            if response.status_code == 403:
                raise SallingApiError("Salling Group API returned HTTP 403. Check project access for this API.")
            if response.status_code == 404:
                raise SallingApiError(f"Salling Group API endpoint was not found: {url}")

            if response.status_code in {429, 500, 502, 503, 504}:
                last_error = SallingApiError(f"Salling Group API returned HTTP {response.status_code}.")
                self._sleep_before_retry(attempt, response.headers.get("Retry-After"))
                continue

            try:
                response.raise_for_status()
                return response.json()
            except (requests.RequestException, ValueError) as exc:
                last_error = exc
                self._sleep_before_retry(attempt, response.headers.get("Retry-After"))

        raise SallingApiError(f"Failed to fetch {url}: {last_error}") from last_error

    def _sleep_before_retry(self, attempt: int, retry_after: str | None) -> None:
        if attempt >= self.max_retries:
            return
        delay = _retry_after_seconds(retry_after)
        if delay is None:
            delay = min(2**attempt, 30)
        time.sleep(delay)


def _retry_after_seconds(value: str | None) -> float | None:
    if not value:
        return None
    try:
        return max(float(value), 0)
    except ValueError:
        return None
