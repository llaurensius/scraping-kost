import React, { useState, useEffect, useRef } from 'react';
import { Filter, ArrowUp, ArrowDown, X, Check, Search } from 'lucide-react';

export default function ColumnFilterMenu({
  columnKey,
  columnTitle,
  columnType = 'text', // 'text' | 'number' | 'search'
  uniqueValues = [],
  currentFilter,
  onApplyFilter,
  onResetFilter,
  onSort,
  currentSort
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [selectedValues, setSelectedValues] = useState([]);
  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');
  const popoverRef = useRef(null);

  const isFilterActive = Boolean(
    currentFilter &&
    ((Array.isArray(currentFilter) && currentFilter.length > 0) ||
     (typeof currentFilter === 'object' && (currentFilter.min || currentFilter.max)) ||
     (typeof currentFilter === 'string' && currentFilter.trim()))
  );

  useEffect(() => {
    if (isOpen) {
      if (columnType === 'text') {
        setSelectedValues(Array.isArray(currentFilter) ? currentFilter : []);
      } else if (columnType === 'number') {
        setMinVal(currentFilter?.min ?? '');
        setMaxVal(currentFilter?.max ?? '');
      } else if (columnType === 'search') {
        setSearchVal(typeof currentFilter === 'string' ? currentFilter : '');
      }
    }
  }, [isOpen, currentFilter, columnType]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleApply = () => {
    if (columnType === 'text') {
      onApplyFilter(columnKey, selectedValues);
    } else if (columnType === 'number') {
      onApplyFilter(columnKey, {
        min: minVal !== '' ? Number(minVal) : null,
        max: maxVal !== '' ? Number(maxVal) : null
      });
    } else if (columnType === 'search') {
      onApplyFilter(columnKey, searchVal.trim());
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    onResetFilter(columnKey);
    setSelectedValues([]);
    setMinVal('');
    setMaxVal('');
    setSearchVal('');
    setIsOpen(false);
  };

  const toggleValue = (val) => {
    if (selectedValues.includes(val)) {
      setSelectedValues(selectedValues.filter((v) => v !== val));
    } else {
      setSelectedValues([...selectedValues, val]);
    }
  };

  const filteredUniqueValues = uniqueValues.filter((v) =>
    String(v).toLowerCase().includes(searchVal.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded transition select-none ${
          isFilterActive
            ? 'bg-sky-500 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
        title={`Filter kolom ${columnTitle}`}
      >
        <Filter className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-3 text-xs text-slate-200 space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Popover */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-semibold text-slate-100">
            <span className="truncate">{columnTitle}</span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Sort Buttons */}
          {onSort && (
            <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onSort(columnKey, 'asc');
                  setIsOpen(false);
                }}
                className={`flex items-center justify-center gap-1 py-1 px-2 rounded font-medium border text-[11px] transition ${
                  currentSort?.field === columnKey && currentSort?.order === 'asc'
                    ? 'bg-sky-950 border-sky-600 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <ArrowUp className="w-3 h-3" /> Naik (A-Z)
              </button>
              <button
                type="button"
                onClick={() => {
                  onSort(columnKey, 'desc');
                  setIsOpen(false);
                }}
                className={`flex items-center justify-center gap-1 py-1 px-2 rounded font-medium border text-[11px] transition ${
                  currentSort?.field === columnKey && currentSort?.order === 'desc'
                    ? 'bg-sky-950 border-sky-600 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <ArrowDown className="w-3 h-3" /> Turun (Z-A)
              </button>
            </div>
          )}

          {/* Content according to type */}
          {columnType === 'text' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari nilai..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 pl-7 text-[11px] text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <button
                  type="button"
                  onClick={() => setSelectedValues(uniqueValues)}
                  className="text-sky-400 hover:underline"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedValues([])}
                  className="text-rose-400 hover:underline"
                >
                  Hapus Semua
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {filteredUniqueValues.length === 0 ? (
                  <div className="text-slate-500 text-center py-2 text-[11px]">Tidak ada opsi</div>
                ) : (
                  filteredUniqueValues.map((val, idx) => {
                    const isChecked = selectedValues.includes(val);
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition select-none ${
                          isChecked ? 'bg-slate-800 text-sky-300' : 'text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleValue(val)}
                          className="rounded border-slate-700 text-sky-500 focus:ring-0"
                        />
                        <span className="truncate text-[11px]">{String(val || '(Kosong)')}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {columnType === 'number' && (
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Nilai Minimal</span>
                <input
                  type="number"
                  value={minVal}
                  onChange={(e) => setMinVal(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Nilai Maksimal</span>
                <input
                  type="number"
                  value={maxVal}
                  onChange={(e) => setMaxVal(e.target.value)}
                  placeholder="Tidak terbatas"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {columnType === 'search' && (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 block mb-1">Mengandung Teks</span>
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Contoh: AC, Tebet, WiFi..."
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Popover Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded transition text-[11px]"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
