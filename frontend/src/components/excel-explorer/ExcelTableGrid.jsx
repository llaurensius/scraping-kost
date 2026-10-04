import React from 'react';
import { ExternalLink, Navigation, CheckCircle2, Phone, MapPin } from 'lucide-react';
import ColumnFilterMenu from './ColumnFilterMenu';

export default function ExcelTableGrid({
  items = [],
  columnFilters = {},
  onApplyColumnFilter,
  onResetColumnFilter,
  sortBy,
  sortOrder,
  onSortChange
}) {
  const formatRupiah = (val) => {
    if (!val) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getVFMColorBadge = (score) => {
    if (score >= 85) return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    if (score >= 65) return 'bg-amber-950 text-amber-300 border-amber-800';
    return 'bg-rose-950 text-rose-300 border-rose-800';
  };

  // Ekstraksi nilai unik untuk dropdown filter
  const getUniqueValues = (key) => {
    const vals = items.map((item) => {
      const v = item[key];
      if (v === null || v === undefined) return '';
      return String(v).trim();
    });
    return Array.from(new Set(vals.filter(Boolean))).sort();
  };

  const currentSortObj = { field: sortBy, order: sortOrder };

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-auto border border-slate-800 bg-slate-950 rounded-xl shadow-inner select-text">
      <table className="w-max text-left text-xs text-slate-300 border-collapse">
        <thead className="sticky top-0 z-30 bg-slate-900 border-b-2 border-slate-700 text-slate-200 uppercase tracking-wider text-[11px]">
          <tr>
            {/* 1. Freeze Pane: No */}
            <th className="sticky left-0 z-40 bg-slate-900 border-r border-slate-800 px-3 py-3 w-12 text-center">
              No
            </th>

            {/* 2. Freeze Pane: ID Kost */}
            <th className="sticky left-12 z-40 bg-slate-900 border-r border-slate-800 px-3 py-3 w-28 whitespace-nowrap">
              <div className="flex items-center justify-between gap-1">
                <span>ID Kost</span>
                <ColumnFilterMenu
                  columnKey="id"
                  columnTitle="ID Kost"
                  columnType="search"
                  currentFilter={columnFilters.id}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 3. Freeze Pane: Nama Kost */}
            <th className="sticky left-40 z-40 bg-slate-900 border-r-2 border-slate-700 px-4 py-3 min-w-[260px] shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between gap-2">
                <span>Nama Kost</span>
                <ColumnFilterMenu
                  columnKey="name"
                  columnTitle="Nama Kost"
                  columnType="search"
                  currentFilter={columnFilters.name}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 4. Tipe Gender */}
            <th className="border-r border-slate-800 px-3 py-3 w-28">
              <div className="flex items-center justify-between gap-1">
                <span>Gender</span>
                <ColumnFilterMenu
                  columnKey="gender_type"
                  columnTitle="Tipe Gender"
                  columnType="text"
                  uniqueValues={getUniqueValues('gender_type')}
                  currentFilter={columnFilters.gender_type}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 5. Harga Bulanan */}
            <th className="border-r border-slate-800 px-3 py-3 w-36 text-right">
              <div className="flex items-center justify-end gap-1">
                <span>Harga / Bln</span>
                <ColumnFilterMenu
                  columnKey="price_monthly"
                  columnTitle="Harga Bulanan"
                  columnType="number"
                  currentFilter={columnFilters.price_monthly}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 6. Skor VFM */}
            <th className="border-r border-slate-800 px-3 py-3 w-32 text-center">
              <div className="flex items-center justify-center gap-1">
                <span>Skor VFM</span>
                <ColumnFilterMenu
                  columnKey="vfm_score"
                  columnTitle="Skor VFM"
                  columnType="number"
                  currentFilter={columnFilters.vfm_score}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 7. Kategori VFM */}
            <th className="border-r border-slate-800 px-3 py-3 w-40">
              <div className="flex items-center justify-between gap-1">
                <span>Kategori VFM</span>
                <ColumnFilterMenu
                  columnKey="vfm_category"
                  columnTitle="Kategori VFM"
                  columnType="text"
                  uniqueValues={getUniqueValues('vfm_category')}
                  currentFilter={columnFilters.vfm_category}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 8. Jarak Motor */}
            <th className="border-r border-slate-800 px-3 py-3 w-32 text-right">
              <div className="flex items-center justify-end gap-1">
                <span>Jarak Motor</span>
                <ColumnFilterMenu
                  columnKey="motorcycle_distance_km"
                  columnTitle="Jarak Motor (km)"
                  columnType="number"
                  currentFilter={columnFilters.motorcycle_distance_km}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 9. Waktu Motor */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-right">Waktu Motor</th>

            {/* 10. Jarak Mobil */}
            <th className="border-r border-slate-800 px-3 py-3 w-32 text-right">
              <div className="flex items-center justify-end gap-1">
                <span>Jarak Mobil</span>
                <ColumnFilterMenu
                  columnKey="driving_distance_km"
                  columnTitle="Jarak Mobil (km)"
                  columnType="number"
                  currentFilter={columnFilters.driving_distance_km}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 11. Waktu Mobil */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-right">Waktu Mobil</th>

            {/* 12. Jarak Jalan */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-right">Jarak Jalan</th>
            {/* 13. Waktu Jalan */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-right">Waktu Jalan</th>
            {/* 14. Garis Lurus */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-right">Garis Lurus</th>

            {/* 15. Sisa Kamar */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-center">
              <div className="flex items-center justify-center gap-1">
                <span>Sisa Kmr</span>
                <ColumnFilterMenu
                  columnKey="room_available"
                  columnTitle="Sisa Kamar"
                  columnType="number"
                  currentFilter={columnFilters.room_available}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 16. Ukuran Kamar */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-center">Ukuran</th>

            {/* 17. Rating */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-center">
              <div className="flex items-center justify-center gap-1">
                <span>Rating</span>
                <ColumnFilterMenu
                  columnKey="rating"
                  columnTitle="Rating"
                  columnType="number"
                  currentFilter={columnFilters.rating}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 18. Review Count */}
            <th className="border-r border-slate-800 px-3 py-3 w-28 text-center">Review</th>

            {/* 19. Fasilitas Kamar */}
            <th className="border-r border-slate-800 px-3 py-3 min-w-[220px]">
              <div className="flex items-center justify-between gap-1">
                <span>Fasilitas Kamar</span>
                <ColumnFilterMenu
                  columnKey="facilities_room"
                  columnTitle="Fasilitas Kamar"
                  columnType="search"
                  currentFilter={columnFilters.facilities_room}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                />
              </div>
            </th>

            {/* 20. Fasilitas Bersama */}
            <th className="border-r border-slate-800 px-3 py-3 min-w-[180px]">Fasilitas Bersama</th>

            {/* 21. No WhatsApp/Telp */}
            <th className="border-r border-slate-800 px-3 py-3 w-36">
              <div className="flex items-center justify-between gap-1">
                <span>Kontak WA</span>
                <ColumnFilterMenu
                  columnKey="owner_phone"
                  columnTitle="Kontak WA"
                  columnType="search"
                  currentFilter={columnFilters.owner_phone}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                />
              </div>
            </th>

            {/* 22. Alamat Lengkap */}
            <th className="border-r border-slate-800 px-3 py-3 min-w-[240px]">
              <div className="flex items-center justify-between gap-1">
                <span>Alamat Lengkap</span>
                <ColumnFilterMenu
                  columnKey="full_address"
                  columnTitle="Alamat Lengkap"
                  columnType="search"
                  currentFilter={columnFilters.full_address}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                />
              </div>
            </th>

            {/* 23. Kecamatan */}
            <th className="border-r border-slate-800 px-3 py-3 w-36">
              <div className="flex items-center justify-between gap-1">
                <span>Kecamatan</span>
                <ColumnFilterMenu
                  columnKey="district"
                  columnTitle="Kecamatan"
                  columnType="text"
                  uniqueValues={getUniqueValues('district')}
                  currentFilter={columnFilters.district}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 24. Kota */}
            <th className="border-r border-slate-800 px-3 py-3 w-36">
              <div className="flex items-center justify-between gap-1">
                <span>Kota</span>
                <ColumnFilterMenu
                  columnKey="city"
                  columnTitle="Kota"
                  columnType="text"
                  uniqueValues={getUniqueValues('city')}
                  currentFilter={columnFilters.city}
                  onApplyFilter={onApplyColumnFilter}
                  onResetFilter={onResetColumnFilter}
                  onSort={(k, o) => onSortChange(k, o)}
                  currentSort={currentSortObj}
                />
              </div>
            </th>

            {/* 25. Status Enrich */}
            <th className="border-r border-slate-800 px-3 py-3 w-32 text-center">Status</th>

            {/* 26. Links Navigasi */}
            <th className="px-4 py-3 w-36 text-center">Aksi Hyperlink</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800">
          {items.length === 0 ? (
            <tr>
              <td colSpan={26} className="text-center py-16 text-slate-500 font-medium">
                Tidak ada data kost yang memenuhi kombinasi filter spreadsheet saat ini.
              </td>
            </tr>
          ) : (
            items.map((kost, idx) => {
              const facRoomStr = Array.isArray(kost.facilities_room)
                ? kost.facilities_room.join(', ')
                : String(kost.facilities_room || '');
              const facShareStr = Array.isArray(kost.facilities_shared)
                ? kost.facilities_shared.join(', ')
                : String(kost.facilities_shared || '');

              return (
                <tr key={kost.id} className="hover:bg-slate-900/80 transition group">
                  {/* 1. Sticky No */}
                  <td className="sticky left-0 z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800 px-3 py-2 text-center font-mono text-slate-500">
                    {idx + 1}
                  </td>

                  {/* 2. Sticky ID */}
                  <td className="sticky left-12 z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800 px-3 py-2 font-mono text-[11px] text-slate-400">
                    {kost.id}
                  </td>

                  {/* 3. Sticky Nama Kost */}
                  <td className="sticky left-40 z-20 bg-slate-950 group-hover:bg-slate-900 border-r-2 border-slate-700 px-4 py-2 font-semibold text-slate-100 shadow-[4px_0_10px_rgba(0,0,0,0.5)] whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {kost.cover_photo && (
                        <img
                          src={kost.cover_photo}
                          alt=""
                          className="w-7 h-7 rounded object-cover border border-slate-700 flex-shrink-0"
                        />
                      )}
                      <span className="truncate max-w-[220px]" title={kost.name}>
                        {kost.name}
                      </span>
                    </div>
                  </td>

                  {/* 4. Gender */}
                  <td className="border-r border-slate-800 px-3 py-2 capitalize font-medium text-slate-300">
                    {kost.gender_type}
                  </td>

                  {/* 5. Harga Bulanan */}
                  <td className="border-r border-slate-800 px-3 py-2 text-right font-bold text-slate-100 font-mono">
                    {formatRupiah(kost.price_monthly)}
                  </td>

                  {/* 6. Skor VFM */}
                  <td className="border-r border-slate-800 px-3 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getVFMColorBadge(kost.vfm_score)}`}>
                      {Math.round(kost.vfm_score || 0)}
                    </span>
                  </td>

                  {/* 7. Kategori VFM */}
                  <td className="border-r border-slate-800 px-3 py-2 text-slate-300 text-[11px]">
                    {kost.vfm_category || '-'}
                  </td>

                  {/* 8. Jarak Motor */}
                  <td className="border-r border-slate-800 px-3 py-2 text-right font-mono text-slate-200">
                    {kost.motorcycle_distance_km ? `${kost.motorcycle_distance_km} km` : '-'}
                  </td>

                  {/* 9. Waktu Motor */}
                  <td className="border-r border-slate-800 px-3 py-2 text-right font-mono text-slate-400">
                    {kost.motorcycle_duration_min ? `${kost.motorcycle_duration_min} mnt` : '-'}
                  </td>

                  {/* 10. Jarak Mobil */}
                  <td className="border-r border-slate-800 px-3 py-2 text-right font-mono text-slate-300">
                    {kost.driving_distance_km ? `${kost.driving_distance_km} km` : '-'}
                  </td>

                  {/* 11. Waktu Mobil */}
                  <td className="border-r border-slate-800 px-3 py-2 text-right font-mono text-slate-400">
                    {kost.driving_duration_min ? `${kost.driving_duration_min} mnt` : '-'}
                  </td>

                  {/* 12. Jarak Jalan */}
                  <td className="border-r border-slate-800 px-3 py-2 text-right font-mono text-slate-400">
                    {kost.walking_distance_km ? `${kost.walking_distance_km} km` : '-'}
                  </td>

                  {/* 13. Waktu Jalan */}
                  <td className="border-r border-slate-800 px-3 py-2 text-right font-mono text-slate-400">
                    {kost.walking_duration_min ? `${kost.walking_duration_min} mnt` : '-'}
                  </td>

                  {/* 14. Garis Lurus */}
                  <td className="border-r border-slate-800 px-3 py-2 text-right font-mono text-slate-400">
                    {kost.straight_distance_km ? `${kost.straight_distance_km} km` : '-'}
                  </td>

                  {/* 15. Sisa Kamar */}
                  <td className="border-r border-slate-800 px-3 py-2 text-center font-mono">
                    {kost.room_available > 0 ? (
                      <span className="text-emerald-400 font-bold">{kost.room_available}</span>
                    ) : (
                      <span className="text-rose-400 font-semibold">Penuh</span>
                    )}
                  </td>

                  {/* 16. Ukuran Kamar */}
                  <td className="border-r border-slate-800 px-3 py-2 text-center font-mono text-slate-400">
                    {kost.room_size || '-'}
                  </td>

                  {/* 17. Rating */}
                  <td className="border-r border-slate-800 px-3 py-2 text-center text-amber-400 font-semibold font-mono">
                    {kost.rating > 0 ? `★ ${kost.rating}` : '-'}
                  </td>

                  {/* 18. Review Count */}
                  <td className="border-r border-slate-800 px-3 py-2 text-center font-mono text-slate-400">
                    {kost.review_count || 0}
                  </td>

                  {/* 19. Fasilitas Kamar */}
                  <td className="border-r border-slate-800 px-3 py-2 max-w-xs truncate text-[11px] text-slate-400" title={facRoomStr}>
                    {facRoomStr || '-'}
                  </td>

                  {/* 20. Fasilitas Bersama */}
                  <td className="border-r border-slate-800 px-3 py-2 max-w-xs truncate text-[11px] text-slate-400" title={facShareStr}>
                    {facShareStr || '-'}
                  </td>

                  {/* 21. No WhatsApp */}
                  <td className="border-r border-slate-800 px-3 py-2 font-mono text-emerald-300 font-semibold">
                    {kost.owner_phone || '-'}
                  </td>

                  {/* 22. Alamat Lengkap */}
                  <td className="border-r border-slate-800 px-3 py-2 max-w-sm truncate text-slate-300 text-[11px]" title={kost.full_address}>
                    {kost.full_address || '-'}
                  </td>

                  {/* 23. Kecamatan */}
                  <td className="border-r border-slate-800 px-3 py-2 text-slate-300 whitespace-nowrap">
                    {kost.district || '-'}
                  </td>

                  {/* 24. Kota */}
                  <td className="border-r border-slate-800 px-3 py-2 text-slate-300 whitespace-nowrap">
                    {kost.city || '-'}
                  </td>

                  {/* 25. Status Enrich */}
                  <td className="border-r border-slate-800 px-3 py-2 text-center">
                    {kost.is_detail_enriched === 1 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Enriched
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Discovery</span>
                    )}
                  </td>

                  {/* 26. Links Navigasi */}
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {kost.url_gmaps_route && (
                        <a
                          href={kost.url_gmaps_route}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-700/60 transition"
                          title="Buka Navigasi Maps"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <a
                        href={kost.url_detail}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 bg-sky-950 hover:bg-sky-800 text-sky-300 rounded border border-sky-700/60 transition"
                        title="Buka Web Mamikos"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
