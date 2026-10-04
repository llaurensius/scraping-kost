import React, { useMemo } from 'react';
import {
  ExternalLink,
  Navigation,
  CheckCircle2,
  Phone,
  MapPin,
  ArrowUpDown,
  Loader2
} from 'lucide-react';

export default function DataTable({
  kostList = [],
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  sortBy,
  sortOrder,
  onSortChange,
  onEnrichSelected,
  isEnriching = false,
  enrichingIds = [],
  onFocusOnMap
}) {
  // Instant client-side sorting comparator (0 ms latency)
  const sortedList = useMemo(() => {
    return [...kostList].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortBy === 'price') {
        const pA = Number(a.price_monthly || 0);
        const pB = Number(b.price_monthly || 0);
        return sortOrder === 'asc' ? pA - pB : pB - pA;
      }
      if (sortBy === 'distance') {
        const dA = Number(a.motorcycle_distance_km || a.straight_distance_km || 999);
        const dB = Number(b.motorcycle_distance_km || b.straight_distance_km || 999);
        return sortOrder === 'asc' ? dA - dB : dB - dA;
      }
      // Default sort: vfm_score
      const vA = Number(a.vfm_score || 0);
      const vB = Number(b.vfm_score || 0);
      return sortOrder === 'asc' ? vA - vB : vB - vA;
    });
  }, [kostList, sortBy, sortOrder]);

  const allSelected = sortedList.length > 0 && selectedIds.length === sortedList.length;

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

  const renderSortIndicator = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 ml-1 inline" />;
    return <span className="ml-1 text-sky-400 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300">
            {selectedIds.length} dari {sortedList.length} kost terpilih
          </span>
          {selectedIds.length > 0 && (
            <button
              onClick={onEnrichSelected}
              disabled={isEnriching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow transition disabled:opacity-50"
            >
              <Phone className="w-3.5 h-3.5" />
              {isEnriching ? 'Memproses Kontak...' : `Enrich ${selectedIds.length} Kost Terpilih (Fase 2)`}
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400">
          Klik header kolom untuk mengurutkan (0 ms instan)
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[620px]">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-950 text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-700 select-none">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-400 cursor-pointer"
                />
              </th>
              <th className="p-3 cursor-pointer select-none hover:text-white" onClick={() => onSortChange('name')}>
                Nama Kost {renderSortIndicator('name')}
              </th>
              <th className="p-3">Tipe</th>
              <th className="p-3 cursor-pointer select-none text-right hover:text-white" onClick={() => onSortChange('price')}>
                Harga Bulanan {renderSortIndicator('price')}
              </th>
              <th className="p-3 cursor-pointer select-none text-right hover:text-white" onClick={() => onSortChange('distance')}>
                Jarak Motor {renderSortIndicator('distance')}
              </th>
              <th className="p-3 text-right">Mobil</th>
              <th className="p-3 cursor-pointer select-none text-center hover:text-white" onClick={() => onSortChange('vfm_score')}>
                Skor VFM {renderSortIndicator('vfm_score')}
              </th>
              <th className="p-3">Alamat & Kontak</th>
              <th className="p-3 text-center">Aksi Rute & Peta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedList.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  Belum ada data kost yang sesuai filter. Silakan ubah filter atau jalankan <strong>"Start Fast Discovery"</strong>.
                </td>
              </tr>
            ) : (
              sortedList.map((kost) => {
                const isChecked = selectedIds.includes(kost.id);
                const isRowEnriching = enrichingIds.includes(kost.id);
                return (
                  <tr
                    key={kost.id}
                    className={`hover:bg-slate-800/60 transition ${
                      isRowEnriching
                        ? 'bg-indigo-950/40 ring-1 ring-indigo-500/50'
                        : isChecked
                        ? 'bg-slate-800/40'
                        : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelect(kost.id)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-sky-400 cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {kost.cover_photo ? (
                          <img
                            src={kost.cover_photo}
                            alt={kost.name}
                            className="w-12 h-12 rounded object-cover border border-slate-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-[10px] flex-shrink-0">
                            No Foto
                          </div>
                        )}
                        <div className="min-w-0">
                          <a
                            href={kost.url_detail}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-100 hover:text-sky-400 line-clamp-1 transition"
                          >
                            {kost.name}
                          </a>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>📍 {kost.district || kost.city || 'Jakarta'}</span>
                            {kost.room_size && <span>• {kost.room_size}</span>}
                            {kost.room_available > 0 ? (
                              <span className="text-emerald-400 font-medium">• Sisa {kost.room_available} kmr</span>
                            ) : (
                              <span className="text-rose-400 font-medium">• Kamar Penuh</span>
                            )}
                            {kost.rating > 0 && (
                              <span className="text-amber-400 font-medium">• ★ {kost.rating}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {kost.gender_type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-100">
                      {formatRupiah(kost.price_monthly)}
                    </td>
                    <td className="p-3 text-right font-medium text-slate-200">
                      <div>{kost.motorcycle_distance_km ? `${kost.motorcycle_distance_km} km` : '-'}</div>
                      <div className="text-[10px] text-slate-400">{kost.motorcycle_duration_min ? `${kost.motorcycle_duration_min} mnt` : ''}</div>
                    </td>
                    <td className="p-3 text-right text-slate-400">
                      <div>{kost.driving_distance_km ? `${kost.driving_distance_km} km` : '-'}</div>
                      <div className="text-[10px]">{kost.driving_duration_min ? `${kost.driving_duration_min} mnt` : ''}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${getVFMColorBadge(kost.vfm_score)}`}>
                        {Math.round(kost.vfm_score || 0)}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{kost.vfm_category || '-'}</div>
                    </td>
                    <td className="p-3 max-w-[200px]">
                      <div className="space-y-1">
                        {isRowEnriching ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengambil detail...
                          </span>
                        ) : kost.is_detail_enriched === 1 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Enriched
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Discovery Only</span>
                        )}
                        {kost.owner_phone && (
                          <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {kost.owner_phone}
                          </div>
                        )}
                        {kost.full_address && (
                          <div className="text-[10px] text-slate-400 line-clamp-2" title={kost.full_address}>
                            {kost.full_address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Tombol Fokus ke Peta 📍 */}
                        {onFocusOnMap && (
                          <button
                            type="button"
                            onClick={() => onFocusOnMap(kost)}
                            className="p-1.5 bg-sky-950/80 hover:bg-sky-800 text-sky-300 rounded border border-sky-700/60 transition"
                            title="Lihat & Fokus di Peta"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {kost.url_gmaps_route && (
                          <a
                            href={kost.url_gmaps_route}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 rounded border border-emerald-700/60 transition"
                            title="Petunjuk Arah Navigasi Maps"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <a
                          href={kost.url_detail}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                          title="Buka Halaman Mamikos"
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
    </div>
  );
}
