"""Fetch best-effort OpenStreetMap surveillance counts without losing successful cities."""
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
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

def count_nodes(lat, lon):
    # Bounding circle, 10 km radius; OSM surveillance-tagged nodes only.
    query = f'[out:json][timeout:20];node(around:10000,{lat},{lon})["surveillance"];out count;'
    data = urllib.parse.urlencode({"data": query}).encode()
    errors = []
    for endpoint in ENDPOINTS:
        try:
            req = urllib.request.Request(endpoint, data=data, headers={
                "User-Agent": "LaplacesOfficerResearchObservatory/1.2",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=25) as response:
                payload = json.load(response)
            entry = payload["elements"][0]
            if entry.get("type") != "count":
                raise ValueError("No count returned")
            return int(entry["tags"]["nodes"])
        except (Exception,) as exc:
            errors.append(f"{endpoint}: {exc}")
            time.sleep(1)
    raise RuntimeError("; ".join(errors))

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
            count = count_nodes(lat, lon)
            places.append({"name": name, "count": count, "radius_km": 10,
                           "source": "OpenStreetMap / Overpass",
                           "feature_type": "surveillance-tagged nodes",
                           "status": "current", "observed_at": now})
            print(f"{name}: {count} mapped nodes", flush=True)
        except RuntimeError as exc:
            print(f"WARNING {name}: {exc}", flush=True)
            if name in previous:
                old = dict(previous[name])
                old["status"] = "stale"
                places.append(old)
            else:
                places.append({"name": name, "count": None, "radius_km": 10,
                               "source": "OpenStreetMap / Overpass",
                               "feature_type": "surveillance-tagged nodes",
                               "status": "unavailable"})
    if not any(p.get("status") == "current" for p in places):
        print("All sources unavailable: preserving last snapshot", flush=True)
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"updated": now, "places": places}, indent=2) + "\n")
    print("Saved surveillance snapshot; unavailable cities explicitly marked", flush=True)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
