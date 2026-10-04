import math
import re
import sqlite3
import logging
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = Path("backend/data/kost_data.db")
DEFAULT_TARGET_URL = "https://maps.app.goo.gl/TDmLQEU1tCk2zDvV8"
OSRM_BASE_URL = "http://router.project-osrm.org"


class GeoService:
    """
    Layanan geocoding Google Maps, routing OSRM (mobil, motor, jalan kaki),
    dan caching rute di SQLite.
    """

    def __init__(self, db_path: Path = DEFAULT_DB_PATH, default_target_url: str = DEFAULT_TARGET_URL):
        self.db_path = Path(db_path)
        self.default_target_url = default_target_url
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._target_cache: Optional[Dict[str, Any]] = None

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS osrm_route_cache (
                    origin_coord TEXT,
                    destination_coord TEXT,
                    profile TEXT,
                    distance_km REAL,
                    duration_min REAL,
                    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (origin_coord, destination_coord, profile)
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS target_locations (
                    url TEXT PRIMARY KEY,
                    name TEXT,
                    latitude REAL,
                    longitude REAL,
                    resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()

    def resolve_target_location(self, target_input: Optional[str] = None) -> Dict[str, Any]:
        raw_input = (target_input or self.default_target_url).strip()

        # 1. Cek jika format input koordinat langsung: "-6.24071, 106.83114"
        coord_direct_match = re.match(r'^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$', raw_input)
        if coord_direct_match:
            lat = float(coord_direct_match.group(1))
            lng = float(coord_direct_match.group(2))
            result = {
                "url": f"https://www.google.com/maps/@{lat},{lng},17z",
                "name": f"Koordinat ({lat:.5f}, {lng:.5f})",
                "latitude": lat,
                "longitude": lng
            }
            self._target_cache = result
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO target_locations (url, name, latitude, longitude)
                    VALUES (?, ?, ?, ?)
                """, (result["url"], result["name"], lat, lng))
                conn.commit()
            return result

        url = raw_input
        if self._target_cache and (self._target_cache.get("url") == url or self._target_cache.get("name") == url):
            return self._target_cache

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT url, name, latitude, longitude FROM target_locations WHERE url = ? OR name = ?", (url, url))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                self._target_cache = data
                return data

        headers = {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            with httpx.Client(headers=headers, follow_redirects=True, timeout=15.0) as client:
                resp = client.get(url)
                final_url = str(resp.url)
        except Exception as e:
            logger.error(f"Gagal unshorten URL {url}: {e}")
            fallback = {
                "url": url,
                "name": "Datacomm Diangraha Pt., Mampang Prpt.",
                "latitude": -6.2407128,
                "longitude": 106.8311353
            }
            return fallback

        lat, lng = None, None
        name = "Lokasi Tujuan"

        place_match = re.search(r'/place/([^/@?]+)', final_url)
        if place_match:
            name = place_match.group(1).replace('+', ' ')

        pin_match = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', final_url)
        if pin_match:
            lat = float(pin_match.group(1))
            lng = float(pin_match.group(2))
        else:
            center_match = re.search(r'/@(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
            if center_match:
                lat = float(center_match.group(1))
                lng = float(center_match.group(2))
            else:
                q_match = re.search(r'[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
                if q_match:
                    lat = float(q_match.group(1))
                    lng = float(q_match.group(2))

        if lat is None or lng is None:
            lat, lng = -6.2407128, 106.8311353

        result = {
            "url": url,
            "name": name,
            "latitude": lat,
            "longitude": lng
        }

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO target_locations (url, name, latitude, longitude)
                VALUES (?, ?, ?, ?)
            """, (url, name, lat, lng))
            conn.commit()

        self._target_cache = result
        return result

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Kalkulasi jarak garis lurus bola bumi (km) via Haversine formula.
        """
        r = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(r * c, 2)

    def get_route(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, profile: str = "driving") -> Dict[str, Any]:
        """
        Mengambil jarak rute dan durasi dengan caching lokal SQLite.
        Profile didukung: 'driving', 'motorcycle', 'walking'.
        """
        orig_key = f"{origin_lat:.6f},{origin_lng:.6f}"
        dest_key = f"{dest_lat:.6f},{dest_lng:.6f}"

        # 1. Cek SQLite cache
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT distance_km, duration_min FROM osrm_route_cache
                WHERE origin_coord = ? AND destination_coord = ? AND profile = ?
            """, (orig_key, dest_key, profile))
            row = cursor.fetchone()
            if row:
                return {
                    "distance_km": row["distance_km"],
                    "duration_min": row["duration_min"],
                    "source": "cache"
                }

        # 2. Query OSRM
        osrm_profile = "walking" if profile == "walking" else "driving"
        osrm_url = f"{OSRM_BASE_URL}/route/v1/{osrm_profile}/{origin_lng},{origin_lat};{dest_lng},{dest_lat}?overview=false"

        distance_km = None
        duration_min = None
        source = "osrm"

        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(osrm_url)
                if resp.status_code == 200:
                    data = resp.json()
                    routes = data.get("routes", [])
                    if routes:
                        r0 = routes[0]
                        raw_dist = r0.get("distance", 0.0) / 1000.0  # meter -> km
                        raw_dur = r0.get("duration", 0.0) / 60.0    # detik -> menit

                        if profile == "motorcycle":
                            distance_km = round(raw_dist, 2)
                            duration_min = round(max(raw_dur * 0.75, 1.0), 1)
                        elif profile == "walking":
                            distance_km = round(raw_dist, 2)
                            duration_min = round(raw_dur, 1)
                        else:
                            distance_km = round(raw_dist, 2)
                            duration_min = round(raw_dur, 1)
        except Exception as e:
            logger.warning(f"OSRM request failed ({e}), fallback ke Haversine.")

        # 3. Fallback jika OSRM error
        if distance_km is None or duration_min is None:
            straight = self.haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
            source = "haversine_fallback"
            distance_km = round(straight * 1.35, 2)
            if profile == "walking":
                duration_min = round((distance_km / 4.5) * 60.0, 1)
            elif profile == "motorcycle":
                duration_min = round((distance_km / 25.0) * 60.0, 1)
            else:
                duration_min = round((distance_km / 18.0) * 60.0, 1)

        # 4. Simpan ke SQLite cache
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO osrm_route_cache
                (origin_coord, destination_coord, profile, distance_km, duration_min)
                VALUES (?, ?, ?, ?, ?)
            """, (orig_key, dest_key, profile, distance_km, duration_min))
            conn.commit()

        return {
            "distance_km": distance_km,
            "duration_min": duration_min,
            "source": source
        }

    def calculate_all_routes(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict[str, Any]:
        """
        Menghitung seluruh profil: Haversine, driving, motorcycle, walking,
        serta menghasilkan Google Maps directions link.
        """
        straight = self.haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
        drive = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng, profile="driving")
        motor = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng, profile="motorcycle")
        walk = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng, profile="walking")
        gmaps_url = self.generate_gmaps_directions_url(origin_lat, origin_lng, dest_lat, dest_lng)

        return {
            "straight_distance_km": straight,
            "driving_distance_km": drive["distance_km"],
            "driving_duration_min": drive["duration_min"],
            "motorcycle_distance_km": motor["distance_km"],
            "motorcycle_duration_min": motor["duration_min"],
            "walking_distance_km": walk["distance_km"],
            "walking_duration_min": walk["duration_min"],
            "url_gmaps_route": gmaps_url,
            "driving_source": drive["source"]
        }

    def recalculate_all_kost_routes(self, target_lat: float, target_lng: float) -> int:
        """
        Menghitung ulang jarak dan rute seluruh kost di database terhadap lokasi target baru.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, latitude, longitude FROM kost_listings WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
            rows = cursor.fetchall()

        updated_count = 0
        for r in rows:
            kost_id, k_lat, k_lng = r["id"], r["latitude"], r["longitude"]
            routes = self.calculate_all_routes(k_lat, k_lng, target_lat, target_lng)
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE kost_listings SET
                        straight_distance_km = :straight_distance_km,
                        driving_distance_km = :driving_distance_km,
                        driving_duration_min = :driving_duration_min,
                        motorcycle_distance_km = :motorcycle_distance_km,
                        motorcycle_duration_min = :motorcycle_duration_min,
                        walking_distance_km = :walking_distance_km,
                        walking_duration_min = :walking_duration_min,
                        url_gmaps_route = :url_gmaps_route
                    WHERE id = :id
                """, {**routes, "id": str(kost_id)})
                conn.commit()
            updated_count += 1

        return updated_count

    @staticmethod
    def generate_gmaps_directions_url(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, mode: str = "driving") -> str:
        return f"https://www.google.com/maps/dir/?api=1&origin={origin_lat:.6f},{origin_lng:.6f}&destination={dest_lat:.6f},{dest_lng:.6f}&travelmode={mode}"
