import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Download,
  Map,
  Table,
  Search,
  RefreshCw,
  Zap,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Play,
  Grid
} from 'lucide-react';

import SidebarFilter from './components/SidebarFilter';
import MapView from './components/MapView';
import DataTable from './components/DataTable';
import TerminalLogs from './components/TerminalLogs';
import FacilityModal from './components/FacilityModal';
import ExcelExplorerView from './components/excel-explorer/ExcelExplorerView';

export default function App() {
  // Main data states
  const [kostList, setKostList] = useState([]);
  const [targetLocation, setTargetLocation] = useState(null);
  const [sessionStatus, setSessionStatus] = useState({ status: 'CHECKING', message: '' });
  const [logs, setLogs] = useState([]);

  // Workspace Switcher: 'scraper' | 'excel'
  const [workspace, setWorkspace] = useState('scraper');

  // UI & Selection states
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedKostId, setSelectedKostId] = useState(null);
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);

  // Sorting & Filter states
  const [sortBy, setSortBy] = useState('vfm_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    priceMin: 500000,
    priceMax: 3500000,
    selectedGenders: [1, 2, 0], // 1: Putra, 2: Putri, 0: Campur
    selectedTagIds: [],         // Array of Mamikos fac_id
    onlyAvailable: false,       // Filter kamar kosong saja
    minRating: 0,               // 0: Semua, 4.0, 4.5, 4.8
    targetCount: 40,
    weightPrice: 0.60,
    weightDistance: 0.40
  });

  // Process status flags
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState([]);
  const [isTestingSession, setIsTestingSession] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // 1. Inisialisasi: Cek Session & Lokasi Target & Ambil Data Awal
  useEffect(() => {
    checkSessionHealth();
    fetchTargetLocation();
    fetchKostList();
  }, []);

  // 2. Setup Server-Sent Events (SSE) Progress Listener
  useEffect(() => {
    const eventSource = new EventSource('/api/scrape/progress');
    let debounceTimer = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchKostList();
      }, 500);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;
        setLogs((prev) => [...prev, data]);

        // Baris diperkaya selesai -> hapus dari enrichingIds & update list
        if (data.data && data.data.id) {
          setEnrichingIds((prev) => prev.filter((id) => id !== data.data.id));
          debouncedFetch();
        }
        if (data.message?.includes('menyimpan')) {
          debouncedFetch();
        }
        if (data.message?.includes('Discovery Selesai')) {
          setIsDiscovering(false);
          debouncedFetch();
        }
        if (data.message?.includes('Phase 2 Selesai')) {
          setIsEnriching(false);
          setEnrichingIds([]);
          debouncedFetch();
        }
      } catch (err) {
        console.error('Gagal parse SSE event:', err);
      }
    };

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      eventSource.close();
    };
  }, []);

  const checkSessionHealth = async () => {
    setIsTestingSession(true);
    try {
      const res = await fetch('/api/session/status');
      const data = await res.json();
      setSessionStatus(data);
    } catch (err) {
      setSessionStatus({ status: 'NETWORK_ERROR', message: 'Tidak dapat menghubungi server backend' });
    } finally {
      setIsTestingSession(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('Hapus seluruh data kost di database lokal? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }
    try {
      const res = await fetch('/api/kost/clear', { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        setKostList([]);
        setSelectedIds([]);
        setSelectedKostId(null);
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: `Database berhasil dikosongkan (${data.deleted_count} kost dihapus).`
          }
        ]);
      }
    } catch (err) {
      console.error('Gagal mereset database:', err);
      alert('Gagal mereset database.');
    }
  };

  const fetchTargetLocation = async () => {
    try {
      const res = await fetch('/api/target-location');
      const data = await res.json();
      setTargetLocation(data);
    } catch (err) {
      console.error('Gagal mengambil target location:', err);
    }
  };

  const fetchKostList = async () => {
    try {
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 1000,
        _t: Date.now()
      });
      const res = await fetch(`/api/kost?${params.toString()}`);
      const data = await res.json();
      setKostList(data.items || []);
    } catch (err) {
      console.error('Gagal memuat list kost:', err);
    }
  };

  // Reactive In-Memory Filter Pipeline (0 ms Instant UI response)
  const filteredKostList = useMemo(() => {
    return kostList.filter((k) => {
      // 1. Rentang Harga
      const price = Number(k.price_monthly || 0);
      if (filters.priceMin && price < filters.priceMin) return false;
      if (filters.priceMax && price > filters.priceMax) return false;

      // 2. Tipe Gender Multi-Select
      const genderMap = { 0: 'campur', 1: 'putra', 2: 'putri' };
      if (filters.selectedGenders && filters.selectedGenders.length < 3) {
        const allowedTypes = filters.selectedGenders.map((g) => genderMap[g]);
        if (!allowedTypes.includes((k.gender_type || '').toLowerCase())) return false;
      }

      // 3. Hanya Kamar Kosong
      if (filters.onlyAvailable && Number(k.room_available || 0) <= 0) {
        return false;
      }

      // 4. Rating Minimum
      if (filters.minRating && filters.minRating > 0) {
        const r = Number(k.rating || 0);
        if (r < filters.minRating) return false;
      }

      // 5. Pencarian Teks Lokal
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inName = (k.name || '').toLowerCase().includes(q);
        const inDistrict = (k.district || '').toLowerCase().includes(q);
        const inAddr = (k.full_address || '').toLowerCase().includes(q);
        const inFac = Array.isArray(k.facilities_room) && k.facilities_room.some((f) => String(f).toLowerCase().includes(q));
        if (!inName && !inDistrict && !inAddr && !inFac) return false;
      }
      return true;
    });
  }, [kostList, filters, searchQuery]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFacilityModal = (newTagIds) => {
    handleFilterChange('selectedTagIds', newTagIds);
  };

  const handleUpdateTargetLocation = async (targetInput) => {
    try {
      const res = await fetch('/api/target-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_input: targetInput, recalculate: true })
      });
      const data = await res.json();
      if (res.ok) {
        setTargetLocation(data.target_location);
        fetchKostList();
        alert(`Lokasi target diubah ke: ${data.target_location.name}`);
      } else {
        alert(`Gagal ubah target: ${data.message}`);
      }
    } catch (err) {
      alert('Error saat mengirim target baru');
    }
  };

  const handleRecalculateRoutes = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/routes/recalculate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchKostList();
        alert(`Berhasil menghitung ulang rute untuk ${data.recalculated_count} kost.`);
      }
    } catch (err) {
      alert('Gagal menghitung ulang rute');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleStartDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/scrape/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genders: filters.selectedGenders,
          tag_ids: filters.selectedTagIds,
          price_min: filters.priceMin,
          price_max: filters.priceMax,
          target_count: filters.targetCount,
          weight_price: filters.weightPrice,
          weight_distance: filters.weightDistance
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Gagal memulai: ${errData.message}`);
        setIsDiscovering(false);
      }
    } catch (err) {
      alert('Error saat mengirim request discovery');
      setIsDiscovering(false);
    }
  };

  const handleEnrichSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsEnriching(true);
    setEnrichingIds([...selectedIds]);
    try {
      const res = await fetch('/api/scrape/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kost_ids: selectedIds })
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Gagal: ${errData.message}`);
        setIsEnriching(false);
        setEnrichingIds([]);
      }
    } catch (err) {
      alert('Error saat mengirim request enrichment');
      setIsEnriching(false);
      setEnrichingIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredKostList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredKostList.map((k) => k.id));
    }
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(nextOrder);
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Cross-highlight: Klik icon 📍 di tabel langsung beralih ke peta & fokus
  const handleFocusOnMap = (kost) => {
    setSelectedKostId(kost.id);
    setActiveTab('map');
  };

  const isSessionActive = sessionStatus.status === 'ACTIVE';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0 z-20">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-lg">
            🏠
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Mamikos Intelligence
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                V2.0 Dual
              </span>
            </h1>
            <p className="text-xs text-slate-400">Scraping & Location Intelligence System</p>
          </div>
        </div>

        {/* Center: Dual Workspace Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setWorkspace('scraper')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              workspace === 'scraper'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Scraper Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspace('excel')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              workspace === 'excel'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel & Dataset Explorer ({kostList.length})</span>
          </button>
        </div>

        {/* Right Controls: Session Health & Export */}
        <div className="flex items-center gap-3">
          {/* Session Badge */}
          <div
            onClick={checkSessionHealth}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
              isSessionActive
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-rose-950/80 border-rose-800 text-rose-300 hover:bg-rose-900/80'
            }`}
            title={sessionStatus.message || 'Klik untuk test ulang sesi'}
          >
            {isSessionActive ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="font-semibold">
              {isSessionActive ? 'Session Active' : 'Session Expired'}
            </span>
            {isTestingSession && <RefreshCw className="w-3 h-3 animate-spin ml-1 text-slate-400" />}
          </div>

          {/* Test Session Action */}
          <button
            onClick={checkSessionHealth}
            disabled={isTestingSession}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Uji kesehatan session API Mamikos"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Session</span>
          </button>
        </div>
      </header>

      {/* Workspace Content Router */}
      {workspace === 'scraper' ? (
        /* WORKSPACE 1: LIVE SCRAPER STUDIO */
        <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar */}
          <SidebarFilter
            targetLocation={targetLocation}
            onUpdateTargetLocation={handleUpdateTargetLocation}
            onRecalculateRoutes={handleRecalculateRoutes}
            isRecalculating={isRecalculating}
            filters={filters}
            onFilterChange={handleFilterChange}
            onOpenFacilityModal={() => setIsFacilityModalOpen(true)}
            onStartDiscovery={handleStartDiscovery}
            onClearDatabase={handleClearDatabase}
            isDiscovering={isDiscovering}
          />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-5 gap-4">
            {/* Content Sub-Header & Tabs */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'table'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Tabel Data Ringkas ({filteredKostList.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'map'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Peta Interaktif</span>
                </button>
              </div>

              {/* Search Bar & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama, area, fasilitas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-500"
                  />
                </div>
                <button
                  onClick={fetchKostList}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
                  title="Muat Ulang Data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* View Container */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'map' ? (
                <MapView
                  kostList={filteredKostList}
                  targetLocation={targetLocation}
                  selectedKostId={selectedKostId}
                  onSelectKost={(id) => setSelectedKostId(id)}
                />
              ) : (
                <DataTable
                  kostList={filteredKostList}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                  onEnrichSelected={handleEnrichSelected}
                  isEnriching={isEnriching}
                  enrichingIds={enrichingIds}
                  onFocusOnMap={handleFocusOnMap}
                />
              )}
            </div>
          </main>

          {/* Live Scraping Terminal */}
          <TerminalLogs logs={logs} onClear={() => setLogs([])} />
        </div>
      ) : (
        /* WORKSPACE 2: EXCEL & DATASET EXPLORER (FULL WIDTH SPREADSHEET 26 KOLOM) */
        <ExcelExplorerView kostList={kostList} onRefresh={fetchKostList} />
      )}

      {/* Modal Dialog Fasilitas Mamikos (2 Kolom) */}
      <FacilityModal
        isOpen={isFacilityModalOpen}
        onClose={() => setIsFacilityModalOpen(false)}
        selectedTagIds={filters.selectedTagIds}
        onApply={handleApplyFacilityModal}
      />
    </div>
  );
}
