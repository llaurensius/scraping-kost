# Reverse Engineering Mamikos API & Kontrak Data

Dokumen ini mendokumentasikan hasil reverse engineering endpoint internal Mamikos, mekanisme enkripsi AES-256-CBC, penanganan sesi, dan stabilitas engine.

---

## 1. Endpoint Utama Mamikos

| Endpoint | Method | Fungsi |
| :--- | :--- | :--- |
| `https://mamikos.com/garuda/stories/list?v=2&with_thematic_badge=true` | `POST` | Mengambil listing kamar terenkripsi dengan filter |
| `https://mamikos.com/web_api/v3/user/name-check` | `GET` | Health check validitas sesi login Mamikos |
| `https://mamikos.com/room/{slug}` | `GET` | Mengambil halaman HTML detail kamar dan data owner |

---

## 2. Struktur Payload Request `/garuda/stories/list`

Request body dikirim dalam format JSON dengan struktur:

```json
{
  "filters": {
    "gender": [0, 1, 2],
    "price_range": [500000, 3500000],
    "tag_ids": [10, 25],
    "rent_type": 2,
    "property_type": "kost",
    "random_seeds": 482910,
    "flash_sale": false,
    "goldplus": [],
    "kost_levels": [],
    "is_available": true
  },
  "sorting": {
    "field": "price",
    "direction": "-"
  },
  "is_for_map": false,
  "geocode_id": "100",
  "location": [],
  "point": {
    "latitude": -6.2407128,
    "longitude": 106.8311353
  },
  "include_promoted": false,
  "limit": 20,
  "offset": 0
}
```

### Parameter Kritis & Stabilitas Engine:
1. **`random_seeds` Dinamis**:
   - Jika `random_seeds` di-hardcode (misal: 769), API Mamikos akan mengembalikan urutan listing yang identik pada setiap batch pencarian.
   - Solusi: `random.randint(100, 999999)` di-generate acak pada setiap request discovery agar dataset selalu terbarui.
2. **`point` (Koordinat Target)**:
   - Jika koordinat target lokasi tersedia, sertakan di field `point.latitude` dan `point.longitude`.
   - Hal ini memastikan API Mamikos memprioritaskan listing di radius sekitar titik target.

---

## 3. Mekanisme Enkripsi & Dekripsi AES-256-CBC

Respons dari `/garuda/stories/list` membungkus array data kamar dalam ciphertext terenkripsi:

```json
{
  "status": true,
  "data": {
    "rooms": "V2Z3a...ciphertext_base64...",
    "total_rooms": 142
  }
}
```

### Algoritma Dekripsi:
- **Cipher**: AES-256-CBC
- **Key (32 bytes)**: Ditentukan di `session_config.json` (diekstraksi dari bundle JS frontend Mamikos).
  - Default: `39c852d0d0bc42ef83f7d3d708f42368`
- **IV (16 bytes)**:
  - Default: `5df5a10ebb035097`
- **Padding**: PKCS7 padding.
- **Implementasi Backend (`backend/services/har_parser.py`)**:
  ```python
  cipher = Cipher(algorithms.AES(key_bytes), modes.CBC(iv_bytes), backend=default_backend())
  decryptor = cipher.decryptor()
  unpadder = padding.PKCS7(128).unpadder()
  decrypted = unpadder.update(decryptor.update(ciphertext)) + unpadder.finalize()
  rooms = json.loads(decrypted.decode("utf-8"))
  ```

---

## 4. Struktur Data Listing Hasil Dekripsi

Setelah didekripsi, setiap elemen listing memiliki field utama:
- `_id`: ID unik Mamikos.
- `room-title`: Nama/judul listing kamar.
- `gender`: 0 (Campur), 1 (Putra), 2 (Putri).
- `price_title_format`: Objek harga (`price`, `discount_price`, `discount`).
- `latitude`, `longitude`: Koordinat lokasi kost.
- `subdistrict`, `city`, `area_label`: Informasi wilayah administratif.
- `available_room`: Jumlah kamar kosong yang tersedia.
- `size`: Dimensi kamar (contoh: `3x4`, `3x3`).
- `top_facility`: Array nama fasilitas unggulan.
- `rating`, `review_count`: Skor reputasi kost.
