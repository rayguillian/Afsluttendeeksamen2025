import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom divIcons avoid Leaflet's classic "missing marker image" bundler issue
// and keep the map on-brand.
function storeIcon(index, active) {
  return L.divIcon({
    className: '',
    html: `<div style="
      display:grid;place-items:center;width:30px;height:30px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${active ? '#059669' : '#10b981'};
      color:#fff;font-weight:800;font-size:13px;border:2px solid #fff;
      box-shadow:0 3px 8px rgba(5,95,70,.45)">
      <span style="transform:rotate(45deg)">${index}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px">
    <span style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:.25;animation:ks-pulse 2s ease-out infinite"></span>
    <span style="position:absolute;inset:5px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>
  </div>
  <style>@keyframes ks-pulse{0%{transform:scale(1);opacity:.4}100%{transform:scale(2.6);opacity:0}}</style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Keep the map framed around everything relevant whenever the inputs change.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function MapView({ userPos, stores = [], routeLine = null, className = '' }) {
  const center = [userPos.lat, userPos.lng];

  const storePoints = useMemo(
    () => stores.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)),
    [stores],
  );

  const fitPoints = useMemo(
    () => [center, ...storePoints.map((s) => [s.lat, s.lng])],
    [center[0], center[1], storePoints],
  );

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routeLine?.length > 1 && (
        <Polyline
          positions={routeLine}
          pathOptions={{ color: '#059669', weight: 5, opacity: 0.85, lineCap: 'round' }}
        />
      )}

      <Marker position={center} icon={userIcon} />
      <CircleMarker
        center={center}
        radius={6}
        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0 }}
      />

      {storePoints.map((s, i) => (
        <Marker key={s.storeId} position={[s.lat, s.lng]} icon={storeIcon(i + 1, i === 0)} />
      ))}

      <FitBounds points={fitPoints} />
    </MapContainer>
  );
}
