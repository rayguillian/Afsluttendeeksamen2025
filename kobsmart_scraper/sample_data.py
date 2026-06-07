"""Small Salling-like fixture used when no API token is available."""

SAMPLE_FOOD_WASTE = [
    {
        "clearances": [
            {
                "offer": {
                    "currency": "DKK",
                    "discount": 7,
                    "ean": "5704000474742",
                    "endTime": "2026-06-04T21:59:00.000Z",
                    "lastUpdate": "2026-06-04T10:14:12.000Z",
                    "newPrice": 15,
                    "originalPrice": 22,
                    "percentDiscount": 31.82,
                    "startTime": "2026-06-04T07:00:00.000Z",
                    "stock": 4,
                    "stockUnit": "each",
                },
                "product": {
                    "description": "SF HOENSESALAT 250G",
                    "ean": "5704000474742",
                    "image": "https://example.invalid/images/hoensesalat.jpg",
                },
            },
            {
                "offer": {
                    "currency": "DKK",
                    "discount": 5,
                    "ean": "5712871027741",
                    "endTime": "2026-06-04T21:59:00.000Z",
                    "lastUpdate": "2026-06-04T11:02:48.000Z",
                    "newPrice": 10,
                    "originalPrice": 15,
                    "percentDiscount": 33.33,
                    "startTime": "2026-06-04T07:00:00.000Z",
                    "stock": 9,
                    "stockUnit": "each",
                },
                "product": {
                    "description": "GULERODDER 1KG",
                    "ean": "5712871027741",
                    "image": "https://example.invalid/images/gulerodder.jpg",
                },
            },
        ],
        "store": {
            "address": {
                "city": "Aarhus C",
                "country": "DK",
                "extra": None,
                "street": "Jaegergaardsgade 64-70",
                "zip": "8000",
            },
            "brand": "netto",
            "coordinates": [10.200813, 56.148021],
            "distance_km": 0.8,
            "hours": [
                {
                    "date": "2026-06-04",
                    "type": "store",
                    "open": "2026-06-04T07:00:00",
                    "close": "2026-06-04T23:00:00",
                    "closed": False,
                }
            ],
            "name": "Netto Jaegergaardsgade",
            "id": "sample-netto-jaegergaardsgade",
            "type": "Point",
        },
    },
    {
        "clearances": [
            {
                "offer": {
                    "currency": "DKK",
                    "discount": 12,
                    "ean": "5701234567890",
                    "endTime": "2026-06-04T20:59:00.000Z",
                    "lastUpdate": "2026-06-04T09:42:01.000Z",
                    "newPrice": 28,
                    "originalPrice": 40,
                    "percentDiscount": 30,
                    "startTime": "2026-06-04T08:00:00.000Z",
                    "stock": 3,
                    "stockUnit": "each",
                },
                "product": {
                    "description": "KYLLINGEBRYST 450G",
                    "ean": "5701234567890",
                    "image": "https://example.invalid/images/kyllingebryst.jpg",
                },
            }
        ],
        "store": {
            "address": {
                "city": "Aarhus C",
                "country": "DK",
                "extra": None,
                "street": "Frederiks Alle 22",
                "zip": "8000",
            },
            "brand": "foetex",
            "coordinates": [10.197275, 56.151202],
            "distance_km": 1.1,
            "hours": [
                {
                    "date": "2026-06-04",
                    "type": "store",
                    "open": "2026-06-04T08:00:00",
                    "close": "2026-06-04T21:00:00",
                    "closed": False,
                }
            ],
            "name": "foetex Frederiks Alle",
            "id": "sample-foetex-frederiks-alle",
            "type": "Point",
        },
    },
]
