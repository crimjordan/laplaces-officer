"""Refresh counts of OSM surveillance-tagged features in three 10 km circles."""
import datetime
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "surveillance.json"
PLACES = {
    "Omaha, Nebraska": (41.2565, -95.9345),
    "Lincoln, Nebraska": (40.8136, -96.7026),
    "Denver, Colorado": (39.7392, -104.9903),
}
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
]

def query_count(lat, lon):
    # Node count only. It is NOT a census of physical cameras.
    query = f'[out:json][timeout:30];node(around:10000,{lat},{lon})["surveillance"];out count;'
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    errors = []
    for endpoint in ENDPOINTS:
        try:
            req = urllib.request.Request(
                endpoint,
                data=data,
                headers={"User-Agent": "LaplacesOfficerResearchObservatory/1.1", "Accept": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=50) as response:
                payload = json.load(response)
            elements = payload.get("elements", [])
            if not elements or elements[0].get("type") != "count":
                raise ValueError("Overpass returned no count element")
            tags = elements[0]["tags"]
            return int(tags["nodes"])
        except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
            errors.append(f"{endpoint}: {exc}")
            time.sleep(2)
    raise RuntimeError("; ".join(errors))

def main():
    results = []
    for name, (lat, lon) in PLACES.items():
        try:
            count = query_count(lat, lon)
            results.append({
                "name": name, "count": count, "radius_km": 10,
                "source": "OpenStreetMap / Overpass", "feature_type": "surveillance-tagged nodes"
            })
            print(f"{name}: {count} mapped nodes", flush=True)
        except RuntimeError as exc:
            print(f"Unable to update {name}: {exc}", flush=True)
            # Do not publish a misleading partial geographic comparison.
            return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "places": results
    }, indent=2) + "\n", encoding="utf-8")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
