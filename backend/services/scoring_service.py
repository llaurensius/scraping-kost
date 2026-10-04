from typing import List, Dict, Any, Optional


class ScoringService:
    """
    Kalkulator skor Value-for-Money (VFM) berdasarkan perbandingan harga sewa
    dan jarak tempuh berkendara (motor/mobil).
    """

    DEFAULT_WEIGHT_PRICE = 0.60
    DEFAULT_WEIGHT_DISTANCE = 0.40

    @classmethod
    def calculate_vfm_scores(
        cls,
        items: List[Dict[str, Any]],
        weight_price: float = DEFAULT_WEIGHT_PRICE,
        weight_distance: float = DEFAULT_WEIGHT_DISTANCE,
        distance_field: str = "motorcycle_distance_km"
    ) -> List[Dict[str, Any]]:
        """
        Menghitung normalisasi min-max dan skor VFM (0 - 100) untuk himpunan data kost.
        Memperbarui dictionary item in-place dengan 'vfm_score' dan 'vfm_category'.
        """
        if not items:
            return []

        # Ekstraksi nilai valid
        valid_prices = [
            float(item.get("price_monthly", 0))
            for item in items
            if item.get("price_monthly") and float(item.get("price_monthly", 0)) > 0
        ]
        valid_distances = [
            float(item.get(distance_field, 0.0) or item.get("straight_distance_km", 0.0) or 0.0)
            for item in items
            if (item.get(distance_field) or item.get("straight_distance_km"))
        ]

        p_min = min(valid_prices) if valid_prices else 0.0
        p_max = max(valid_prices) if valid_prices else 0.0
        d_min = min(valid_distances) if valid_distances else 0.0
        d_max = max(valid_distances) if valid_distances else 0.0

        p_range = p_max - p_min
        # Cap batas atas jarak ke 35.0 km agar outlier luar kota tidak merusak skala
        norm_d_max = min(d_max, 35.0) if d_max > 0 else 35.0
        d_range = max(norm_d_max - d_min, 1.0)

        # Normalisasi bobot agar jumlahnya = 1.0
        total_weight = weight_price + weight_distance
        if total_weight <= 0:
            w_p, w_d = 0.60, 0.40
        else:
            w_p = weight_price / total_weight
            w_d = weight_distance / total_weight

        for item in items:
            price = float(item.get("price_monthly", 0) or 0)
            dist = float(item.get(distance_field) or item.get("straight_distance_km") or 0.0)

            # Normalisasi Min-Max (0: terbaik/terkecil, 1: terburuk/terbesar)
            norm_price = (price - p_min) / p_range if p_range > 0 else 0.5
            clamped_dist = min(dist, 35.0)
            norm_dist = (clamped_dist - d_min) / d_range if d_range > 0 else 0.5

            # Penalti / Skor VFM: semakin kecil harga dan jarak, skor mendekati 100
            vfm = 100.0 * (1.0 - (w_p * norm_price + w_d * norm_dist))

            # Penalti jarak jauh: kost di atas 30 km dipotong skornya secara proporsional
            if dist > 30.0:
                penalty = min(80.0, ((dist - 30.0) / 10.0) * 15.0)
                vfm -= penalty
            vfm_clamped = max(0.0, min(100.0, round(vfm, 1)))

            if vfm_clamped >= 90.0:
                cat = "Sangat Direkomendasikan"
            elif vfm_clamped >= 75.0:
                cat = "Pilihan Bagus"
            elif vfm_clamped >= 50.0:
                cat = "Standar"
            else:
                cat = "Kurang Efisien"

            item["vfm_score"] = vfm_clamped
            item["vfm_category"] = cat

        return items
