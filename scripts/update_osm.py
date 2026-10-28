"""Best-effort OSM surveillance node counts using small bounded queries.

Each city is split into a 4x4 grid. Counts cover a 20 km x 20 km
latitude/longitude approximation centered on the city, not a 10 km circle.
No individual camera locations are stored.
"""
import datetime
import json
import time
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
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
# Approximate bounding-box half-widths, in degrees.
LAT_HALF = 10 / 111.32
def count_box(south, west, north, east):
    q = f'[out:json][timeout:15];node["surveillance"]({south:.6f},{west:.6f},{north:.6f},{east:.6f});out count;'
    data = urllib.parse.urlencode({"data": q}).encode()
    errors = []
    for endpoint in ENDPOINTS:
        try:
            req = urllib.request.Request(endpoint, data=data, headers={
                "User-Agent": "LaplacesOfficerResearchObservatory/1.3",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=20) as response:
                payload = json.load(response)
            item = payload["elements"][0]
            if item.get("type") != "count":
                raise ValueError("missing count")
            return int(item["tags"]["nodes"])
        except Exception as exc:
            errors.append(f"{endpoint}: {exc}")
    raise RuntimeError("; ".join(errors))

def count_city(lat, lon):
    import math
    lon_half = 10 / (111.32 * math.cos(math.radians(lat)))
    n = 4
    total = 0
    for y in range(n):
        for x in range(n):
            south = lat - LAT_HALF + y * (2 * LAT_HALF / n)
            north = lat - LAT_HALF + (y + 1) * (2 * LAT_HALF / n)
            west = lon - lon_half + x * (2 * lon_half / n)
            east = lon - lon_half + (x + 1) * (2 * lon_half / n)
            total += count_box(south, west, north, east)
            time.sleep(.15)
    return total

def main():
    previous = {}
    if OUT.exists():
        try:
            previous = {p["name"]: p for p in json.loads(OUT.read_text()).get("places", [])}
        except (ValueError, KeyError, TypeError):
            pass
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    places = []
    for name, (lat, lon) in PLACES.items():
        try:
            count = count_city(lat, lon)
            places.append({
                "name": name, "count": count, "source": "OpenStreetMap / Overpass",
                "feature_type": "surveillance-tagged nodes",
                "coverage": "approximately 20 km x 20 km bounding box",
                "status": "current", "observed_at": now,
            })
            print(f"{name}: {count} mapped nodes", flush=True)
        except RuntimeError as exc:
            print(f"WARNING {name}: {exc}", flush=True)
            if name in previous and previous[name].get("count") is not None:
                old = dict(previous[name])
                old["status"] = "stale"
                places.append(old)
            else:
                places.append({
                    "name": name, "count": None,
                    "source": "OpenStreetMap / Overpass",
                    "coverage": "approximately 20 km x 20 km bounding box",
                    "status": "unavailable",
                })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"updated": now, "places": places}, indent=2) + "\n")
    print("Saved snapshot with explicit unavailable statuses", flush=True)

if __name__ == "__main__":
    main()
