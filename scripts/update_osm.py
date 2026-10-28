"""Collect multicity OSM surveillance counts from ohsome's aggregation API.

Each city uses an approximate 20 km by 20 km bounding box, centered at
the specified coordinates. Results count OSM nodes tagged surveillance=*.
Missing API data are never represented as zero.
"""
import datetime
import json
import math
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "surveillance.json"
CITIES = {
    "Omaha, NE": (41.2565, -95.9345),
    "Lincoln, NE": (40.8136, -96.7026),
    "Denver, CO": (39.7392, -104.9903),
    "New York, NY": (40.7128, -74.0060),
    "Los Angeles, CA": (34.0522, -118.2437),
    "Chicago, IL": (41.8781, -87.6298),
    "Houston, TX": (29.7604, -95.3698),
    "Phoenix, AZ": (33.4484, -112.0740),
    "Philadelphia, PA": (39.9526, -75.1636),
    "San Antonio, TX": (29.4241, -98.4936),
    "San Diego, CA": (32.7157, -117.1611),
    "Dallas, TX": (32.7767, -96.7970),
    "Jacksonville, FL": (30.3322, -81.6557),
    "Fort Worth, TX": (32.7555, -97.3308),
    "Columbus, OH": (39.9612, -82.9988),
    "Indianapolis, IN": (39.7684, -86.1581),
    "Charlotte, NC": (35.2271, -80.8431),
    "Washington, DC": (38.9072, -77.0369),
    "Seattle, WA": (47.6062, -122.3321),
    "Boston, MA": (42.3601, -71.0589),
    "Portland, OR": (45.5152, -122.6784),
    "San Francisco, CA": (37.7749, -122.4194),
    "Minneapolis, MN": (44.9778, -93.2650),
    "Atlanta, GA": (33.7490, -84.3880),
    "Miami, FL": (25.7617, -80.1918),
}
ENDPOINT = "https://api.ohsome.org/v1/elements/count"
FILTER = "surveillance=* and type:node"
HALF_LAT = 10 / 111.32

def bbox(lat, lon):
    half_lon = 10 / (111.32 * math.cos(math.radians(lat)))
    return ",".join(f"{v:.6f}" for v in
                    (lon - half_lon, lat - HALF_LAT, lon + half_lon, lat + HALF_LAT))

def query_count(lat, lon, date):
    data = urllib.parse.urlencode({
        "bboxes": bbox(lat, lon),
        "filter": FILTER,
        "time": date,
        "format": "json",
    }).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=data,
        headers={"User-Agent": "LaplacesOfficerObservatory/2.0 (academic demonstration)",
                 "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        payload = json.load(response)
    result = payload.get("result", [])
    if not result or not isinstance(result[0].get("value"), (int, float)):
        raise ValueError("ohsome returned no valid numeric count")
    return int(result[0]["value"])

def main():
    previous = {}
    if OUT.exists():
        try:
            previous = {p["name"]: p for p in json.loads(OUT.read_text()).get("places", [])}
        except (ValueError, TypeError, KeyError):
            pass
    today = datetime.datetime.now(datetime.timezone.utc).date()
    # A fixed historical reference avoids conflating mapped changes with crime trends.
    dates = [today.isoformat(), f"{today.year - 3}-01-01"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    places = []
    successes = 0
    for name, (lat, lon) in CITIES.items():
        counts = {}
        errors = []
        for date in dates:
            try:
                counts[date] = query_count(lat, lon, date)
            except Exception as exc:
                errors.append(f"{date}: {exc}")
            time.sleep(0.2)
        if dates[0] in counts:
            successes += 1
            record = {
                "name": name, "count": counts[dates[0]],
                "historical_count": counts.get(dates[1]),
                "historical_date": dates[1],
                "status": "current", "observed_at": now,
                "lat": lat, "lon": lon,
                "source": "OpenStreetMap via ohsome API",
                "coverage": "approximately 20 km x 20 km bounding box",
                "feature_type": "OSM nodes tagged surveillance=*",
            }
            print(f"{name}: {record['count']} mapped nodes", flush=True)
        elif name in previous and previous[name].get("count") is not None:
            record = dict(previous[name])
            record["status"] = "stale"
            print(f"WARNING {name}: retaining prior count; {'; '.join(errors)}", flush=True)
        else:
            record = {
                "name": name, "count": None, "historical_count": counts.get(dates[1]),
                "status": "unavailable", "lat": lat, "lon": lon,
                "source": "OpenStreetMap via ohsome API",
                "coverage": "approximately 20 km x 20 km bounding box",
                "feature_type": "OSM nodes tagged surveillance=*",
            }
            print(f"WARNING {name}: {'; '.join(errors)}", flush=True)
        places.append(record)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "updated": now, "source": "ohsome API / OpenStreetMap",
        "coverage_note": "Fixed-size approximate geographic boxes; not municipal boundaries.",
        "places": places,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(places)} cities, {successes} with current counts", flush=True)

if __name__ == "__main__":
    main()
