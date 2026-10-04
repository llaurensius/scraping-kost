# Mamikos Scraping & Location Intelligence System (V2.0 Dual Workspace)

Platform otomasi scraping, analisis inteligensi lokasi berbasis rute riil (OSRM), dan sistem skoring *Value-for-Money* (VFM) untuk pencarian kost di Mamikos. Terdiri dari backend FastAPI, SQLite dengan routing cache, web dashboard React (Vite + Tailwind CSS), serta antarmuka spreadsheet interaktif 26 kolom.

---

## Fitur Utama

### 1. Dual Workspace System
- **Workspace 1: Scraper Studio**: Kontrol scraping interaktif, input target lokasi (Google Maps shortlink/koordinat), filter parameter lengkap, live terminal log via SSE, peta Leaflet interaktif, dan tabel data ringkas.
- **Workspace 2: Excel & Dataset Explorer**: Grid spreadsheet layar penuh menampilkan **26 kolom data lengkap** (waktu jalan kaki, durasi mobil, fasilitas detail, garansi refund, kontak WhatsApp pemilik, rating, review) dengan fitur multi-filter, custom sorting, KPI bar, dan ekspor terseleksi.

### 2. Scraping Engine & Decryption
- **Native AES-256-CBC Decryption**: Mendekripsi payload listing Mamikos secara langsung di backend Python menggunakan kunci AES yang terekstrak dari sesi browser.
- **Two-Phase Architecture**:
  - *Phase 1 (Fast Discovery)*: Pengambilan bulk listing terotentikasi, ekstraksi koordinat, dan kalkulasi jarak.
  - *Phase 2 (Deep Enrichment)*: Pengambilan detail spesifik (nomor WhatsApp pemilik, alamat lengkap, aturan kost) secara on-demand per baris atau batch terpilih.
- **Dynamic Target Resolution**: Input lokasi target fleksibel (shortlink Google Maps `maps.app.goo.gl`, URL panjang, atau koordinat `lat, lng`).

### 3. Geolocation & Scoring
- **OSRM Routing Engine**: Menghitung jarak (km) dan durasi tempuh (menit) riil untuk sepeda motor, mobil, dan jalan kaki dengan caching koordinat di SQLite.
- **Value-for-Money (VFM) Scoring**: Normalisasi Min-Max harga vs jarak dengan bobot dinamis (slider), proteksi outlier jarak luar kota (>30 km), dan skala penilaian 0-100.

### 4. Ekspor Fleksibel
- Ekspor ke format Microsoft Excel (`.xlsx`) dengan *conditional formatting*, kolom berpewarnaan skor VFM, lebar kolom otomatis, dan *clickable hyperlink*.
- Ekspor format CSV (`.csv`) untuk integrasi data pipeline atau analisis lanjutan di Pandas/R.
- Pilihan ekspor seluruh dataset atau hanya data yang terfilter di Excel Explorer.

---

## Arsitektur & Struktur Proyek

```
scraping-kost/
├── backend/
│   ├── main.py                     # Entry point FastAPI & REST endpoints
│   ├── config/
│   │   ├── session_config.json     # Konfigurasi sesi & API keys (di-gitignored)
│   │   └── session_config.example.json # Template konfigurasi
│   ├── data/
│   │   └── kost_data.db            # Database SQLite lokal (di-gitignored)
│   └── services/
│       ├── har_parser.py           # Parser HAR & dekripsi AES-256
│       ├── scraping_engine.py      # Engine scraping 2-fase
│       ├── geo_service.py          # OSRM router & resolver Google Maps
│       ├── scoring_service.py      # Kalkulasi skor VFM
│       ├── db_service.py           # SQLite persistence layer
│       └── export_service.py       # Generator Excel & CSV
├── frontend/                       # Web Dashboard (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── excel-explorer/     # Workspace 2: Full-screen spreadsheet grid
│   │   │   ├── SidebarFilter.jsx   # Filter panel & dynamic target input
│   │   │   ├── MapView.jsx         # Peta interaktif Leaflet
│   │   │   ├── DataTable.jsx       # Tabel ringkas Workspace 1
│   │   │   ├── TerminalLogs.jsx    # Terminal log SSE streaming
│   │   │   └── FacilityModal.jsx   # Modal pilihan fasilitas lengkap
│   │   ├── constants/facilities.js # Daftar katalog fasilitas Mamikos
│   │   └── App.jsx                 # Router state Dual Workspace
│   └── package.json
├── docs/                           # Dokumentasi teknis & spesifikasi
├── scripts/
│   └── inspect_har.py              # Script utility ekstraksi session dari file .har
├── scraper.py                      # Standalone CLI Playwright scraper
├── run.py                          # Launcher server full-stack dengan auto-port
├── setup.sh                        # Skrip instalasi otomatis Linux/macOS
├── setup.bat                       # Skrip instalasi otomatis Windows
└── requirements.txt                # Dependensi Python
```

---

## Instalasi & Menjalankan

### Prasyarat
- Python 3.10+
- Node.js 18+ & npm (untuk build frontend)

### 1. Setup Otomatis

**Linux / macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

Skrip setup akan membuat virtual environment Python, menginstal dependensi `requirements.txt`, menginstal paket npm frontend, dan mem-build asset production.

### 2. Konfigurasi Sesi (`session_config.json`)
Salin template konfigurasi:
```bash
cp backend/config/session_config.example.json backend/config/session_config.json
```
Isi `session_config.json` dengan API key dan token aktif dari Mamikos. Untuk mengisi otomatis dari rekaman browser:
1. Buka browser dan login ke Mamikos.
2. Simpan network capture ke format `.har` di dalam folder `har/`.
3. Jalankan:
   ```bash
   python scripts/inspect_har.py
   ```
   Script akan membedah HAR dan memperbarui `backend/config/session_config.json` secara otomatis.

### 3. Menjalankan Web Dashboard
Jalankan server aplikasi:
```bash
python run.py
```
Server otomatis memilih port yang tersedia (default: `http://localhost:8000`).
- **Web Dashboard**: `http://localhost:8000`
- **Dokumentasi API Swagger**: `http://localhost:8000/docs`

### 4. Menjalankan Standalone CLI Scraper (Opsional)
Tersedia skrip CLI mandiri berbasis Playwright tanpa dashboard:
```bash
python scraper.py
```
Ikuti prompt interaktif di terminal; hasil akan langsung disimpan ke file Excel `.xlsx`.

---

## API Endpoints Utama

| Method | Path | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/session/health` | Verifikasi validitas token dan session Mamikos |
| `POST` | `/api/scrape/discovery` | Memulai scraping Fase 1 (Fast Discovery) |
| `POST` | `/api/scrape/enrich` | Memulai scraping Fase 2 untuk ID kost tertentu |
| `GET` | `/api/scrape/progress` | Server-Sent Events (SSE) live stream log aktivitas |
| `GET` | `/api/kost` | Mendapatkan daftar kost dengan parameter filter & sorting |
| `DELETE`| `/api/kost/clear` | Mengosongkan seluruh dataset di database lokal |
| `GET` | `/api/target-location` | Informasi titik koordinat target saat ini |
| `POST` | `/api/target-location` | Memperbarui titik target & hitung ulang rute |
| `GET` | `/api/export/excel` | Mengunduh seluruh dataset dalam format Excel `.xlsx` |
| `POST` | `/api/export/custom-excel` | Mengunduh data terfilter dari Workspace Excel Explorer |
| `GET` | `/api/export/csv` | Mengunduh seluruh dataset dalam format `.csv` |
| `POST` | `/api/export/custom-csv` | Mengunduh data terfilter dalam format `.csv` |

---

## Formula Value-for-Money (VFM)

Skor VFM (0 - 100) dihitung menggunakan normalisasi Min-Max terbobot:

$$NormPrice = \frac{Price - P_{min}}{P_{max} - P_{min}}$$
$$NormDist = \frac{Distance - D_{min}}{D_{max} - D_{min}}$$
$$VFM = 100 \times \left(1 - (W_{price} \times NormPrice + W_{dist} \times NormDist)\right)$$

- **Default Bobot**: $W_{price} = 0.50$, $W_{dist} = 0.50$ (dapat diatur real-time melalui slider).
- **Penalti Jarak Jauh**: Listing dengan jarak di atas 30 km dikenakan penalti bertingkat agar rekomendasi tetap relevan pada area target.

---

## Keamanan & Perlindungan Data

1. **Kredensial & Token**:
   Berkas `backend/config/session_config.json` dan `.env` sudah masuk ke `.gitignore` sehingga tidak akan terunggah ke repositori publik.
2. **Network Logs (`.har`)**:
   Semua file `.har` diabaikan oleh git karena berpotensi menyimpan session cookie dan token otentikasi browser pribadi.
3. **Database & File Hasil Ekspor**:
   File database lokal `*.db` dan seluruh file spreadsheet `*.xlsx` tidak dilacak oleh git untuk menjaga privasi data scraping.
