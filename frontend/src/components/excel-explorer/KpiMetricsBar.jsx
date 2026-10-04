import React, { useMemo } from 'react';
import { Layers, DollarSign, MapPin, Phone, Award, TrendingUp } from 'lucide-react';

export default function KpiMetricsBar({ items = [], totalDbCount = 0 }) {
  const metrics = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        count: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        minDistance: 0,
        avgDistance: 0,
        avgVfm: 0,
        enrichedCount: 0,
      };
    }

    const prices = items.map((i) => Number(i.price_monthly || 0)).filter((p) => p > 0);
    const distances = items
      .map((i) => Number(i.motorcycle_distance_km || i.straight_distance_km || 0))
      .filter((d) => d > 0);
    const vfms = items.map((i) => Number(i.vfm_score || 0)).filter((v) => v > 0);
    const enriched = items.filter((i) => i.is_detail_enriched === 1 || Boolean(i.owner_phone)).length;

    const sumPrice = prices.reduce((a, b) => a + b, 0);
    const sumDist = distances.reduce((a, b) => a + b, 0);
    const sumVfm = vfms.reduce((a, b) => a + b, 0);

    return {
      count: items.length,
      avgPrice: prices.length ? Math.round(sumPrice / prices.length) : 0,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      minDistance: distances.length ? Math.min(...distances) : 0,
      avgDistance: distances.length ? (sumDist / distances.length).toFixed(1) : 0,
      avgVfm: vfms.length ? Math.round(sumVfm / vfms.length) : 0,
      enrichedCount: enriched,
    };
  }, [items]);

  const formatRupiah = (val) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatShortRp = (val) => {
    if (!val) return 'Rp 0';
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}jt`;
    if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}rb`;
    return `Rp ${val}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Metric 1: Total Kost */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Kost</div>
          <div className="text-base font-bold text-slate-100 font-mono">
            {metrics.count}{' '}
            <span className="text-[11px] text-slate-500 font-normal">/ {totalDbCount}</span>
          </div>
        </div>
      </div>

      {/* Metric 2: Rata-Rata Harga */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Rata-Rata Harga</div>
          <div className="text-sm font-bold text-emerald-300 font-mono truncate" title={formatRupiah(metrics.avgPrice)}>
            {formatShortRp(metrics.avgPrice)}
            <span className="text-[10px] text-slate-500 font-normal">/bln</span>
          </div>
        </div>
      </div>

      {/* Metric 3: Rentang Harga */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Rentang Harga</div>
          <div className="text-xs font-bold text-slate-200 font-mono truncate">
            {formatShortRp(metrics.minPrice)} - {formatShortRp(metrics.maxPrice)}
          </div>
        </div>
      </div>

      {/* Metric 4: Jarak Terdekat */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Jarak Motor</div>
          <div className="text-sm font-bold text-rose-300 font-mono">
            {metrics.minDistance ? `${metrics.minDistance} km` : '-'}
            <span className="text-[10px] text-slate-500 font-normal"> (min)</span>
          </div>
        </div>
      </div>

      {/* Metric 5: Rata-Rata VFM */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Rata-Rata VFM</div>
          <div className="text-base font-bold text-amber-300 font-mono">
            {metrics.avgVfm}{' '}
            <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
          </div>
        </div>
      </div>

      {/* Metric 6: Enriched WhatsApp */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
          <Phone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Ada Kontak WA</div>
          <div className="text-base font-bold text-teal-300 font-mono">
            {metrics.enrichedCount}{' '}
            <span className="text-[10px] text-slate-500 font-normal">
              ({metrics.count ? Math.round((metrics.enrichedCount / metrics.count) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
