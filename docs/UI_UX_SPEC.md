# Spesifikasi UI/UX & Dual Workspace System

Dokumen ini menguraikan struktur antarmuka pengguna, pemisahan peran Dual Workspace, katalog fasilitas, serta alur interaksi.

---

## 1. Konsep Dual Workspace

Aplikasi memisahkan operasi ekstraksi data dari konsumsi/analisis data secara tegas:

```
+----------------------------------------------------------------------------------------------------+
|  🏠 MAMIKOS INTELLIGENCE   [ 🚀 Scraper Studio ]  [ 📊 Excel & Dataset Explorer (150) ]  [🟢 Active]|
+----------------------------------------------------------------------------------------------------+
```

### Workspace 1: Scraper Studio
- **Tujuan**: Konfigurasi parameter scraping, pemantauan progres real-time, visualisasi geografis (Peta Leaflet), dan manipulasi rute/target lokasi.
- **Komponen Utama**:
  1. **Sidebar Filter**:
     - Input Lokasi Target dinamis (Maps shortlink, URL, koordinat) + Tombol Hitung Ulang Rute.
     - Rentang harga (Min - Max), Tipe Gender (Putra, Putri, Campur).
     - Tombol buka Modal Fasilitas Lengkap.
     - Toggle Kamar Kosong Saja & Slider Bobot VFM (Harga vs Jarak).
     - Tombol *Start Fast Discovery* & *Reset Database*.
  2. **Peta Interaktif (Leaflet)**:
     - Marker merah: Lokasi target pengguna.
     - Marker berwarna sesuai skor VFM untuk setiap kost.
     - Klik marker memunculkan popup foto, harga, jarak motor/mobil/jalan, fasilitas, dan tautan kamar.
  3. **Tabel Data Ringkas**:
     - Kolom inti: Nama kost, gender, harga, jarak motor, skor VFM.
     - Checkbox seleksi untuk eksekusi *Phase 2 Deep Enrichment*.
  4. **Terminal Log Streaming**:
     - Menampilkan log aktivitas real-time dari backend via Server-Sent Events (SSE).

### Workspace 2: Excel & Dataset Explorer
- **Tujuan**: Analisis data mendalam menyerupai aplikasi spreadsheet profesional (Microsoft Excel / Google Sheets) langsung di browser tanpa perlu mengunduh berkas.
- **Komponen Utama**:
  1. **Top Metric Bar (KPI)**:
     - Total Kost Tersimpan.
     - Harga Rata-rata & Harga Termurah.
     - Jarak Terdekat & Rata-rata Waktu Tempuh Motor.
     - Rata-rata Skor VFM.
  2. **Spreadsheet Grid (26 Kolom Penuh)**:
     - *Sticky Columns*: ID, Foto Thumbnail, Nama Kost tetap terlihat saat scroll horizontal.
     - *Kolom Lengkap*: Tipe Kost, Harga Bulanan, Tipe Sewa, Jarak Motor, Waktu Motor, Jarak Mobil, Waktu Mobil, Jarak Jalan Kaki, Waktu Jalan Kaki, Skor VFM, Kategori VFM, Kamar Kosong, Ukuran Kamar, Rating, Ulasan, Garansi Refund, Nomor WhatsApp Pemilik, Alamat Lengkap, Fasilitas Kamar, Fasilitas Bersama, dll.
  3. **Multi-Column Filtering & Sorting**:
     - Filter berbasis teks, slider numerik, atau multi-pilihan per kolom.
     - Pengurutan cepat (Ascending / Descending) pada seluruh kolom numerik dan teks.
  4. **Selective Export Engine**:
     - Tombol *Export Filtered to Excel (.xlsx)* & *Export Filtered to CSV*.
     - Mengunduh hanya baris yang sesuai dengan kriteria filter aktif saat ini.

---

## 2. Katalog & Pemetaan Fasilitas Mamikos

Fasilitas diklasifikasikan ke dalam dua kelompok sesuai skema database internal Mamikos:

### A. Fasilitas Kamar (`FAC_ROOM`)
- AC (`tag_id: 1`)
- Kamar Mandi Dalam (`tag_id: 2`)
- WiFi (`tag_id: 3`)
- Kasur (`tag_id: 4`)
- Meja & Kursi (`tag_id: 5`)
- Lemari Baju (`tag_id: 6`)
- Air Panas / Water Heater (`tag_id: 7`)
- Kloset Duduk (`tag_id: 8`)
- TV (`tag_id: 9`)
- Jendela Kamar (`tag_id: 10`)

### B. Fasilitas Bersama & Aturan (`FAC_SHARE`)
- Dapur Bersama (`tag_id: 20`)
- Kulkas Bersama (`tag_id: 21`)
- Parkir Motor (`tag_id: 22`)
- Parkir Mobil (`tag_id: 23`)
- Mesin Cuci (`tag_id: 24`)
- Keamanan / CCTV 24 Jam (`tag_id: 25`)
- Akses 24 Jam (`tag_id: 26`)
- Khusus Karyawan / Mahasiswa (`tag_id: 27`)
