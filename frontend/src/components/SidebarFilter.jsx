import React, { useState } from 'react';
import {
  MapPin,
  Sliders,
  DollarSign,
  Users,
  Layers,
  Play,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  DoorOpen,
  CheckSquare,
  Square,
  X,
  Trash2
} from 'lucide-react';
import { FAC_ROOM, FAC_SHARE } from '../constants/facilities';

export default function SidebarFilter({
  targetLocation,
  onUpdateTargetLocation,
  onRecalculateRoutes,
  isRecalculating = false,
  filters,
  onFilterChange,
  onOpenFacilityModal,
  onStartDiscovery,
  onClearDatabase,
  isDiscovering = false
}) {
  const [targetInput, setTargetInput] = useState('');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  const handleSetTarget = async (e) => {
    e.preventDefault();
    if (!targetInput.trim()) return;
    setIsUpdatingTarget(true);
    try {
      await onUpdateTargetLocation(targetInput.trim());
      setTargetInput('');
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  // Multi-gender toggle: array of numbers [0, 1, 2]
  const selectedGenders = filters.selectedGenders || [0, 1, 2];
  const toggleGender = (val) => {
    let next;
    if (selectedGenders.includes(val)) {
      next = selectedGenders.filter((g) => g !== val);
      if (next.length === 0) next = [0, 1, 2];
    } else {
      next = [...selectedGenders, val];
    }
    onFilterChange('selectedGenders', next);
  };

  const selectedTagIds = filters.selectedTagIds || [];
  const allFacilities = [...FAC_ROOM, ...FAC_SHARE];
  const selectedFacilityObjects = allFacilities.filter((f) => selectedTagIds.includes(f.id));

  return (
    <aside className="w-80 flex-shrink-0 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-5 overflow-y-auto h-[calc(100vh-65px)] text-xs">
      {/* 1. Lokasi Target Tujuan (Editable) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span>Lokasi Target</span>
          </div>
          <button
            onClick={onRecalculateRoutes}
            disabled={isRecalculating}
            className="text-[10px] text-slate-400 hover:text-sky-400 flex items-center gap-1 transition"
            title="Hitung ulang rute kost terhadap lokasi ini"
          >
            <RefreshCw className={`w-3 h-3 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>Rute Ulang</span>
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-100 line-clamp-2">
          {targetLocation?.name || 'Memuat lokasi target...'}
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Lat: {targetLocation?.latitude ? targetLocation.latitude.toFixed(5) : '-'}, Lng: {targetLocation?.longitude ? targetLocation.longitude.toFixed(5) : '-'}
        </div>

        {/* Form Input Ganti Lokasi */}
        <form onSubmit={handleSetTarget} className="flex gap-1.5 pt-1">
          <input
            type="text"
            placeholder="Link Maps / -6.24, 106.83"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={isUpdatingTarget || !targetInput.trim()}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-md transition disabled:opacity-50 text-[11px]"
          >
            {isUpdatingTarget ? '...' : 'Set'}
          </button>
        </form>
      </div>

      {/* 2. Multi-Select Tipe Kost */}
      <div className="space-y-2">
        <label className="font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Tipe Kost
          </span>
          <span className="text-[10px] text-slate-400">Multi-Pilih</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 1, label: 'Putra' },
            { id: 2, label: 'Putri' },
            { id: 0, label: 'Campur' },
          ].map((g) => {
            const isChecked = selectedGenders.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGender(g.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  isChecked
                    ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 opacity-40" />}
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Fasilitas Modal Trigger Card (Bersih & Elegan) */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Fasilitas Mamikos
          </span>
          {selectedTagIds.length > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange('selectedTagIds', [])}
              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenFacilityModal}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 font-semibold rounded-lg transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {selectedTagIds.length === 0
              ? 'Atur Fasilitas (0 dipilih)'
              : `Fasilitas (${selectedTagIds.length} Dipilih)`}
          </span>
        </button>

        {/* Chips preview 3 item pertama */}
        {selectedTagIds.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {selectedFacilityObjects.slice(0, 4).map((f) => (
              <span
                key={f.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
              >
                {f.name}
              </span>
            ))}
            {selectedFacilityObjects.length > 4 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium text-slate-500">
                +{selectedFacilityObjects.length - 4} lainnya
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Filter Ketersediaan Kamar (Hanya Kamar Kosong) */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="font-semibold text-slate-200 text-xs">Hanya Kamar Kosong</div>
            <div className="text-[10px] text-slate-400">Sembunyikan kost yang penuh</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={!!filters.onlyAvailable}
            onChange={(e) => onFilterChange('onlyAvailable', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {/* 5. Filter Rating Minimum */}
      <div className="space-y-1.5">
        <label className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400" />
          <span>Rating Review Minimum</span>
        </label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { val: 0, label: 'Semua' },
            { val: 4.0, label: '★ 4.0+' },
            { val: 4.5, label: '★ 4.5+' },
            { val: 4.8, label: '★ 4.8+' }
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => onFilterChange('minRating', item.val)}
              className={`py-1 rounded text-[11px] font-medium border transition ${
                (filters.minRating || 0) === item.val
                  ? 'bg-amber-600 border-amber-500 text-white font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Rentang Harga */}
      <div className="space-y-2">
        <label className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rentang Harga (Rp)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Minimal</span>
            <input
              type="number"
              value={filters.priceMin}
              onChange={(e) => onFilterChange('priceMin', Number(e.target.value))}
              step="100000"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Maksimal</span>
            <input
              type="number"
              value={filters.priceMax}
              onChange={(e) => onFilterChange('priceMax', Number(e.target.value))}
              step="500000"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 7. Target Jumlah Kost (Discovery limit) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <label className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Kost</span>
          </label>
          <span className="font-mono text-sky-400 font-bold">{filters.targetCount} data</span>
        </div>
        <input
          type="range"
          min="10"
          max="150"
          step="10"
          value={filters.targetCount}
          onChange={(e) => onFilterChange('targetCount', Number(e.target.value))}
          className="w-full accent-sky-500 cursor-pointer"
        />
      </div>

      {/* 8. Bobot Value-for-Money */}
      <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center text-xs">
          <label className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Bobot VFM</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            Harga {Math.round(filters.weightPrice * 100)}% : Jarak {Math.round(filters.weightDistance * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={filters.weightDistance}
          onChange={(e) => {
            const wd = Number(e.target.value);
            onFilterChange('weightDistance', wd);
            onFilterChange('weightPrice', Number((1.0 - wd).toFixed(2)));
          }}
          className="w-full accent-amber-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Fokus Harga</span>
          <span>Seimbang</span>
          <span>Fokus Dekat</span>
        </div>
      </div>

      {/* 9. Tombol Start Fast Discovery */}
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onStartDiscovery}
          disabled={isDiscovering}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-950/50 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDiscovering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scraping Berjalan...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Start Fast Discovery</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onClearDatabase}
          disabled={isDiscovering}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 text-xs font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Kosongkan seluruh data kost di database lokal"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset Database</span>
        </button>
      </div>
    </aside>
  );
}
