import React, { useState, useEffect } from 'react';
import { X, Check, Bed, Building2, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { FAC_ROOM, FAC_SHARE } from '../constants/facilities';

export default function FacilityModal({
  isOpen,
  onClose,
  selectedTagIds = [],
  onApply
}) {
  const [tempTags, setTempTags] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setTempTags(selectedTagIds);
    }
  }, [isOpen, selectedTagIds]);

  if (!isOpen) return null;

  const toggleTag = (id) => {
    if (tempTags.includes(id)) {
      setTempTags(tempTags.filter((t) => t !== id));
    } else {
      setTempTags([...tempTags, id]);
    }
  };

  const selectAllGroup = (group) => {
    const groupIds = group.map((item) => item.id);
    const merged = Array.from(new Set([...tempTags, ...groupIds]));
    setTempTags(merged);
  };

  const clearGroup = (group) => {
    const groupIds = group.map((item) => item.id);
    setTempTags(tempTags.filter((id) => !groupIds.includes(id)));
  };

  const handleSave = () => {
    onApply(tempTags);
    onClose();
  };

  const handleResetAll = () => {
    setTempTags([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              ✨
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Filter Fasilitas Kost Mamikos
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  {tempTags.length} Dipilih
                </span>
              </h2>
              <p className="text-xs text-slate-400">Kriteria filter fasilitas resmi server Mamikos (tag_ids)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Equal Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900">
          {/* Kolom 1: Fasilitas Kamar */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
                <Bed className="w-4 h-4" />
                <span>Fasilitas Kamar (13)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAllGroup(FAC_ROOM)}
                  className="text-sky-400 hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => clearGroup(FAC_ROOM)}
                  className="text-slate-400 hover:text-rose-400"
                >
                  Bersihkan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {FAC_ROOM.map((fac) => {
                const isChecked = tempTags.includes(fac.id);
                return (
                  <div
                    key={fac.id}
                    onClick={() => toggleTag(fac.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition ${
                      isChecked
                        ? 'bg-indigo-950/80 border-indigo-600 text-indigo-100 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-xs font-medium truncate">{fac.name}</span>
                    <div className="flex-shrink-0 ml-2">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kolom 2: Fasilitas Bersama */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                <Building2 className="w-4 h-4" />
                <span>Fasilitas Bersama (12)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => selectAllGroup(FAC_SHARE)}
                  className="text-emerald-400 hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => clearGroup(FAC_SHARE)}
                  className="text-slate-400 hover:text-rose-400"
                >
                  Bersihkan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {FAC_SHARE.map((fac) => {
                const isChecked = tempTags.includes(fac.id);
                return (
                  <div
                    key={fac.id}
                    onClick={() => toggleTag(fac.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer select-none transition ${
                      isChecked
                        ? 'bg-emerald-950/80 border-emerald-600 text-emerald-100 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-xs font-medium truncate">{fac.name}</span>
                    <div className="flex-shrink-0 ml-2">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Semua</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-950/50 transition"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Fasilitas ({tempTags.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
