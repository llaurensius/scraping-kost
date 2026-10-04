import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({ kostList = [], targetLocation = null, selectedKostId, onSelectKost }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersByIdRef = useRef({});

  // Inisialisasi Peta
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const initialLat = targetLocation?.latitude || -6.2407;
      const initialLng = targetLocation?.longitude || 106.8311;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersByIdRef.current = {};
    const bounds = [];

    // 1. Marker Target Tujuan (Merah)
    if (targetLocation && targetLocation.latitude && targetLocation.longitude) {
      const targetIcon = L.divIcon({
        className: 'custom-target-pin',
        html: `<div style="background-color: #ef4444; color: white; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">🎯</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const targetMarker = L.marker([targetLocation.latitude, targetLocation.longitude], { icon: targetIcon });
      targetMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
          <strong style="color: #ef4444; font-size: 14px;">🎯 Lokasi Target Tujuan</strong><br/>
          <span>${targetLocation.name || 'Lokasi Pilihan'}</span>
        </div>
      `);
      layer.addLayer(targetMarker);
      bounds.push([targetLocation.latitude, targetLocation.longitude]);
    }

    // 2. Markers Kost
    kostList.forEach((kost) => {
      if (!kost.latitude || !kost.longitude) return;

      let pinColor = '#94a3b8';
      if (kost.vfm_score >= 85) pinColor = '#22c55e';
      else if (kost.vfm_score >= 65) pinColor = '#eab308';
      else pinColor = '#f97316';

      const isSelected = String(selectedKostId) === String(kost.id);
      const size = isSelected ? 36 : 28;

      const kostIcon = L.divIcon({
        className: 'custom-kost-pin',
        html: `<div style="background-color: ${pinColor}; color: white; border: ${isSelected ? '3px solid #60a5fa' : '2px solid white'}; border-radius: 50%; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;">${Math.round(kost.vfm_score || 0)}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([kost.latitude, kost.longitude], { icon: kostIcon });
      markersByIdRef.current[String(kost.id)] = marker;

      const priceFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(kost.price_monthly || 0);
      const motorDist = kost.motorcycle_distance_km ? `${kost.motorcycle_distance_km} km` : '-';
      const motorTime = kost.motorcycle_duration_min ? `${kost.motorcycle_duration_min} mnt` : '-';

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; max-width: 240px; color: #f8fafc;">
          ${kost.cover_photo ? `<img src="${kost.cover_photo}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />` : ''}
          <strong style="font-size: 13px; color: #38bdf8;">${kost.name}</strong><br/>
          <div style="margin: 6px 0; color: #cbd5e1;">
            <span>💰 <strong>${priceFmt}</strong> / bln</span><br/>
            <span>🏍️ Jarak: ${motorDist} (${motorTime})</span><br/>
            <span>⭐ VFM: <strong style="color: ${pinColor}">${kost.vfm_score || 0}/100</strong> (${kost.vfm_category || '-'})</span>
            ${kost.owner_phone ? `<div style="color: #6ee7b7; font-weight: bold; margin-top: 4px;">📞 ${kost.owner_phone}</div>` : ''}
          </div>
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <a href="${kost.url_detail}" target="_blank" rel="noreferrer" style="flex: 1; text-align: center; background: #2563eb; color: white; padding: 4px 6px; border-radius: 4px; text-decoration: none; font-size: 11px;">Buka Web</a>
            ${kost.url_gmaps_route ? `<a href="${kost.url_gmaps_route}" target="_blank" rel="noreferrer" style="flex: 1; text-align: center; background: #059669; color: white; padding: 4px 6px; border-radius: 4px; text-decoration: none; font-size: 11px;">Rute Maps</a>` : ''}
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectKost) onSelectKost(kost.id);
      });

      layer.addLayer(marker);
      bounds.push([kost.latitude, kost.longitude]);
    });

    // Focus ke selected kost jika ada
    if (selectedKostId && markersByIdRef.current[String(selectedKostId)]) {
      const targetMarker = markersByIdRef.current[String(selectedKostId)];
      map.flyTo(targetMarker.getLatLng(), 16, { animate: true });
      targetMarker.openPopup();
    } else if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [kostList, targetLocation, selectedKostId]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 10 }} />
      
      {/* Legend Badge */}
      <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 text-xs space-y-1.5 shadow-lg text-slate-300 pointer-events-none">
        <div className="font-semibold text-slate-100 mb-1">Legenda Skor VFM:</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
          <span>Sangat Bagus (85 - 100)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
          <span>Standar (65 - 84)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
          <span>Kurang Efisien (&lt; 65)</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-700">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
          <span>🎯 Target Tujuan</span>
        </div>
      </div>
    </div>
  );
}
