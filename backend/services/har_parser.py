import os
import json
import base64
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding

logger = logging.getLogger(__name__)

DEFAULT_CONFIG_PATH = Path("backend/config/session_config.json")
DEFAULT_AES_KEY = b"39c852d0d0bc42ef83f7d3d708f42368"
DEFAULT_AES_IV = b"5df5a10ebb035097"


class HARParser:
    """
    Parser file .har untuk ekstraksi kredensial, token, header Mamikos,
    dekripsi response listing kamar, dan health check sesi.
    """

    def __init__(self, config_path: Path = DEFAULT_CONFIG_PATH):
        self.config_path = Path(config_path)
        self.config = self.load_config()

    def load_config(self) -> Dict[str, Any]:
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Gagal membaca session_config: {e}")
        return {}

    def save_config(self, data: Dict[str, Any]) -> None:
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        self.config = data

    def get_default_headers(self) -> Dict[str, str]:
        api_keys = self.config.get("api_keys", [])
        user_agents = self.config.get("user_agents", [])
        xsrf_tokens = self.config.get("xsrf_tokens", [])

        headers = {
            "user-agent": user_agents[0] if user_agents else "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
            "accept": "application/json, text/plain, */*",
            "origin": "https://mamikos.com",
            "referer": "https://mamikos.com/",
            "x-git-time": "1406090202",
        }
        if api_keys:
            headers["x-api-key"] = api_keys[0]
        if xsrf_tokens:
            headers["x-xsrf-token"] = xsrf_tokens[0]

        return headers

    @staticmethod
    def decrypt_rooms(encrypted_rooms_b64: str, key: bytes = DEFAULT_AES_KEY, iv: bytes = DEFAULT_AES_IV) -> Optional[List[Dict[str, Any]]]:
        """
        Dekripsi ciphertext rooms dari endpoint /garuda/stories/list (AES-256-CBC).
        """
        if not encrypted_rooms_b64 or not isinstance(encrypted_rooms_b64, str):
            return []
        try:
            ciphertext = base64.b64decode(encrypted_rooms_b64)
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
            decryptor = cipher.decryptor()
            padded = decryptor.update(ciphertext) + decryptor.finalize()
            unpadder = padding.PKCS7(128).unpadder()
            decrypted = unpadder.update(padded) + unpadder.finalize()
            return json.loads(decrypted.decode("utf-8"))
        except Exception as e:
            logger.error(f"Gagal mendekripsi rooms: {e}")
            return None

    def test_session_health(self) -> Dict[str, Any]:
        """
        Health check koneksi dan token ke Mamikos API.
        Menguji endpoint filters dan endpoint stories/list + dekripsi.
        """
        headers = self.get_default_headers()
        result = {
            "status": "UNKNOWN",
            "api_key_valid": False,
            "decryption_working": False,
            "sample_rooms_count": 0,
            "message": ""
        }

        try:
            with httpx.Client(headers=headers, timeout=12.0) as client:
                # Check 1: filters endpoint
                r_filters = client.get("https://mamikos.com/garuda/stories/filters")
                if r_filters.status_code == 200:
                    result["api_key_valid"] = True

                # Check 2: lightweight discovery probe (1 item)
                payload = {
                    "filters": {
                        "gender": [0, 1, 2],
                        "price_range": [10000, 20000000],
                        "tag_ids": [],
                        "rent_type": 2,
                        "property_type": "kost",
                        "random_seeds": 123
                    },
                    "sorting": {"field": "price", "direction": "-"},
                    "is_for_map": False,
                    "geocode_id": "100",
                    "limit": 1,
                    "offset": 0
                }
                r_search = client.post(
                    "https://mamikos.com/garuda/stories/list?v=2&with_thematic_badge=true",
                    json=payload
                )
                if r_search.status_code == 200:
                    search_json = r_search.json()
                    rooms_raw = search_json.get("rooms", "")
                    rooms = self.decrypt_rooms(rooms_raw)
                    if rooms and len(rooms) > 0:
                        result["decryption_working"] = True
                        result["sample_rooms_count"] = len(rooms)
                        result["status"] = "ACTIVE"
                        result["message"] = f"Session aktif, koneksi Mamikos normal, dekripsi valid (terdeteksi {search_json.get('total', 0)} total listing)."
                    else:
                        result["status"] = "DECRYPT_ERROR"
                        result["message"] = "Berhasil panggil API Mamikos tapi gagal dekripsi rooms."
                elif r_search.status_code in [401, 403]:
                    result["status"] = "EXPIRED"
                    result["message"] = f"Akses ditolak Mamikos (Status {r_search.status_code}). Kredensial kadaluarsa."
                else:
                    result["status"] = "ERROR"
                    result["message"] = f"Mamikos HTTP Error {r_search.status_code}: {r_search.text[:100]}"

        except Exception as exc:
            result["status"] = "NETWORK_ERROR"
            result["message"] = f"Gagal menghubungi server Mamikos: {str(exc)}"

        return result

    @staticmethod
    def parse_room_summary(room_item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Memetakan raw JSON listing kamar hasil dekripsi ke format standard kost_listings.
        """
        price_format = room_item.get("price_title_format") or {}
        raw_price = str(price_format.get("price", "0")).replace(".", "")
        raw_discount = str(price_format.get("discount_price", "0")).replace(".", "")
        if raw_discount.isdigit() and int(raw_discount) > 0:
            price_val = int(raw_discount)
        elif raw_price.isdigit():
            price_val = int(raw_price)
        else:
            price_val = 0

        gender_map = {0: "campur", 1: "putra", 2: "putri"}
        gender_str = gender_map.get(room_item.get("gender"), "campur")

        facilities = room_item.get("top_facility", []) or []
        photo_urls = room_item.get("photo_url", {}) or {}
        cover_photo = photo_urls.get("large") or photo_urls.get("medium") or photo_urls.get("small") or ""

        return {
            "id": str(room_item.get("_id", "")),
            "name": room_item.get("room-title", "") or room_item.get("name", ""),
            "slug": room_item.get("slug", ""),
            "gender_type": gender_str,
            "price_monthly": price_val,
            "room_available": room_item.get("available_room", 0),
            "room_size": room_item.get("size", "-"),
            "facilities_room": json.dumps(facilities),
            "district": room_item.get("subdistrict", "") or room_item.get("area_label", ""),
            "city": room_item.get("city", ""),
            "latitude": room_item.get("latitude"),
            "longitude": room_item.get("longitude"),
            "url_detail": room_item.get("share_url", f"https://mamikos.com/room/{room_item.get('_id')}"),
            "cover_photo": cover_photo,
            "rating": room_item.get("rating", 0),
            "review_count": room_item.get("review_count", 0),
            "is_detail_enriched": 0
        }
