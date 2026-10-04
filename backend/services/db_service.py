import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from backend.services.scoring_service import ScoringService

DEFAULT_DB_PATH = Path("backend/data/kost_data.db")


class DBService:
    """
    Layanan persistensi SQLite untuk kost_listings dan cache sistem.
    """

    def __init__(self, db_path: Path = DEFAULT_DB_PATH):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kost_listings (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    slug TEXT,
                    gender_type TEXT,
                    price_monthly INTEGER,
                    room_available INTEGER,
                    room_size TEXT,
                    facilities_room TEXT,
                    facilities_shared TEXT,
                    full_address TEXT,
                    district TEXT,
                    city TEXT,
                    latitude REAL,
                    longitude REAL,
                    straight_distance_km REAL,
                    driving_distance_km REAL,
                    driving_duration_min REAL,
                    motorcycle_distance_km REAL,
                    motorcycle_duration_min REAL,
                    walking_distance_km REAL,
                    walking_duration_min REAL,
                    vfm_score REAL,
                    vfm_category TEXT,
                    owner_phone TEXT,
                    is_detail_enriched INTEGER DEFAULT 0,
                    url_detail TEXT,
                    url_gmaps_route TEXT,
                    cover_photo TEXT,
                    rating REAL DEFAULT 0,
                    review_count INTEGER DEFAULT 0,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()

    def upsert_kost_listings_batch(self, records: List[Dict[str, Any]]) -> int:
        if not records:
            return 0
        sql = """
            INSERT INTO kost_listings (
                id, name, slug, gender_type, price_monthly, room_available, room_size,
                facilities_room, facilities_shared, full_address, district, city,
                latitude, longitude, straight_distance_km, driving_distance_km, driving_duration_min,
                motorcycle_distance_km, motorcycle_duration_min, walking_distance_km, walking_duration_min,
                vfm_score, vfm_category, owner_phone, is_detail_enriched, url_detail, url_gmaps_route,
                cover_photo, rating, review_count
            ) VALUES (
                :id, :name, :slug, :gender_type, :price_monthly, :room_available, :room_size,
                :facilities_room, :facilities_shared, :full_address, :district, :city,
                :latitude, :longitude, :straight_distance_km, :driving_distance_km, :driving_duration_min,
                :motorcycle_distance_km, :motorcycle_duration_min, :walking_distance_km, :walking_duration_min,
                :vfm_score, :vfm_category, :owner_phone, :is_detail_enriched, :url_detail, :url_gmaps_route,
                :cover_photo, :rating, :review_count
            )
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                price_monthly=excluded.price_monthly,
                room_available=excluded.room_available,
                latitude=COALESCE(excluded.latitude, kost_listings.latitude),
                longitude=COALESCE(excluded.longitude, kost_listings.longitude),
                straight_distance_km=COALESCE(excluded.straight_distance_km, kost_listings.straight_distance_km),
                motorcycle_distance_km=COALESCE(excluded.motorcycle_distance_km, kost_listings.motorcycle_distance_km),
                motorcycle_duration_min=COALESCE(excluded.motorcycle_duration_min, kost_listings.motorcycle_duration_min),
                driving_distance_km=COALESCE(excluded.driving_distance_km, kost_listings.driving_distance_km),
                driving_duration_min=COALESCE(excluded.driving_duration_min, kost_listings.driving_duration_min),
                walking_distance_km=COALESCE(excluded.walking_distance_km, kost_listings.walking_distance_km),
                walking_duration_min=COALESCE(excluded.walking_duration_min, kost_listings.walking_duration_min),
                url_gmaps_route=COALESCE(excluded.url_gmaps_route, kost_listings.url_gmaps_route),
                vfm_score=excluded.vfm_score,
                vfm_category=excluded.vfm_category,
                scraped_at=CURRENT_TIMESTAMP;
        """
        formatted_records = []
        for r in records:
            row = {
                "id": str(r.get("id", "")),
                "name": str(r.get("name", "")),
                "slug": str(r.get("slug", "")),
                "gender_type": str(r.get("gender_type", "campur")).lower(),
                "price_monthly": int(r.get("price_monthly", 0) or 0),
                "room_available": int(r.get("room_available", 0) or 0),
                "room_size": str(r.get("room_size", "-")),
                "facilities_room": r.get("facilities_room", "[]") if isinstance(r.get("facilities_room"), str) else json.dumps(r.get("facilities_room", [])),
                "facilities_shared": r.get("facilities_shared", "[]") if isinstance(r.get("facilities_shared"), str) else json.dumps(r.get("facilities_shared", [])),
                "full_address": str(r.get("full_address", "") or ""),
                "district": str(r.get("district", "") or ""),
                "city": str(r.get("city", "") or ""),
                "latitude": r.get("latitude"),
                "longitude": r.get("longitude"),
                "straight_distance_km": r.get("straight_distance_km"),
                "driving_distance_km": r.get("driving_distance_km"),
                "driving_duration_min": r.get("driving_duration_min"),
                "motorcycle_distance_km": r.get("motorcycle_distance_km"),
                "motorcycle_duration_min": r.get("motorcycle_duration_min"),
                "walking_distance_km": r.get("walking_distance_km"),
                "walking_duration_min": r.get("walking_duration_min"),
                "vfm_score": r.get("vfm_score", 0.0),
                "vfm_category": r.get("vfm_category", ""),
                "owner_phone": str(r.get("owner_phone", "") or ""),
                "is_detail_enriched": int(r.get("is_detail_enriched", 0) or 0),
                "url_detail": str(r.get("url_detail", "")),
                "url_gmaps_route": str(r.get("url_gmaps_route", "") or ""),
                "cover_photo": str(r.get("cover_photo", "")),
                "rating": float(r.get("rating", 0) or 0),
                "review_count": int(r.get("review_count", 0) or 0)
            }
            formatted_records.append(row)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(sql, formatted_records)
            conn.commit()
            return len(formatted_records)

    def update_kost_enrichment(
        self,
        kost_id: str,
        full_address: Optional[str] = None,
        owner_phone: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        route_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            updates = ["is_detail_enriched = 1"]
            params = []

            if full_address is not None:
                updates.append("full_address = ?")
                params.append(full_address)
            if owner_phone is not None:
                updates.append("owner_phone = ?")
                params.append(owner_phone)
            if latitude is not None and longitude is not None:
                updates.append("latitude = ?")
                params.append(latitude)
                updates.append("longitude = ?")
                params.append(longitude)
            if route_data:
                for k in ["straight_distance_km", "driving_distance_km", "driving_duration_min",
                          "motorcycle_distance_km", "motorcycle_duration_min", "walking_distance_km",
                          "walking_duration_min", "url_gmaps_route"]:
                    if k in route_data:
                        updates.append(f"{k} = ?")
                        params.append(route_data[k])

            params.append(str(kost_id))
            sql = f"UPDATE kost_listings SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(sql, params)
            conn.commit()
            return cursor.rowcount > 0

    def get_kost_listings(
        self,
        gender: Optional[str] = None,
        genders: Optional[List[str]] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        sort_by: str = "vfm_score",
        sort_order: str = "desc",
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        where_clauses = []
        params = []

        # Mendukung multi-gender filter (contoh: ['putra', 'campur'])
        if genders and len(genders) > 0:
            normalized = [g.lower() for g in genders if g.lower() != "all"]
            if normalized:
                placeholders = ",".join(["?"] * len(normalized))
                where_clauses.append(f"LOWER(gender_type) IN ({placeholders})")
                params.extend(normalized)
        elif gender and gender.lower() != "all":
            where_clauses.append("LOWER(gender_type) = LOWER(?)")
            params.append(gender)

        if min_price is not None:
            where_clauses.append("price_monthly >= ?")
            params.append(min_price)
        if max_price is not None:
            where_clauses.append("price_monthly <= ?")
            params.append(max_price)

        where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        valid_sort_fields = {
            "vfm_score": "vfm_score",
            "price": "price_monthly",
            "distance": "motorcycle_distance_km",
            "name": "name"
        }
        sort_col = valid_sort_fields.get(sort_by, "vfm_score")
        direction = "ASC" if sort_order.lower() == "asc" else "DESC"

        query = f"""
            SELECT * FROM kost_listings
            {where_str}
            ORDER BY {sort_col} {direction} NULLS LAST
            LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = [dict(r) for r in cursor.fetchall()]
            for r in rows:
                try:
                    r["facilities_room"] = json.loads(r["facilities_room"]) if r.get("facilities_room") else []
                except Exception:
                    r["facilities_room"] = []
            return rows

    def recalculate_all_vfm(self, weight_price: float = 0.60, weight_distance: float = 0.40) -> int:
        items = self.get_kost_listings(limit=10000)
        if not items:
            return 0
        ScoringService.calculate_vfm_scores(items, weight_price=weight_price, weight_distance=weight_distance)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for item in items:
                cursor.execute("""
                    UPDATE kost_listings
                    SET vfm_score = ?, vfm_category = ?
                    WHERE id = ?
                """, (item["vfm_score"], item["vfm_category"], str(item["id"])))
            conn.commit()
        return len(items)

    def count_kost_listings(self) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM kost_listings")
            return cursor.fetchone()[0]

    def get_kost_by_id(self, kost_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM kost_listings WHERE id = ?", (str(kost_id),))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                try:
                    data["facilities_room"] = json.loads(data["facilities_room"]) if data.get("facilities_room") else []
                except Exception:
                    data["facilities_room"] = []
                return data
            return None

    def get_kost_by_ids(self, kost_ids: List[str]) -> List[Dict[str, Any]]:
        if not kost_ids:
            return []
        placeholders = ",".join(["?"] * len(kost_ids))
        query = f"SELECT * FROM kost_listings WHERE id IN ({placeholders})"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, [str(i) for i in kost_ids])
            rows = [dict(r) for r in cursor.fetchall()]
            for r in rows:
                try:
                    r["facilities_room"] = json.loads(r["facilities_room"]) if r.get("facilities_room") else []
                except Exception:
                    r["facilities_room"] = []
            return rows
    def clear_all_listings(self) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM kost_listings")
            count = cursor.fetchone()[0]
            cursor.execute("DELETE FROM kost_listings")
            conn.commit()
            return count
