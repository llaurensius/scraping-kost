import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Layers,
  Download,
  FilterX
} from 'lucide-react';
import KpiMetricsBar from './KpiMetricsBar';
import ExcelTableGrid from './ExcelTableGrid';

export default function ExcelExplorerView({ kostList = [], onRefresh }) {
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState('vfm_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isExporting, setIsExporting] = useState(false);

  // Handler filter per kolom
  const handleApplyColumnFilter = (columnKey, filterValue) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: filterValue
    }));
  };

  const handleResetColumnFilter = (columnKey) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
  };

  const handleResetAllFilters = () => {
    setColumnFilters({});
    setGlobalSearch('');
  };

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Pipeline filter multi-kriteria pada seluruh 26 kolom
  const filteredItems = useMemo(() => {
    return kostList.filter((item) => {
      // 1. Global text search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const fullText = [
          item.name,
          item.district,
          item.city,
          item.full_address,
          item.owner_phone,
          Array.isArray(item.facilities_room) ? item.facilities_room.join(' ') : item.facilities_room,
          item.gender_type,
          item.vfm_category
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!fullText.includes(q)) return false;
      }

      // 2. Evaluasi filter per kolom
      for (const [colKey, filterVal] of Object.entries(columnFilters)) {
        if (filterVal === undefined || filterVal === null) continue;

        // Filter tipe text checklist (multi-select)
        if (Array.isArray(filterVal) && filterVal.length > 0) {
          const itemVal = String(item[colKey] || '').trim();
          if (!filterVal.includes(itemVal)) return false;
        }
        // Filter tipe number (range min-max)
        else if (typeof filterVal === 'object' && (filterVal.min !== null || filterVal.max !== null)) {
          const itemNum = Number(item[colKey] || 0);
          if (filterVal.min !== null && filterVal.min !== undefined && itemNum < filterVal.min) return false;
          if (filterVal.max !== null && filterVal.max !== undefined && itemNum > filterVal.max) return false;
        }
        // Filter tipe search substring
        else if (typeof filterVal === 'string' && filterVal.trim()) {
          const q = filterVal.toLowerCase();
          const itemVal = String(item[colKey] || '').toLowerCase();
          if (!itemVal.includes(q)) return false;
        }
      }

      return true;
    });
  }, [kostList, globalSearch, columnFilters]);

  // Sort pipeline
  const sortedAndFilteredItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortBy === 'price_monthly') {
        const valA = Number(a.price_monthly || 0);
        const valB = Number(b.price_monthly || 0);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortBy === 'motorcycle_distance_km' || sortBy === 'driving_distance_km') {
        const valA = Number(a[sortBy] || a.straight_distance_km || 999);
        const valB = Number(b[sortBy] || b.straight_distance_km || 999);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortBy === 'vfm_score' || sortBy === 'rating' || sortBy === 'room_available') {
        const valA = Number(a[sortBy] || 0);
        const valB = Number(b[sortBy] || 0);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      // Default: string compare
      const strA = String(a[sortBy] || '').toLowerCase();
      const strB = String(b[sortBy] || '').toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredItems, sortBy, sortOrder]);

  // Export WYSIWYG (hanya data yang sedang aktif difilter di layar)
  const handleExportFiltered = async (type = 'excel') => {
    if (sortedAndFilteredItems.length === 0) {
      alert('Tidak ada baris data yang lolos filter untuk diekspor.');
      return;
    }
    setIsExporting(true);
    try {
      const endpoint = type === 'excel' ? '/api/export/custom-excel' : '/api/export/custom-csv';
      const kostIds = sortedAndFilteredItems.map((i) => String(i.id));

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kost_ids: kostIds,
          sort_by: sortBy,
          sort_order: sortOrder
        })
      });

      if (!res.ok) throw new Error('Gagal mengekspor file');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel' ? 'kost_explorer_filtered.xlsx' : 'kost_explorer_filtered.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Error ekspor: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const totalActiveFiltersCount = Object.keys(columnFilters).length + (globalSearch.trim() ? 1 : 0);

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] w-full p-5 gap-4 overflow-hidden bg-slate-950">
      {/* 1. KPI Metrics Bar */}
      <KpiMetricsBar items={sortedAndFilteredItems} totalDbCount={kostList.length} />

      {/* 2. Spreadsheet Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari di semua 26 kolom (nama, alamat, kecamatan, WA, fasilitas)..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {totalActiveFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 rounded-lg transition whitespace-nowrap"
              title="Reset seluruh filter kolom"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Reset Filter ({totalActiveFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Right Action: WYSIWYG Export Buttons */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400 mr-2 hidden sm:block">
            Menampilkan <strong className="text-slate-100 font-mono">{sortedAndFilteredItems.length}</strong> baris
          </div>
          <button
            type="button"
            onClick={() => handleExportFiltered('excel')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition disabled:opacity-50"
            title="Download Excel dari baris yang sedang aktif setelah difilter"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Mengunduh...' : 'Unduh Excel Terfilter (.xlsx)'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportFiltered('csv')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition disabled:opacity-50"
            title="Download CSV dari baris yang sedang aktif"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 3. Full-Width 26 Columns Grid */}
      <div className="flex-1 overflow-hidden">
        <ExcelTableGrid
          items={sortedAndFilteredItems}
          columnFilters={columnFilters}
          onApplyColumnFilter={handleApplyColumnFilter}
          onResetColumnFilter={handleResetColumnFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}
