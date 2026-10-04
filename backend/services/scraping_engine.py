import asyncio
import random
import re
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, AsyncGenerator

import httpx

from backend.services.har_parser import HARParser
from backend.services.geo_service import GeoService
from backend.services.scoring_service import ScoringService
from backend.services.db_service import DBService

logger = logging.getLogger(__name__)


class ScrapingEngine:
    """
    Engine orkestrasi 2-Phase Scraping Mamikos:
    Fase 1: Fast Discovery (Bulk listing, Geocoding, OSRM routing, VFM scoring).
    Fase 2: Deep Enrichment (Detail alamat, nomor kontak WA pemilik).
    """

    def __init__(
        self,
        har_parser: Optional[HARParser] = None,
        geo_service: Optional[GeoService] = None,
        db_service: Optional[DBService] = None,
    ):
        self.har_parser = har_parser or HARParser()
        self.geo_service = geo_service or GeoService()
        self.db_service = db_service or DBService()
        self.scoring_service = ScoringService()

        # Event queues untuk multi-client SSE progress streaming
        self._subscribers: List[asyncio.Queue] = []
        self.is_running = False

    async def subscribe_progress(self) -> AsyncGenerator[str, None]:
        q = asyncio.Queue()
        self._subscribers.append(q)
        try:
            yield f"data: {json.dumps({'type': 'connected', 'timestamp': datetime.now().isoformat(), 'message': 'SSE Log Stream Connected'})}\n\n"
            while True:
                msg = await q.get()
                yield f"data: {json.dumps(msg)}\n\n"
        finally:
            if q in self._subscribers:
                self._subscribers.remove(q)

    async def emit_log(self, level: str, message: str, data: Optional[Dict[str, Any]] = None) -> None:
        payload = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "level": level,
            "message": message,
            "data": data or {}
        }
        logger.info(f"[{level.upper()}] {message}")
        for q in list(self._subscribers):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

    async def run_discovery(
        self,
        gender: Optional[str] = None,
        genders: Optional[List[int]] = None,
        price_min: int = 500000,
        price_max: int = 5000000,
        target_count: int = 40,
        geocode_id: str = "100",
        tag_ids: Optional[List[int]] = None,
        weight_price: float = 0.60,
        weight_distance: float = 0.40,
    ) -> Dict[str, Any]:
        if self.is_running:
            return {"status": "error", "message": "Proses scraping sedang berjalan."}

        self.is_running = True
        await self.emit_log("info", "Memulai Phase 1 (Fast Discovery Engine)...")

        try:
            target_loc = self.geo_service.resolve_target_location()
            await self.emit_log("info", f"Lokasi target: {target_loc['name']} ({target_loc['latitude']:.4f}, {target_loc['longitude']:.4f})")

            headers = self.har_parser.get_default_headers()

            # Resolusi multi-gender filter: array [0, 1, 2]
            if genders and len(genders) > 0:
                gender_filters = genders
            elif gender:
                gender_map = {"all": [0, 1, 2], "campur": [0], "putra": [1], "putri": [2]}
                gender_filters = gender_map.get(gender.lower(), [0, 1, 2])
            else:
                gender_filters = [0, 1, 2]

            active_tag_ids = tag_ids or []
            await self.emit_log("info", f"Kriteria: Gender={gender_filters}, Harga=Rp {price_min:,} - Rp {price_max:,}, Fasilitas={len(active_tag_ids)} tag.")

            collected_listings: List[Dict[str, Any]] = []
            seen_ids = set()
            offset = 0
            limit = 20
            page_idx = 1
            max_pages = (target_count // 15) + 5

            async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
                while len(collected_listings) < target_count and page_idx <= max_pages:
                    await self.emit_log("info", f"Meminta batch #{page_idx} (offset {offset})...")
                    has_coords = bool(target_loc and target_loc.get("latitude") and target_loc.get("longitude"))
                    point_payload = {
                        "latitude": target_loc["latitude"],
                        "longitude": target_loc["longitude"]
                    } if has_coords else {}
                    request_geocode_id = geocode_id or "100"

                    payload = {
                        "filters": {
                            "gender": gender_filters,
                            "price_range": [price_min, price_max],
                            "tag_ids": active_tag_ids,
                            "rent_type": 2,
                            "property_type": "kost",
                            "random_seeds": random.randint(100, 999999),
                            "flash_sale": False,
                            "goldplus": [],
                            "kost_levels": [],
                            "is_expand": False,
                            "is_available": False
                        },
                        "sorting": {"field": "price", "direction": "-"},
                        "is_for_map": False,
                        "geocode_id": request_geocode_id,
                        "location": [],
                        "point": point_payload,
                        "include_promoted": False,
                        "limit": limit,
                        "offset": offset
                    }

                    try:
                        resp = await client.post(
                            "https://mamikos.com/garuda/stories/list?v=2&with_thematic_badge=true",
                            json=payload
                        )
                        if resp.status_code != 200:
                            await self.emit_log("error", f"Error API Mamikos: HTTP {resp.status_code}")
                            break

                        data = resp.json()
                        rooms_raw = data.get("rooms", "")
                        if not rooms_raw:
                            await self.emit_log("warn", "Daftar kamar kosong / akhir halaman tercapai.")
                            break

                        decrypted_rooms = self.har_parser.decrypt_rooms(rooms_raw)
                        if decrypted_rooms is None:
                            await self.emit_log("error", "Gagal mendekripsi respons batch kamar.")
                            break
                        if len(decrypted_rooms) == 0:
                            await self.emit_log("warn", "Tidak ada listing kost yang sesuai kriteria filter pada batch ini.")
                            break

                        await self.emit_log("info", f"Berhasil mendekripsi {len(decrypted_rooms)} listing dari batch #{page_idx}.")

                        batch_items = []
                        for r_item in decrypted_rooms:
                            summary = self.har_parser.parse_room_summary(r_item)
                            room_id = summary["id"]
                            if not room_id or room_id in seen_ids:
                                continue
                            seen_ids.add(room_id)

                            # Tarik koordinat presisi langsung dari halaman detail jika belum ada
                            lat = summary.get("latitude")
                            lng = summary.get("longitude")
                            if lat is None or lng is None:
                                try:
                                    detail_resp = await client.get(summary["url_detail"])
                                    if detail_resp.status_code == 200:
                                        m_lat = re.search(r'\"latitude\"\s*:\s*(-?\d+\.\d+)', detail_resp.text)
                                        m_lng = re.search(r'\"longitude\"\s*:\s*(-?\d+\.\d+)', detail_resp.text)
                                        if m_lat and m_lng:
                                            lat = float(m_lat.group(1))
                                            lng = float(m_lng.group(1))
                                            summary["latitude"] = lat
                                            summary["longitude"] = lng
                                except Exception:
                                    pass

                            # Kalkulasi rute OSRM jika koordinat tersedia
                            if lat is not None and lng is not None:
                                route_info = self.geo_service.calculate_all_routes(
                                    lat, lng, target_loc["latitude"], target_loc["longitude"]
                                )
                                summary.update(route_info)

                            batch_items.append(summary)
                            if len(collected_listings) + len(batch_items) >= target_count:
                                break

                        collected_listings.extend(batch_items)
                        await self.emit_log("progress", f"Progress: {len(collected_listings)} / {target_count} kost terkumpul.", {
                            "collected": len(collected_listings),
                            "target": target_count
                        })

                        if not data.get("has-more") or len(collected_listings) >= target_count:
                            break

                        offset += limit
                        page_idx += 1

                        # Anti-Rate Limit Random Jitter
                        sleep_sec = random.uniform(1.0, 1.8)
                        await asyncio.sleep(sleep_sec)

                    except Exception as err:
                        await self.emit_log("error", f"Terjadi kesalahan saat memproses batch: {str(err)}")
                        break

            # Hitung Skor VFM untuk seluruh dataset hasil scraping
            if collected_listings:
                await self.emit_log("info", "Menghitung Value-for-Money (VFM) Score untuk seluruh data...")
                self.scoring_service.calculate_vfm_scores(
                    collected_listings,
                    weight_price=weight_price,
                    weight_distance=weight_distance
                )

                # Persistensi batch ke SQLite
                saved_count = self.db_service.upsert_kost_listings_batch(collected_listings)
                await self.emit_log("success", f"Berhasil menyimpan {saved_count} kost ke database lokal.")
                recalculated = self.db_service.recalculate_all_vfm(
                    weight_price=weight_price,
                    weight_distance=weight_distance
                )
                await self.emit_log("info", f"Kalibrasi skala VFM global selesai untuk {recalculated} kost.")

            await self.emit_log("success", f"Phase 1 Fast Discovery Selesai! Total: {len(collected_listings)} kost.")
            return {
                "status": "success",
                "total_collected": len(collected_listings),
                "target_location": target_loc
            }

        finally:
            self.is_running = False

    async def run_enrichment(self, kost_ids: List[str]) -> Dict[str, Any]:
        if not kost_ids:
            return {"status": "error", "message": "Daftar ID kost kosong."}

        await self.emit_log("info", f"Memulai Phase 2 (Deep Enrichment) untuk {len(kost_ids)} kost terpilih...")
        headers = self.har_parser.get_default_headers()
        target_loc = self.geo_service.resolve_target_location()

        enriched_count = 0
        async with httpx.AsyncClient(headers=headers, timeout=12.0) as client:
            for idx, kid in enumerate(kost_ids, start=1):
                await self.emit_log("info", f"[{idx}/{len(kost_ids)}] Mengambil detail & kontak kost ID: {kid}...")
                try:
                    await asyncio.sleep(random.uniform(1.8, 2.8))

                    kost_data = self.db_service.get_kost_by_id(kid)
                    room_url = kost_data.get("url_detail") if kost_data else None
                    if not room_url:
                        room_url = f"https://mamikos.com/room/{kid}"

                    resp = await client.get(room_url)
                    if resp.status_code == 200:
                        text = resp.text
                        full_address = ""
                        owner_phone = ""
                        lat, lng = None, None

                        pos = text.find("var detail = {")
                        if pos != -1:
                            end = text.find("};", pos)
                            try:
                                det_obj = json.loads(text[pos + len("var detail = "):end + 1])
                                full_address = det_obj.get("address") or det_obj.get("map_guide") or ""
                                lat = det_obj.get("latitude")
                                lng = det_obj.get("longitude")
                                desc = det_obj.get("description", "")

                                phone_matches = re.findall(r'(?:08|\+628|628)\d{8,12}', desc)
                                if phone_matches:
                                    owner_phone = phone_matches[0]
                                elif det_obj.get("owner_phone"):
                                    owner_phone = det_obj.get("owner_phone")
                            except Exception:
                                pass

                        route_data = None
                        if lat and lng:
                            route_data = self.geo_service.calculate_all_routes(
                                lat, lng, target_loc["latitude"], target_loc["longitude"]
                            )

                        self.db_service.update_kost_enrichment(
                            kost_id=kid,
                            full_address=full_address,
                            owner_phone=owner_phone,
                            latitude=lat,
                            longitude=lng,
                            route_data=route_data
                        )
                        enriched_count += 1
                        await self.emit_log("success", f"Kost {kid} berhasil diperkaya.", {
                            "id": kid,
                            "address": full_address,
                            "phone": owner_phone
                        })
                except Exception as e:
                    await self.emit_log("error", f"Gagal memperkaya kost {kid}: {str(e)}")

        await self.emit_log("success", f"Phase 2 Selesai! {enriched_count} kost berhasil diperkaya.")
        return {"status": "success", "enriched_count": enriched_count}
