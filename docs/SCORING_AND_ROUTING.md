# Inteligensi Lokasi, Routing OSRM & Skoring Value-for-Money (VFM)

Dokumen ini menjelaskan resolusi lokasi target, kalkulasi rute navigasi menggunakan OSRM, dan formula penentuan ranking kost.

---

## 1. Resolusi Target Lokasi Dinamis (`GeoService`)

Sistem mendukung tiga variasi input lokasi target:
1. **Google Maps Shortlink**: `https://maps.app.goo.gl/TDmLQEU1tCk2zDvV8`
   - Diselesaikan dengan mengikuti HTTP redirect (`httpx.head` / `httpx.get` dengan `follow_redirects=True`).
   - Koordinat diekstrak dari parameter `@lat,lng` atau `!3dlat!4dlng` di URL tujuan akhir.
2. **Google Maps Long URL**: `https://www.google.com/maps/place/.../@-6.2407,106.8311,17z/...`
   - Diekstrak menggunakan regex: `r"@(-?\d+\.\d+),(-?\d+\.\d+)"`.
3. **Koordinat Manual**: `-6.2407128, 106.8311353`
   - Diparsing langsung sebagai float tuple `(lat, lng)`.

---

## 2. OSRM Routing Engine

Jarak dan durasi tempuh tidak dihitung menggunakan garis lurus (*as the crow flies*), melainkan rute jalan riil melalui Open Source Routing Machine (OSRM).

### Profil Perjalanan yang Dihitung:
1. **Sepeda Motor (Utama)**: Profil `driving` dengan estimasi kecepatan disesuaikan manuver motor.
2. **Mobil**: Profil `driving` standar.
3. **Jalan Kaki**: Profil `walking` atau estimasi jarak pejalan kaki.

### Format Pemanggilan API OSRM:
```http
GET http://router.project-osrm.org/route/v1/driving/{lng_origin},{lat_origin};{lng_target},{lat_target}?overview=false
```

### Mekanisme Proteksi & Caching:
- Setiap rute `(lat_asal, lng_asal) -> (lat_tujuan, lng_tujuan)` disimpan dalam tabel SQLite `route_cache`.
- Jika rute sudah pernah dihitung sebelumnya, sistem mengambil data dari memori/disk lokal tanpa melakukan request HTTP ke server OSRM publik.

---

## 3. Formula Skoring Value-for-Money (VFM)

Tujuan skor VFM adalah memberikan metrik 0 - 100 yang objektif: kost dengan harga terjangkau dan jarak dekat memperoleh nilai tertinggi.

### A. Normalisasi Min-Max
Untuk setiap kost dalam dataset:
$$NormPrice = \frac{Price - P_{min}}{P_{max} - P_{min}}$$
$$NormDistance = \frac{Distance_{clamped} - D_{min}}{D_{range}}$$

Di mana:
- $P_{min}, P_{max}$: Harga bulanan minimum dan maksimum dalam dataset.
- $D_{min}$: Jarak terdekat dalam dataset.
- $Distance_{clamped}$: Jarak berkendara motor yang dibatasi ke atas maksimal 35.0 km agar listing luar kota tidak merusak skala sebaran.
- $D_{range} = \max(\min(D_{max}, 35.0) - D_{min}, 1.0)$.

### B. Kalkulasi Skor Terbobot
Dengan bobot harga $W_p$ dan bobot jarak $W_d$ (default $W_p = 0.50$, $W_d = 0.50$, dengan $W_p + W_d = 1.0$):
$$VFM_{raw} = 100 \times \left(1.0 - (W_p \times NormPrice + W_d \times NormDistance)\right)$$

### C. Penalti Jarak Jauh (Outlier Suppression)
Jika jarak kost ke target melebihi 30.0 km, dikenakan penalti substansial agar listing luar kota tidak mendominasi peringkat:
$$\text{Penalty} = \min\left(80.0, \frac{Distance - 30.0}{10.0} \times 15.0\right)$$
$$VFM_{final} = \max(0.0, \min(100.0, VFM_{raw} - \text{Penalty}))$$

### D. Kategori Rating VFM
| Rentang Skor | Kategori | Warna UI |
| :--- | :--- | :--- |
| **90.0 - 100.0** | Sangat Direkomendasikan | Hijau Zamrud (`#10b981`) |
| **75.0 - 89.9** | Pilihan Bagus | Biru Langit (`#0ea5e9`) |
| **50.0 - 74.9** | Standar | Amber / Kuning (`#f59e0b`) |
| **< 50.0** | Kurang Direkomendasikan | Abu-abu Slate (`#64748b`) |
