import asyncio
import os
import pandas as pd
from datetime import datetime
from playwright.async_api import async_playwright

async def scrape_mamikos(
    location_keyword: str = "Jakarta Selatan", # Contoh: "Kemanggisan", "Kuningan", "Depok", "UGM"
    price_min: int = 500000,
    price_max: int = 2000000,
    gender: str = "putra",          # "all", "putra", "putri", "campur"
    target_count: int = 50,
    custom_filters: dict = None,  # contoh: {"required_facilities": ["AC", "WiFi"], "only_available": True}
    output_excel: str = "hasil_pencarian_kost.xlsx"
):
    """
    Hybrid Mamikos Scraper:
    - Membuka pencarian Mamikos di browser headless
    - Menangani dekripsi otomatis & autentikasi
    - Melakukan pagination halus melalui Vue component method `fetchMoreList`
    - Menerapkan filter fasilitas & kamar kosong langsung di server Mamikos
    - Filter rating minimum tetap lokal (API list Mamikos tidak punya filter rating)
    - Menyimpan data terstruktur rapi ke file Excel (.xlsx)
    """
    print("=" * 60)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] MAMIKOS SCRAPER (HYBRID ENGINE)")
    print("=" * 60)
    print(f"Target Lokasi   : {location_keyword or 'Sekitar Lokasi Otomatis'}")
    print(f"Rentang Harga   : Rp {price_min:,} - Rp {price_max:,}")
    print(f"Tipe Kost       : {gender.upper()}")
    print(f"Target Jumlah   : {target_count} data kos")
    if custom_filters:
        print(f"Custom Filters  : {custom_filters}")
    print("-" * 60)

    # Gender mapping untuk URL Mamikos
    # 0 = Campur, 1 = Putra, 2 = Putri
    gender_param = ""
    if gender.lower() == "putra":
        gender_param = "&gender=1"
    elif gender.lower() == "putri":
        gender_param = "&gender=2"
    elif gender.lower() == "campur":
        gender_param = "&gender=0"

    search_url = f"https://mamikos.com/cari?rent=2&sort=price,-&price={price_min}-{price_max}{gender_param}&singgahsini=0"

    collected_kosts = []
    seen_ids = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            locale="id-ID",
            viewport={"width": 1366, "height": 768}
        )
        page = await context.new_page()

        print(f"[*] Membuka URL pencarian dasar...")
        await page.goto(search_url, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(3000)

        # Jika user menentukan keyword lokasi tertentu
        if location_keyword:
            try:
                print(f"[*] Menerapkan kata kunci pencarian area: '{location_keyword}'...")
                # Cari input search box di navbar / search bar
                search_box = await page.query_selector('input[type="search"], input[placeholder*="Cari"], input[placeholder*="kost"]')
                if search_box:
                    await search_box.click()
                    await page.wait_for_timeout(500)
                    await search_box.fill(location_keyword)
                    await page.wait_for_timeout(1000)
                    await search_box.press("Enter")
                    print(f"[*] Menunggu hasil pencarian untuk '{location_keyword}'...")
                    await page.wait_for_timeout(4000)
            except Exception as e:
                print(f"[!] Info input pencarian: {e}")

        # --- Terapkan filter langsung ke server Mamikos (Vue store) ---
        server_missing = set()
        server_fac_ok = False
        server_avail_ok = False
        need_server_filter = bool(custom_filters) and (
            bool(custom_filters.get("required_facilities")) or bool(custom_filters.get("only_available"))
        )
        if need_server_filter:
            applied = await page.evaluate("""async ({facilities, onlyAvailable}) => {
                try {
                    const vue = document.querySelector('#app').__vue__;
                    const st = vue.$store.state;
                    const pool = [...(st.tagShare || []), ...(st.tagRules || []), ...(st.tagRooms || [])];
                    const idByName = {};
                    pool.forEach(t => {
                        const key = String(t.fac_name || '').trim().toLowerCase();
                        if (key && !(key in idByName)) idByName[key] = t.fac_id;
                    });
                    const ids = [], missing = [];
                    facilities.forEach(f => {
                        const id = idByName[String(f).trim().toLowerCase()];
                        if (id != null) ids.push(id); else missing.push(f);
                    });
                    if (ids.length) vue.$store.commit('setFilter', {tag_ids: ids});
                    if (onlyAvailable) vue.$store.commit('setFilter', {is_available: true});
                    if (ids.length || onlyAvailable) await vue.$store.dispatch('fetchRooms');
                    return {missing, applied: ids.length, available: !!onlyAvailable};
                } catch (e) {
                    return {missing: facilities, applied: 0, available: false, error: String(e)};
                }
            }""", {
                "facilities": list(custom_filters.get("required_facilities") or []),
                "onlyAvailable": bool(custom_filters.get("only_available")),
            })
            server_missing = {str(f).lower() for f in applied.get("missing", [])}
            server_fac_ok = applied.get("applied", 0) > 0
            server_avail_ok = bool(applied.get("available"))
            if applied.get("error"):
                print(f"[!] Server filter gagal ({applied['error']}), fallback ke filter lokal.")
            if server_fac_ok:
                print(f"[*] Fasilitas difilter oleh Mamikos: {custom_filters.get('required_facilities')}")
            if server_avail_ok:
                print("[*] 'Kamar kosong saja' difilter oleh server Mamikos.")
            if server_missing:
                print(f"[!] Fasilitas tidak dikenal Mamikos (filter lokal): {sorted(server_missing)}")

        # Cek total rooms dari Vue store
        total_rooms_in_mamikos = await page.evaluate("""() => {
            const root = document.querySelector('#app');
            return (root && root.__vue__ && root.__vue__.$store) ? root.__vue__.$store.state.totalRooms : 0;
        }""")
        print(f"[*] Terdeteksi total {total_rooms_in_mamikos} kos yang tersedia di server Mamikos untuk kriteria ini.")

        fetch_batch = 0
        max_batches = (target_count // 15) + 8 # Safety limit

        while len(collected_kosts) < target_count and fetch_batch < max_batches:
            fetch_batch += 1

            # Ambil semua data kos yang sudah didekripsi oleh Vue
            all_rooms = await page.evaluate("""() => {
                const root = document.querySelector('#app');
                if (root && root.__vue__ && root.__vue__.$store && root.__vue__.$store.state.kosList) {
                    return root.__vue__.$store.state.kosList;
                }
                return [];
            }""")

            # Parsing & Custom Filter
            for item in all_rooms:
                room_id = item.get("_id")
                if not room_id or room_id in seen_ids:
                    continue

                seen_ids.add(room_id)

                # Ekstraksi harga
                price_format = item.get("price_title_format") or {}
                raw_price = str(price_format.get("price", "0")).replace(".", "")
                raw_discount = str(price_format.get("discount_price", "0")).replace(".", "")
                price_val = int(raw_discount) if raw_discount.isdigit() and int(raw_discount) > 0 else (int(raw_price) if raw_price.isdigit() else 0)

                # Ekstraksi gender
                gender_map = {0: "Campur", 1: "Putra", 2: "Putri"}
                gender_str = gender_map.get(item.get("gender"), "Campur")

                # Fasilitas
                facilities = item.get("top_facility", []) or []
                facilities_str = ", ".join(facilities)

                # Sisa kamar
                avail = item.get("available_room", 0)

                kost_record = {
                    "ID": room_id,
                    "Nama Kos": item.get("room-title", ""),
                    "Tipe Gender": gender_str,
                    "Kecamatan / Area": item.get("subdistrict", "") or item.get("area_label", ""),
                    "Kota": item.get("city", ""),
                    "Harga / Bulan (Rp)": price_val,
                    "Format Harga": item.get("price_title_time", ""),
                    "Sisa Kamar": avail,
                    "Ukuran Kamar": item.get("size", "-"),
                    "Rating": item.get("rating", "-"),
                    "Jumlah Review": item.get("review_count", 0),
                    "Fasilitas Utama": facilities_str,
                    "Diskon": price_format.get("discount", "-"),
                    "Terakhir Update": item.get("online", "-"),
                    "Link Mamikos": item.get("share_url", f"https://mamikos.com/room/{room_id}")
                }

                # --- Penerapan Custom Filter (hanya yang belum di server Mamikos) ---
                valid = True
                if custom_filters:
                    # Fasilitas wajib: lokal hanya untuk nama yang gagal di-resolve server
                    required_facilities = custom_filters.get("required_facilities", [])
                    for req_fac in required_facilities:
                        if req_fac.lower() not in server_missing:
                            continue
                        if req_fac.lower() not in facilities_str.lower():
                            valid = False
                            break

                    # Kamar kosong: lokal hanya jika server filter tidak terpasang
                    if custom_filters.get("only_available", False) and not server_avail_ok and avail <= 0:
                        valid = False

                    # Filter rating minimum
                    min_rating = custom_filters.get("min_rating", 0)
                    try:
                        current_rating = float(kost_record["Rating"])
                        if current_rating < min_rating:
                            valid = False
                    except (ValueError, TypeError):
                        pass

                if valid:
                    collected_kosts.append(kost_record)
                    if len(collected_kosts) >= target_count:
                        break

            print(f"[*] Batch #{fetch_batch}: Berhasil memfilter {len(collected_kosts)} / {target_count} kos...")

            if len(collected_kosts) >= target_count:
                break

            # Panggil fetchMoreList untuk memuat batch 20 kos berikutnya
            has_more = await page.evaluate("""async () => {
                const el = document.querySelector('[data-testid="listKosMain"]');
                const parent = el ? el.__vue__.$parent : null;
                if (parent && parent.fetchMoreList) {
                    await parent.fetchMoreList();
                    return true;
                }
                return false;
            }""")

            if not has_more:
                print("[!] Tidak dapat memuat lebih banyak kos (akhir daftar tercapai).")
                break

            await page.wait_for_timeout(2500)

        await browser.close()

    print("\n" + "=" * 60)
    print(f"[*] SELESAI! Berhasil mengumpulkan {len(collected_kosts)} kos sesuai kriteria.")

    if collected_kosts:
        df = pd.DataFrame(collected_kosts)
        # Urutkan berdasarkan harga termurah
        df = df.sort_values(by="Harga / Bulan (Rp)", ascending=True)

        # Simpan ke spreadsheet Excel
        output_path = os.path.abspath(output_excel)
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Rekomendasi Kos")
            
            # Auto-adjust column width di Excel
            worksheet = writer.sheets["Rekomendasi Kos"]
            for col in worksheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = col[0].column_letter
                worksheet.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 50)

        print(f"[OK] File Excel berhasil disimpan di: {output_path}")
        return df
    else:
        print("[!] Tidak ada kos yang memenuhi seluruh kriteria filter Anda.")
        return None

def _ask(label, default, parser=str):
    raw = input(f"  {label} [{default}]: ").strip()
    if not raw:
        return default
    try:
        return parser(raw)
    except ValueError:
        print(f"    [!] Input tidak valid, pakai default: {default}")
        return default


if __name__ == "__main__":
    print("=" * 60)
    print("MAMIKOS SCRAPER - Menu Filter (Enter = pakai default)")
    print("=" * 60)

    location_keyword = _ask("Lokasi (kata kunci area)", "Jakarta Selatan")
    price_min = _ask("Harga minimal / bulan", 1000000, int)
    price_max = _ask("Harga maksimal / bulan", 3500000, int)

    gender = _ask("Tipe kost (all/putra/putri/campur)", "all").lower()
    if gender not in ("all", "putra", "putri", "campur"):
        print(f"    [!] Tipe kost tidak dikenal, pakai: all")
        gender = "all"

    target_count = _ask("Jumlah data yang diinginkan", 40, int)
    fac_raw = _ask("Fasilitas wajib (pisah koma, '-' jika kosong)", "WiFi")
    only_available = _ask("Hanya kamar kosong? (y/n)", "y").lower().startswith("y")
    min_rating = _ask("Rating minimal (0 jika tanpa batas)", 0, float)
    output_excel = _ask("File output (.xlsx)", "hasil_pencarian_kost.xlsx")

    custom_filters = {}
    facilities = [f.strip() for f in fac_raw.split(",") if f.strip() and f.strip() != "-"]
    if facilities:
        custom_filters["required_facilities"] = facilities
    if only_available:
        custom_filters["only_available"] = True
    if min_rating:
        custom_filters["min_rating"] = min_rating

    asyncio.run(scrape_mamikos(
        location_keyword=location_keyword,
        price_min=price_min,
        price_max=price_max,
        gender=gender,
        target_count=target_count,
        custom_filters=custom_filters or None,
        output_excel=output_excel,
    ))
