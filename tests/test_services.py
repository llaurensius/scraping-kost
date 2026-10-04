import json
import base64
import unittest
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

from backend.services.scoring_service import ScoringService
from backend.services.geo_service import GeoService
from backend.services.har_parser import HARParser

class TestKostServices(unittest.TestCase):
    def test_vfm_scoring(self):
        mock_kosts = [
            {"id": "1", "name": "Kost Murah Dekat", "price_monthly": 1000000, "motorcycle_distance_km": 1.0},
            {"id": "2", "name": "Kost Sedang", "price_monthly": 2000000, "motorcycle_distance_km": 5.0},
            {"id": "3", "name": "Kost Mahal Jauh", "price_monthly": 3000000, "motorcycle_distance_km": 15.0},
            {"id": "4", "name": "Kost Luar Kota", "price_monthly": 1000000, "motorcycle_distance_km": 40.0},
        ]
        scored = ScoringService.calculate_vfm_scores(mock_kosts, weight_price=0.5, weight_distance=0.5)
        self.assertEqual(len(scored), 4)

        # Kost Murah Dekat harus bernilai tertinggi
        self.assertGreater(scored[0]["vfm_score"], scored[1]["vfm_score"])
        self.assertGreater(scored[1]["vfm_score"], scored[2]["vfm_score"])

        # Kost Luar Kota (>30km) harus mendapat penalti sehingga skor jatuh
        self.assertLess(scored[3]["vfm_score"], scored[0]["vfm_score"])

    def test_geo_haversine_distance(self):
        # Jarak Monas (-6.1754, 106.8272) ke Bundaran HI (-6.1950, 106.8231) ~2.2 km
        dist = GeoService.haversine_distance(-6.1754, 106.8272, -6.1950, 106.8231)
        self.assertGreater(dist, 1.8)
        self.assertLess(dist, 2.6)

        # Titik sama harus 0 km
        dist_zero = GeoService.haversine_distance(-6.1754, 106.8272, -6.1754, 106.8272)
        self.assertAlmostEqual(dist_zero, 0.0, places=5)

    def test_har_decrypt_roundtrip(self):
        dummy_payload = [{"_id": "test_123", "room-title": "Kost Testing", "gender": 1}]
        raw_bytes = json.dumps(dummy_payload).encode("utf-8")

        key = b"39c852d0d0bc42ef83f7d3d708f42368"
        iv = b"5df5a10ebb035097"

        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(raw_bytes) + padder.finalize()
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        ciphertext_b64 = base64.b64encode(ciphertext).decode("utf-8")

        decrypted = HARParser.decrypt_rooms(ciphertext_b64, key=key, iv=iv)
        self.assertIsNotNone(decrypted)
        self.assertEqual(len(decrypted), 1)
        self.assertEqual(decrypted[0]["_id"], "test_123")

if __name__ == "__main__":
    unittest.main()
